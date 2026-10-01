import { Router, Response } from 'express';
import { query, queryOne, run } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Scan employee barcode for attendance (Fast Cashier/Admin scan)
router.post('/scan', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { barcode_id } = req.body;

    if (!barcode_id || barcode_id.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Barcode ID karyawan wajib disertakan.' });
      return;
    }

    const cleanBarcode = barcode_id.trim();

    // Look up employee
    const employee = queryOne(
      'SELECT id, name, position, photo_url, is_active FROM employees WHERE store_id = ? AND barcode_id = ?',
      [storeId, cleanBarcode]
    );

    if (!employee) {
      res.status(404).json({ success: false, message: `Barcode "${cleanBarcode}" tidak terdaftar sebagai karyawan toko ini.` });
      return;
    }

    if (!employee.is_active) {
      res.status(403).json({ success: false, message: `Akun karyawan "${employee.name}" saat ini nonaktif.` });
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeFormatted = now.toTimeString().split(' ')[0]; // "HH:mm:ss"
    const fullDateTime = `${dateStr} ${timeFormatted}`;

    // Check today's attendance record
    const todayRecord = queryOne(
      'SELECT * FROM attendance WHERE store_id = ? AND employee_id = ? AND date = ?',
      [storeId, employee.id, dateStr]
    );

    if (!todayRecord) {
      // 1. Check-In (Absen Masuk)
      // Standard shift starts at 08:30. If checked in after 08:30, set status to TERLAMBAT
      const hour = now.getHours();
      const minute = now.getMinutes();
      const isLate = hour > 8 || (hour === 8 && minute > 30);
      const status = isLate ? 'TERLAMBAT' : 'HADIR';
      const notes = isLate ? `Terlambat (${timeFormatted})` : 'Tepat waktu';

      const attId = `att-${Date.now()}`;
      run(
        `INSERT INTO attendance (id, store_id, employee_id, employee_name, date, check_in, check_out, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [attId, storeId, employee.id, employee.name, dateStr, fullDateTime, status, notes, now.toISOString()]
      );

      res.json({
        success: true,
        type: 'CHECK_IN',
        message: `Absen MASUK berhasil! Selamat bertugas, ${employee.name}.`,
        employee: {
          name: employee.name,
          position: employee.position,
          photo_url: employee.photo_url,
          barcode_id: cleanBarcode,
        },
        time: timeFormatted,
        status,
      });
      return;
    }

    // 2. Already checked in, check for Check-Out (Absen Pulang)
    if (!todayRecord.check_out) {
      // Check cooldown (prevent accidental double scan within 3 minutes)
      const checkInTime = new Date(todayRecord.check_in.replace(' ', 'T')).getTime();
      const diffMinutes = (now.getTime() - checkInTime) / (1000 * 60);

      if (diffMinutes < 3) {
        res.status(400).json({
          success: false,
          message: `${employee.name} sudah absen masuk pada ${todayRecord.check_in.split(' ')[1]}. Tunggu beberapa saat sebelum absen pulang.`,
        });
        return;
      }

      run('UPDATE attendance SET check_out = ? WHERE id = ?', [fullDateTime, todayRecord.id]);

      res.json({
        success: true,
        type: 'CHECK_OUT',
        message: `Absen PULANG berhasil! Terima kasih atas kerja keras Anda, ${employee.name}.`,
        employee: {
          name: employee.name,
          position: employee.position,
          photo_url: employee.photo_url,
          barcode_id: cleanBarcode,
        },
        time: timeFormatted,
        status: todayRecord.status,
      });
      return;
    }

    // 3. Already completed both check-in and check-out today
    res.status(400).json({
      success: false,
      message: `${employee.name} sudah menyelesaikan absensi masuk (${todayRecord.check_in.split(' ')[1]}) dan pulang (${todayRecord.check_out.split(' ')[1]}) hari ini.`,
    });
  } catch (err: any) {
    console.error('Attendance scan error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses absensi barcode.' });
  }
});

// Get attendance history
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, employee_id, status } = req.query;

    let sql = `
      SELECT a.*, e.position, e.photo_url, e.barcode_id
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.store_id = ?
    `;
    const params: any[] = [storeId];

    if (start_date && typeof start_date === 'string') {
      sql += ' AND a.date >= ?';
      params.push(start_date);
    }

    if (end_date && typeof end_date === 'string') {
      sql += ' AND a.date <= ?';
      params.push(end_date);
    }

    if (employee_id && typeof employee_id === 'string') {
      sql += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.date DESC, a.check_in DESC LIMIT 200';

    const records = query(sql, params);

    // Summary today
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySummary = queryOne(
      `SELECT COUNT(*) as total_today,
              SUM(CASE WHEN status = 'HADIR' THEN 1 ELSE 0 END) as hadir_count,
              SUM(CASE WHEN status = 'TERLAMBAT' THEN 1 ELSE 0 END) as terlambat_count
       FROM attendance
       WHERE store_id = ? AND date = ?`,
      [storeId, todayStr]
    );

    res.json({
      success: true,
      records,
      today_summary: todaySummary || { total_today: 0, hadir_count: 0, terlambat_count: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat riwayat absensi.' });
  }
});

export default router;
