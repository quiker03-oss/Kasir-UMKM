import { Router, Response } from 'express';
import { query, queryOne, run } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore, requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']));

// List expenses
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, category, type } = req.query;

    let sql = 'SELECT * FROM expenses WHERE store_id = ?';
    const params: any[] = [storeId];

    if (start_date && typeof start_date === 'string') {
      sql += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date && typeof end_date === 'string') {
      sql += ' AND date <= ?';
      params.push(end_date);
    }

    if (category && typeof category === 'string' && category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (type && typeof type === 'string' && type !== 'ALL') {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY date DESC, created_at DESC LIMIT 200';

    const expenses = query(sql, params);
    const sumResult = queryOne(
      `SELECT SUM(amount) as total_expenses,
              SUM(CASE WHEN type = 'MODAL' THEN amount ELSE 0 END) as total_modal,
              SUM(CASE WHEN type = 'BIAYA_OPERASIONAL' THEN amount ELSE 0 END) as total_operasional
       FROM (${sql})`,
      params
    );

    res.json({
      success: true,
      expenses,
      summary: sumResult || { total_expenses: 0, total_modal: 0, total_operasional: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat pengeluaran.' });
  }
});

// Create expense
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { category, type, amount, description, date } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ success: false, message: 'Nominal pengeluaran harus lebih besar dari 0.' });
      return;
    }

    if (!description || description.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Keterangan pengeluaran wajib diisi.' });
      return;
    }

    const validCategories = ['OPERASIONAL', 'BAHAN_BAKU', 'GAJI', 'SEWA', 'UTILITAS', 'LAINNYA'];
    if (!category || !validCategories.includes(category)) {
      res.status(400).json({ success: false, message: 'Kategori pengeluaran tidak valid.' });
      return;
    }

    const id = `exp-${Date.now()}`;
    const now = new Date();
    const nowIso = now.toISOString();
    const expenseDate = date || nowIso.split('T')[0];

    run(
      `INSERT INTO expenses (id, store_id, category, type, amount, description, date, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        storeId,
        category,
        type || 'BIAYA_OPERASIONAL',
        Number(amount),
        description.trim(),
        expenseDate,
        req.user!.full_name,
        nowIso,
      ]
    );

    res.json({ success: true, message: 'Pengeluaran berhasil dicatat.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mencatat pengeluaran.' });
  }
});

// Delete expense
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    run('DELETE FROM expenses WHERE id = ? AND store_id = ?', [id, storeId]);
    res.json({ success: true, message: 'Pengeluaran berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus pengeluaran.' });
  }
});

export default router;
