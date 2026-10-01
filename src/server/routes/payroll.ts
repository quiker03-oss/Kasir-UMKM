import { Router, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore, requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']));

// List all payroll periods
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const payrolls = query(
      `SELECT p.*, (SELECT COUNT(*) FROM payroll_items WHERE payroll_id = p.id) as employee_count
       FROM payroll p
       WHERE p.store_id = ?
       ORDER BY p.period_year DESC, p.period_month DESC`,
      [storeId]
    );

    res.json({ success: true, payrolls });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar penggajian.' });
  }
});

// Get latest slip for a specific employee (used from EmployeesView or Payroll)
router.get('/employee/:employeeId/slip', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { employeeId } = req.params;

    const employee = queryOne('SELECT * FROM employees WHERE id = ? AND store_id = ?', [employeeId, storeId]);
    if (!employee) {
      res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
      return;
    }

    const store = queryOne('SELECT name, logo_url, address, phone FROM stores WHERE id = ?', [storeId]);

    // Check if there is an existing payroll_item for this employee
    const latestItem = queryOne(
      `SELECT pi.*, p.payroll_number, p.period_month, p.period_year, p.paid_at, p.status as payroll_status
       FROM payroll_items pi
       JOIN payroll p ON pi.payroll_id = p.id
       WHERE pi.employee_id = ? AND p.store_id = ?
       ORDER BY p.period_year DESC, p.period_month DESC
       LIMIT 1`,
      [employeeId, storeId]
    );

    if (latestItem) {
      res.json({
        success: true,
        slip: {
          payroll_number: latestItem.payroll_number,
          period_month: latestItem.period_month,
          period_year: latestItem.period_year,
          paid_at: latestItem.paid_at,
          employee_id: employee.id,
          employee_name: employee.name,
          position: employee.position,
          barcode_id: employee.barcode_id,
          attendance_count: latestItem.attendance_count,
          base_salary: latestItem.base_salary,
          bonus: latestItem.bonus,
          overtime: latestItem.overtime,
          deductions: latestItem.deductions,
          net_salary: latestItem.net_salary,
          notes: latestItem.notes,
          store,
        },
      });
      return;
    }

    // If no payroll period yet, compute dynamically for current month based on attendance
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const monthStr = curMonth < 10 ? `0${curMonth}` : `${curMonth}`;
    const datePrefix = `${curYear}-${monthStr}`;

    const attRes = queryOne(
      `SELECT COUNT(*) as count FROM attendance WHERE store_id = ? AND employee_id = ? AND date LIKE ?`,
      [storeId, employeeId, `${datePrefix}%`]
    );
    const attendanceCount = attRes ? attRes.count : 0;
    const baseSalary = Number(employee.base_salary) || 0;

    res.json({
      success: true,
      slip: {
        payroll_number: `SLIP-${curYear}${monthStr}-${Math.floor(100 + Math.random() * 900)}`,
        period_month: curMonth,
        period_year: curYear,
        paid_at: now.toISOString(),
        employee_id: employee.id,
        employee_name: employee.name,
        position: employee.position,
        barcode_id: employee.barcode_id,
        attendance_count: attendanceCount,
        base_salary: baseSalary,
        bonus: 0,
        overtime: 0,
        deductions: 0,
        net_salary: baseSalary,
        notes: 'Slip gaji periode berjalan (Estimasi)',
        store,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat slip gaji karyawan.' });
  }
});

// Get single payroll with item details
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const payroll = queryOne('SELECT * FROM payroll WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!payroll) {
      res.status(404).json({ success: false, message: 'Data penggajian tidak ditemukan.' });
      return;
    }

    const items = query('SELECT * FROM payroll_items WHERE payroll_id = ?', [id]);
    const store = queryOne('SELECT name, logo_url, address, phone FROM stores WHERE id = ?', [storeId]);

    res.json({
      success: true,
      payroll: {
        ...payroll,
        items,
      },
      store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat rincian penggajian.' });
  }
});

