import { Router, Response } from 'express';
import { queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Get current store profile and settings
router.get('/profile', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const store = queryOne('SELECT * FROM stores WHERE id = ?', [storeId]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    const settings = queryOne('SELECT * FROM settings WHERE store_id = ?', [storeId]);

    res.json({
      success: true,
      store,
      settings: settings || {
        tax_percentage: 0,
        allow_dine_in: 1,
        allow_takeaway: 1,
        currency_symbol: 'Rp',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil toko.' });
  }
});

// Update store profile (Admin Toko only)
router.put('/profile', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const {
      name,
      logo_url,
      address,
      phone,
      whatsapp,
      description,
      opening_hours,
      receipt_footer,
      tax_percentage,
      allow_dine_in,
      allow_takeaway,
      qris_image_url,
      bank_name,
      bank_account_number,
      bank_account_holder,
    } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama toko wajib diisi.' });
      return;
    }

    const now = new Date().toISOString();

    transaction(() => {
      run(
        `UPDATE stores
         SET name = ?, logo_url = ?, address = ?, phone = ?, whatsapp = ?, description = ?, opening_hours = ?, receipt_footer = ?, updated_at = ?
         WHERE id = ?`,
        [
          name.trim(),
          logo_url || null,
          address || null,
          phone || null,
          whatsapp ? whatsapp.replace(/[^0-9]/g, '') : null,
          description || null,
          opening_hours || null,
          receipt_footer || null,
          now,
          storeId,
        ]
      );

      const existingSettings = queryOne('SELECT id FROM settings WHERE store_id = ?', [storeId]);
      if (existingSettings) {
        run(
          `UPDATE settings
           SET tax_percentage = ?, allow_dine_in = ?, allow_takeaway = ?, qris_image_url = ?, bank_name = ?, bank_account_number = ?, bank_account_holder = ?, updated_at = ?
           WHERE store_id = ?`,
          [
            Number(tax_percentage) || 0,
            allow_dine_in !== undefined ? (allow_dine_in ? 1 : 0) : 1,
            allow_takeaway !== undefined ? (allow_takeaway ? 1 : 0) : 1,
            qris_image_url || null,
            bank_name || null,
            bank_account_number || null,
            bank_account_holder || null,
            now,
            storeId,
          ]
        );
      } else {
        run(
          `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, qris_image_url, bank_name, bank_account_number, bank_account_holder, updated_at)
           VALUES (?, ?, ?, ?, ?, 'Rp', ?, ?, ?, ?, ?)`,
          [
            `setting-${storeId}`,
            storeId,
            Number(tax_percentage) || 0,
            allow_dine_in !== undefined ? (allow_dine_in ? 1 : 0) : 1,
            allow_takeaway !== undefined ? (allow_takeaway ? 1 : 0) : 1,
            qris_image_url || null,
            bank_name || null,
            bank_account_number || null,
            bank_account_holder || null,
            now,
          ]
        );
      }
    });

    res.json({ success: true, message: 'Profil dan pengaturan toko berhasil diperbarui.' });
  } catch (err: any) {
    console.error('Error updating store:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil toko.' });
  }
});

export default router;
