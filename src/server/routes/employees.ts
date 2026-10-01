import { Router, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Get employees list
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const employees = query(
      `SELECT e.*, 
              (SELECT COUNT(*) FROM attendance WHERE employee_id = e.id) as total_attendance,
              (SELECT check_in FROM attendance WHERE employee_id = e.id AND date = date('now') LIMIT 1) as today_check_in,
              (SELECT check_out FROM attendance WHERE employee_id = e.id AND date = date('now') LIMIT 1) as today_check_out
       FROM employees e
       WHERE e.store_id = ? AND (e.is_active = 1 OR e.is_active IS NULL)
       ORDER BY e.name ASC`,
      [storeId]
    );

    res.json({ success: true, employees });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat data karyawan.' });
  }
});

// Create employee (Admin Toko)
router.post('/', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    let { name, position, phone, address, hire_date, base_salary, photo_url, barcode_id } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama karyawan wajib diisi.' });
      return;
    }

    if (!position || position.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Jabatan karyawan wajib diisi.' });
      return;
    }

    if (!phone || phone.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nomor HP karyawan wajib diisi.' });
      return;
    }

    // Auto generate unique employee barcode if not provided
    if (!barcode_id || barcode_id.trim().length === 0) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      barcode_id = `EMP-${rand}`;
    } else {
      barcode_id = barcode_id.trim();
    }

    // Check barcode uniqueness
    const existing = queryOne('SELECT id FROM employees WHERE barcode_id = ?', [barcode_id]);
    if (existing) {
      res.status(400).json({ success: false, message: `Barcode ID "${barcode_id}" sudah digunakan oleh karyawan lain.` });
      return;
    }

    const id = `emp-${Date.now()}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    run(
      `INSERT INTO employees (id, store_id, barcode_id, name, position, phone, address, hire_date, base_salary, photo_url, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        id,
        storeId,
        barcode_id,
        name.trim(),
        position.trim(),
        phone.trim(),
        address || '',
        hire_date || today,
        Number(base_salary) || 0,
        photo_url || null,
        now,
      ]
    );

    res.json({
      success: true,
      message: 'Karyawan berhasil didaftarkan.',
      employee: { id, barcode_id, name: name.trim() },
    });
  } catch (err: any) {
    console.error('Error creating employee:', err);
    res.status(500).json({ success: false, message: 'Gagal menambahkan karyawan.' });
  }
});

// Update employee
router.put('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { name, position, phone, address, hire_date, base_salary, photo_url, barcode_id, is_active } = req.body;

    const emp = queryOne('SELECT * FROM employees WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!emp) {
      res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
      return;
    }

    const cleanBarcode = barcode_id ? barcode_id.trim() : emp.barcode_id;
    if (cleanBarcode !== emp.barcode_id) {
      const existing = queryOne('SELECT id FROM employees WHERE barcode_id = ? AND id != ?', [cleanBarcode, id]);
      if (existing) {
        res.status(400).json({ success: false, message: `Barcode ID "${cleanBarcode}" sudah digunakan oleh karyawan lain.` });
        return;
      }
    }

    run(
      `UPDATE employees
       SET name = ?, position = ?, phone = ?, address = ?, hire_date = ?, base_salary = ?, photo_url = ?, barcode_id = ?, is_active = ?
       WHERE id = ? AND store_id = ?`,
      [
        name ? name.trim() : emp.name,
        position ? position.trim() : emp.position,
        phone ? phone.trim() : emp.phone,
        address ?? emp.address,
        hire_date ?? emp.hire_date,
        base_salary !== undefined ? Number(base_salary) : emp.base_salary,
        photo_url ?? emp.photo_url,
        cleanBarcode,
        is_active !== undefined ? (is_active ? 1 : 0) : emp.is_active,
        id,
        storeId,
      ]
    );

    res.json({ success: true, message: 'Data karyawan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui data karyawan.' });
  }
});

// Delete employee
router.delete('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const emp = queryOne('SELECT name FROM employees WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!emp) {
      res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
      return;
    }

    try {
      transaction(() => {
        run('DELETE FROM attendance WHERE employee_id = ? AND store_id = ?', [id, storeId]);
        run('DELETE FROM payroll_items WHERE employee_id = ?', [id]);
        run('DELETE FROM employees WHERE id = ? AND store_id = ?', [id, storeId]);
      });
    } catch {
      run('UPDATE employees SET is_active = 0 WHERE id = ? AND store_id = ?', [id, storeId]);
    }

    res.json({ success: true, message: `Karyawan "${emp.name}" berhasil dihapus.` });
  } catch (err: any) {
    console.error('Delete employee error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus data karyawan.' });
  }
});

export default router;
