import { Router, Response } from 'express';
import { query, queryOne, run } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Get tables
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const tables = query('SELECT * FROM tables WHERE store_id = ? AND (is_active = 1 OR is_active IS NULL) ORDER BY name ASC', [storeId]);
    res.json({ success: true, tables });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar meja.' });
  }
});

// Create table (Admin Toko)
router.post('/', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { name, capacity } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama/nomor meja wajib diisi.' });
      return;
    }

    const existing = queryOne('SELECT id FROM tables WHERE store_id = ? AND name = ?', [storeId, name.trim()]);
    if (existing) {
      res.status(400).json({ success: false, message: `Meja "${name.trim()}" sudah terdaftar.` });
      return;
    }

    const id = `tbl-${Date.now()}`;
    const now = new Date().toISOString();

    run(
      'INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, storeId, name.trim(), Number(capacity) || 4, 'AVAILABLE', 1, now]
    );

    res.json({ success: true, message: 'Meja berhasil ditambahkan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan meja.' });
  }
});

// Update table
router.put('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { name, capacity, status, is_active } = req.body;

    const table = queryOne('SELECT * FROM tables WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!table) {
      res.status(404).json({ success: false, message: 'Meja tidak ditemukan.' });
      return;
    }

    run(
      'UPDATE tables SET name = ?, capacity = ?, status = ?, is_active = ? WHERE id = ? AND store_id = ?',
      [
        name ? name.trim() : table.name,
        capacity !== undefined ? Number(capacity) : table.capacity,
        status || table.status,
        is_active !== undefined ? (is_active ? 1 : 0) : table.is_active,
        id,
        storeId,
      ]
    );

    res.json({ success: true, message: 'Data meja berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui data meja.' });
  }
});

// Delete table
router.delete('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    try {
      run('DELETE FROM tables WHERE id = ? AND store_id = ?', [id, storeId]);
    } catch {
      run('UPDATE tables SET is_active = 0 WHERE id = ? AND store_id = ?', [id, storeId]);
    }

    res.json({ success: true, message: 'Meja berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus meja.' });
  }
});

export default router;
