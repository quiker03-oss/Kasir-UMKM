import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

// Apply auth + SUPER_ADMIN check for all superadmin routes
router.use(authMiddleware, requireRole(['SUPER_ADMIN']));

// List all stores
router.get('/stores', (req: AuthRequest, res: Response) => {
  try {
    const stores = query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM users WHERE store_id = s.id) as user_count,
              (SELECT COUNT(*) FROM products WHERE store_id = s.id) as product_count,
              (SELECT COUNT(*) FROM employees WHERE store_id = s.id) as employee_count,
              (SELECT COUNT(*) FROM orders WHERE store_id = s.id) as order_count,
              (SELECT COUNT(*) FROM transactions WHERE store_id = s.id) as transaction_count,
              (SELECT username FROM users WHERE store_id = s.id AND role = 'ADMIN_TOKO' LIMIT 1) as admin_username,
              (SELECT full_name FROM users WHERE store_id = s.id AND role = 'ADMIN_TOKO' LIMIT 1) as admin_name
       FROM stores s
       ORDER BY s.created_at DESC`
    );

    // Map is_active for frontend convenience if needed
    const enriched = stores.map((s: any) => ({
      ...s,
      is_active: s.status === 'ACTIVE' || s.status === 1 || s.status === '1',
    }));

    res.json({ success: true, stores: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar toko.' });
  }
});

// Create new store and initial Admin Toko user
router.post('/stores', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      subdomain,
      custom_domain,
      status,
      address,
      phone,
      logo_url,
      admin_username,
      admin_password,
      admin_name,
    } = req.body;

    if (!name || !admin_username || !admin_password) {
      res.status(400).json({
        success: false,
        message: 'Nama toko, username admin, dan password admin wajib diisi.',
      });
      return;
    }

    let cleanSlug = (slug || name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    if (!cleanSlug) cleanSlug = `toko-${Date.now()}`;

    // Check slug uniqueness
    const existingStore = queryOne('SELECT id FROM stores WHERE slug = ?', [cleanSlug]);
    if (existingStore) {
      cleanSlug = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Check username uniqueness
    const existingUser = queryOne('SELECT id FROM users WHERE username = ?', [admin_username.trim()]);
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Username admin sudah digunakan. Pilih username lain.' });
      return;
    }

    const storeStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const storeId = `store-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const userId = `user-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(admin_password, 10);

    transaction(() => {
      // 1. Insert store
      run(
        `INSERT INTO stores (id, name, slug, subdomain, custom_domain, status, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          storeId,
          name.trim(),
          cleanSlug,
          subdomain ? subdomain.trim().toLowerCase() : null,
          custom_domain ? custom_domain.trim().toLowerCase() : null,
          storeStatus,
          logo_url || null,
          address || '',
          phone || '',
          phone ? phone.replace(/[^0-9]/g, '') : '',
          `Selamat datang di ${name.trim()}`,
          '08:00 - 22:00',
          `Terima kasih telah berbelanja di ${name.trim()}`,
          now,
          now,
        ]
      );

      // 2. Insert admin toko user
      run(
        `INSERT INTO users (id, store_id, username, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          storeId,
          admin_username.trim(),
          passwordHash,
          'ADMIN_TOKO',
          admin_name ? admin_name.trim() : `Admin ${name.trim()}`,
          1,
          now,
        ]
      );

      // 3. Insert default settings
      run(
        `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`setting-${storeId}`, storeId, 0, 1, 1, 'Rp', now]
      );

      // 4. Insert default tables (Meja 01 - 05)
      for (let i = 1; i <= 5; i++) {
        const tNum = i < 10 ? `0${i}` : `${i}`;
        run(
          `INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [`tbl-${storeId}-${tNum}`, storeId, `Meja ${tNum}`, 4, 'AVAILABLE', 1, now]
        );
      }
    });

    res.json({
      success: true,
      message: 'Toko dan akun Admin Toko berhasil dibuat.',
      store: { id: storeId, name, slug: cleanSlug, status: storeStatus },
    });
  } catch (err: any) {
    console.error('Error creating store:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat toko baru.' });
  }
});

// Update store information and admin credentials
router.put('/stores/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      subdomain,
      custom_domain,
      status,
      address,
      phone,
      logo_url,
      admin_username,
      admin_password,
      admin_name,
    } = req.body;

    const store = queryOne('SELECT * FROM stores WHERE id = ?', [id]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    const cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : store.slug;

    if (cleanSlug !== store.slug) {
      const existing = queryOne('SELECT id FROM stores WHERE slug = ? AND id != ?', [cleanSlug, id]);
      if (existing) {
        res.status(400).json({ success: false, message: 'Slug URL toko sudah digunakan oleh toko lain.' });
        return;
      }
    }

    const now = new Date().toISOString();
    const newStatus = status || store.status || 'ACTIVE';

    transaction(() => {
      run(
        `UPDATE stores
         SET name = ?, slug = ?, subdomain = ?, custom_domain = ?, status = ?, address = ?, phone = ?, logo_url = ?, updated_at = ?
         WHERE id = ?`,
        [
          name ? name.trim() : store.name,
          cleanSlug,
          subdomain !== undefined ? (subdomain ? subdomain.trim().toLowerCase() : null) : store.subdomain,
          custom_domain !== undefined ? (custom_domain ? custom_domain.trim().toLowerCase() : null) : store.custom_domain,
          newStatus,
          address ?? store.address,
          phone ?? store.phone,
          logo_url ?? store.logo_url,
          now,
          id,
        ]
      );

      // If admin username, password, or name needs update
      const adminUser = queryOne("SELECT id, username FROM users WHERE store_id = ? AND role = 'ADMIN_TOKO' LIMIT 1", [id]);
      if (adminUser) {
        if (admin_username && admin_username.trim() !== adminUser.username) {
          const checkUser = queryOne('SELECT id FROM users WHERE username = ? AND id != ?', [admin_username.trim(), adminUser.id]);
          if (checkUser) {
            throw new Error('Username sudah digunakan oleh akun lain.');
          }
          run('UPDATE users SET username = ? WHERE id = ?', [admin_username.trim(), adminUser.id]);
        }

        if (admin_name && admin_name.trim().length > 0) {
          run('UPDATE users SET full_name = ? WHERE id = ?', [admin_name.trim(), adminUser.id]);
        }

        if (admin_password && admin_password.trim().length > 0) {
          const newHash = bcrypt.hashSync(admin_password.trim(), 10);
          run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, adminUser.id]);
        }
      }
    });

    res.json({ success: true, message: 'Data toko dan akun berhasil diperbarui.' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Gagal memperbarui toko.' });
  }
});

// Toggle / update store status (ACTIVE / INACTIVE)
router.patch('/stores/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, is_active } = req.body;

    const store = queryOne('SELECT id, name, status FROM stores WHERE id = ?', [id]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    let newStatus = 'ACTIVE';
    if (status) {
      newStatus = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    } else if (is_active !== undefined) {
      newStatus = is_active ? 'ACTIVE' : 'INACTIVE';
    } else {
      newStatus = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    const now = new Date().toISOString();
    run('UPDATE stores SET status = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

    res.json({
      success: true,
      message: `Status toko "${store.name}" berhasil diubah menjadi ${newStatus === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}.`,
      status: newStatus,
      is_active: newStatus === 'ACTIVE',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengubah status toko.' });
  }
});

// Delete store
router.delete('/stores/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const store = queryOne('SELECT id, name FROM stores WHERE id = ?', [id]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    transaction(() => {
      run('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = ?)', [id]);
      run('DELETE FROM payments WHERE store_id = ?', [id]);
      run('DELETE FROM transactions WHERE store_id = ?', [id]);
      run('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE store_id = ?)', [id]);
      run('DELETE FROM orders WHERE store_id = ?', [id]);
      run('DELETE FROM inventory WHERE store_id = ?', [id]);
      run('DELETE FROM products WHERE store_id = ?', [id]);
      run('DELETE FROM categories WHERE store_id = ?', [id]);
      run('DELETE FROM tables WHERE store_id = ?', [id]);
      run('DELETE FROM attendance WHERE store_id = ?', [id]);
      run('DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payroll WHERE store_id = ?)', [id]);
      run('DELETE FROM payroll WHERE store_id = ?', [id]);
      run('DELETE FROM employees WHERE store_id = ?', [id]);
      run('DELETE FROM expenses WHERE store_id = ?', [id]);
      run('DELETE FROM customers WHERE store_id = ?', [id]);
      run('DELETE FROM settings WHERE store_id = ?', [id]);
      run('DELETE FROM users WHERE store_id = ?', [id]);
      run('DELETE FROM stores WHERE id = ?', [id]);
    });

    res.json({ success: true, message: `Toko "${store.name}" berhasil dihapus.` });
  } catch (err: any) {
    console.error('Delete store error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus toko.' });
  }
});

export default router;
