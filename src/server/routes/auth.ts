import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne } from '../db.ts';
import { generateToken, authMiddleware, AuthRequest } from '../auth.ts';

const router = Router();

router.post('/login', async (req, res: Response) => {
  try {
    const credential = (req.body.username || req.body.email || '').trim();
    const { password } = req.body;
    const storeTarget = (req.body.store_id || req.body.store_slug || req.body.store || '').trim();

    if (!credential || !password) {
      res.status(400).json({ success: false, message: 'Username/email toko dan password wajib diisi.' });
      return;
    }

    let user: any = null;

    if (storeTarget) {
      user = queryOne(
        `SELECT u.id, u.store_id, u.username, u.email, u.password_hash, u.role, u.full_name, u.is_active,
                s.name as store_name, s.slug as store_slug, s.status as store_status
         FROM users u
         LEFT JOIN stores s ON u.store_id = s.id
         WHERE (LOWER(u.username) = LOWER(?) OR LOWER(COALESCE(u.email, '')) = LOWER(?))
           AND (u.store_id = ? OR LOWER(s.slug) = LOWER(?) OR LOWER(s.name) = LOWER(?) OR u.role = 'SUPER_ADMIN')`,
        [credential, credential, storeTarget, storeTarget, storeTarget]
      );
    }

    if (!user) {
      user = queryOne(
        `SELECT u.id, u.store_id, u.username, u.email, u.password_hash, u.role, u.full_name, u.is_active,
                s.name as store_name, s.slug as store_slug, s.status as store_status
         FROM users u
         LEFT JOIN stores s ON u.store_id = s.id
         WHERE LOWER(u.username) = LOWER(?) 
            OR LOWER(COALESCE(u.email, '')) = LOWER(?)
            OR (LOWER(s.slug) = LOWER(?) AND u.role IN ('ADMIN_TOKO', 'OWNER', 'ADMIN'))`,
        [credential, credential, credential]
      );
    }

    if (!user) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ success: false, message: 'Akun Anda dinonaktifkan. Hubungi administrator.' });
      return;
    }

    // If store user, verify that their store is not inactive
    if (user.role !== 'SUPER_ADMIN') {
      if (user.store_status === 'INACTIVE') {
        res.status(403).json({
          success: false,
          message: `Toko "${user.store_name || 'Toko'}" sedang dinonaktifkan. Silakan hubungi Super Admin.`,
        });
        return;
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Username atau password salah.' });
      return;
    }

    const token = generateToken({
      id: user.id,
      store_id: user.store_id,
      username: user.username,
      role: user.role,
      full_name: user.full_name,
    });

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        store_id: user.store_id,
        store_name: user.store_name,
        store_slug: user.store_slug,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.full_name,
        full_name: user.full_name,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
  }
});

// Self-registration for new UMKM store owner
router.post('/register', async (req, res: Response) => {
  try {
    const { name, store_name, email, password, phone } = req.body;

    if (!store_name || store_name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama toko wajib diisi.' });
      return;
    }

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama pemilik wajib diisi.' });
      return;
    }

    if (!email || email.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Email wajib diisi.' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanStoreName = store_name.trim();
    const cleanName = name.trim();

    // Check if email already used
    const existingUser = queryOne(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(COALESCE(email, "")) = LOWER(?)',
      [cleanEmail, cleanEmail]
    );

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email/username sudah terdaftar. Silakan gunakan email lain atau login.' });
      return;
    }

    // Generate unique slug
    let baseSlug = cleanStoreName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) baseSlug = 'toko-umkm';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (queryOne('SELECT id FROM stores WHERE slug = ?', [uniqueSlug])) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const storeId = `store-${Date.now()}`;
    const userId = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    // Run database transaction
    const { run: runQuery, transaction: runTransaction } = await import('../db.ts');
    runTransaction(() => {
      // 1. Create Store
      runQuery(
        `INSERT INTO stores (id, name, slug, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'Indonesia', ?, ?, 'Toko & Usaha UMKM', '08:00 - 21:00 WIB', 'Terima kasih atas kunjungan Anda!', ?, ?)`,
        [storeId, cleanStoreName, uniqueSlug, phone || '', phone || '', now, now]
      );

      // 2. Create Store Settings
      runQuery(
        `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, updated_at)
         VALUES (?, ?, 0, 1, 1, 'Rp', ?)`,
        [`set-${storeId}`, storeId, now]
      );

      // 3. Create Store Owner User
      runQuery(
        `INSERT INTO users (id, store_id, username, email, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'ADMIN_TOKO', ?, 1, ?)`,
        [userId, storeId, cleanEmail, cleanEmail, passwordHash, cleanName, now]
      );

      // 4. Create default tables
      for (let i = 1; i <= 4; i++) {
        runQuery(
          `INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at)
           VALUES (?, ?, ?, 4, 'AVAILABLE', 1, ?)`,
          [`tbl-${storeId}-0${i}`, storeId, `Meja 0${i}`, now]
        );
      }
    });

    const token = generateToken({
      id: userId,
      store_id: storeId,
      username: cleanEmail,
      role: 'ADMIN_TOKO',
      full_name: cleanName,
    });

    res.json({
      success: true,
      message: 'Registrasi toko berhasil!',
      token,
      user: {
        id: userId,
        store_id: storeId,
        store_name: cleanStoreName,
        store_slug: uniqueSlug,
        username: cleanEmail,
        email: cleanEmail,
        role: 'ADMIN_TOKO',
        name: cleanName,
        full_name: cleanName,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Gagal melakukan pendaftaran toko baru.' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = queryOne(
      `SELECT u.id, u.store_id, u.username, u.role, u.full_name,
              s.name as store_name, s.slug as store_slug, s.logo_url as store_logo
       FROM users u
       LEFT JOIN stores s ON u.store_id = s.id
       WHERE u.id = ?`,
      [req.user!.id]
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      return;
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil akun.' });
  }
});

export default router;