// Get all slips for a payroll period formatted for bulk printing
router.get('/:id/all-slips', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const payroll = queryOne('SELECT * FROM payroll WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!payroll) {
      res.status(404).json({ success: false, message: 'Data penggajian tidak ditemukan.' });
      return;
    }

    const items = query(
      `SELECT pi.*, e.barcode_id 
       FROM payroll_items pi 
       LEFT JOIN employees e ON pi.employee_id = e.id 
       WHERE pi.payroll_id = ?`,
      [id]
    );
    const store = queryOne('SELECT name, logo_url, address, phone FROM stores WHERE id = ?', [storeId]);

    const slips = items.map((it: any) => ({
      payroll_number: payroll.payroll_number,
      period_month: payroll.period_month,
      period_year: payroll.period_year,
      paid_at: payroll.paid_at,
      employee_id: it.employee_id,
      employee_name: it.employee_name,
      position: it.position,
      barcode_id: it.barcode_id,
      attendance_count: it.attendance_count,
      base_salary: it.base_salary,
      bonus: it.bonus,
      overtime: it.overtime,
      deductions: it.deductions,
      net_salary: it.net_salary,
      notes: it.notes,
      store,
    }));

    res.json({
      success: true,
      payroll,
      slips,
      store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat semua slip gaji.' });
  }
});

// Create new payroll for a period
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { period_month, period_year, items } = req.body;

    const month = Number(period_month);
    const year = Number(period_year);

    if (!month || month < 1 || month > 12 || !year || year < 2020) {
      res.status(400).json({ success: false, message: 'Bulan dan tahun periode penggajian tidak valid.' });
      return;
    }

    // Check if payroll for this period already exists
    const existing = queryOne('SELECT id FROM payroll WHERE store_id = ? AND period_month = ? AND period_year = ?', [
      storeId,
      month,
      year,
    ]);

    if (existing) {
      res.status(400).json({
        success: false,
        message: `Daftar gaji untuk periode ${month}/${year} sudah pernah dibuat. Silakan edit periode tersebut.`,
      });
      return;
    }

    // If items not provided, auto generate from active employees & attendance
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const datePrefix = `${year}-${monthStr}`;

    const activeEmployees = query('SELECT id, name, position, base_salary FROM employees WHERE store_id = ? AND is_active = 1', [
      storeId,
    ]);

    if (activeEmployees.length === 0) {
      res.status(400).json({ success: false, message: 'Belum ada karyawan aktif di toko ini.' });
      return;
    }

    const payrollId = `pay-${Date.now()}`;
    const payrollNumber = `PAY-${year}${monthStr}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();

    const payrollItemsData = (items && Array.isArray(items) && items.length > 0)
      ? items
      : activeEmployees.map((emp: any) => {
          // Count attendance in that month
          const attCountRes = queryOne(
            `SELECT COUNT(*) as count FROM attendance WHERE store_id = ? AND employee_id = ? AND date LIKE ?`,
            [storeId, emp.id, `${datePrefix}%`]
          );
          const attCount = attCountRes ? attCountRes.count : 0;
          const baseSalary = Number(emp.base_salary) || 0;
          return {
            employee_id: emp.id,
            employee_name: emp.name,
            position: emp.position,
            attendance_count: attCount,
            base_salary: baseSalary,
            bonus: 0,
            overtime: 0,
            deductions: 0,
            net_salary: baseSalary,
            notes: '',
          };
        });

    let totalPayout = 0;
    for (const it of payrollItemsData) {
      const net = (Number(it.base_salary) || 0) + (Number(it.bonus) || 0) + (Number(it.overtime) || 0) - (Number(it.deductions) || 0);
      it.net_salary = Math.max(0, net);
      totalPayout += it.net_salary;
    }

    transaction(() => {
      run(
        `INSERT INTO payroll (id, store_id, payroll_number, period_month, period_year, status, total_payout, created_at)
         VALUES (?, ?, ?, ?, ?, 'Draft', ?, ?)`,
        [payrollId, storeId, payrollNumber, month, year, totalPayout, nowIso]
      );

      for (const it of payrollItemsData) {
        run(
          `INSERT INTO payroll_items (id, payroll_id, employee_id, employee_name, position, attendance_count, base_salary, bonus, overtime, deductions, net_salary, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `pi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            payrollId,
            it.employee_id,
            it.employee_name,
            it.position,
            it.attendance_count,
            it.base_salary,
            it.bonus,
            it.overtime,
            it.deductions,
            it.net_salary,
            it.notes || '',
          ]
        );
      }
    });

    res.json({
      success: true,
      message: 'Draft penggajian berhasil dibuat.',
      payroll_id: payrollId,
    });
  } catch (err: any) {
    console.error('Payroll creation error:', err);
    res.status(500).json({ success: false, message: 'Gagal membuat daftar penggajian.' });
  }
});

// Update payroll status (Draft -> Diproses -> Dibayar)
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Draft', 'Diproses', 'Dibayar'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Status penggajian tidak valid.' });
      return;
    }

    const payroll = queryOne('SELECT * FROM payroll WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!payroll) {
      res.status(404).json({ success: false, message: 'Penggajian tidak ditemukan.' });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateStr = nowIso.split('T')[0];

    transaction(() => {
      let paidAt = payroll.paid_at;
      if (status === 'Dibayar' && !payroll.paid_at) {
        paidAt = nowIso;
        // Automatically record this payroll into expenses
        const expId = `exp-payroll-${payroll.id}`;
        const existingExp = queryOne('SELECT id FROM expenses WHERE id = ?', [expId]);
        if (!existingExp) {
          run(
            `INSERT INTO expenses (id, store_id, category, type, amount, description, date, created_by, created_at)
             VALUES (?, ?, 'GAJI', 'BIAYA_OPERASIONAL', ?, ?, ?, ?, ?)`,
            [
              expId,
              storeId,
              payroll.total_payout,
              `Pembayaran Penggajian Karyawan Periode ${payroll.period_month}/${payroll.period_year} (#${payroll.payroll_number})`,
              dateStr,
              req.user!.full_name,
              nowIso,
            ]
          );
        }
      }

      run('UPDATE payroll SET status = ?, paid_at = ? WHERE id = ?', [status, paidAt, id]);
    });

    res.json({ success: true, message: `Status penggajian berhasil diubah ke "${status}".` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status penggajian.' });
  }
});

// Update payroll item (Bonus, overtime, deductions)
router.put('/items/:itemId', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { itemId } = req.params;
    const { bonus, overtime, deductions, notes } = req.body;

    const item = queryOne(
      `SELECT pi.*, p.store_id, p.status as payroll_status
       FROM payroll_items pi
       JOIN payroll p ON pi.payroll_id = p.id
       WHERE pi.id = ? AND p.store_id = ?`,
      [itemId, storeId]
    );

    if (!item) {
      res.status(404).json({ success: false, message: 'Item gaji tidak ditemukan.' });
      return;
    }

    if (item.payroll_status === 'Dibayar') {
      res.status(400).json({ success: false, message: 'Penggajian yang sudah dibayar tidak dapat diubah.' });
      return;
    }

    const b = Math.max(0, Number(bonus) || 0);
    const ot = Math.max(0, Number(overtime) || 0);
    const d = Math.max(0, Number(deductions) || 0);
    const net = Math.max(0, item.base_salary + b + ot - d);

    transaction(() => {
      run(
        `UPDATE payroll_items
         SET bonus = ?, overtime = ?, deductions = ?, net_salary = ?, notes = ?
         WHERE id = ?`,
        [b, ot, d, net, notes || '', itemId]
      );

      // Recalculate total payroll payout
      const sumRes = queryOne('SELECT SUM(net_salary) as total FROM payroll_items WHERE payroll_id = ?', [item.payroll_id]);
      const newTotal = sumRes ? sumRes.total : 0;
      run('UPDATE payroll SET total_payout = ? WHERE id = ?', [newTotal, item.payroll_id]);
    });

    res.json({ success: true, message: 'Rincian slip gaji berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui rincian gaji.' });
  }
});

// Delete payroll record (Admin Toko)
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const payroll = queryOne('SELECT payroll_number FROM payroll WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!payroll) {
      res.status(404).json({ success: false, message: 'Data penggajian tidak ditemukan.' });
      return;
    }

    transaction(() => {
      run('DELETE FROM payroll_items WHERE payroll_id = ?', [id]);
      run('DELETE FROM expenses WHERE description LIKE ? AND store_id = ?', [`%#${payroll.payroll_number}%`, storeId]);
      run('DELETE FROM payroll WHERE id = ? AND store_id = ?', [id, storeId]);
    });

    res.json({ success: true, message: `Data penggajian #${payroll.payroll_number} berhasil dihapus.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus data penggajian.' });
  }
});

export default router;
