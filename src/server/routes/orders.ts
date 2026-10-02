import { Router, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Get all orders with items
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { status, date } = req.query;

    let sql = `SELECT * FROM orders WHERE store_id = ?`;
    const params: any[] = [storeId];

    if (status && typeof status === 'string' && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (date && typeof date === 'string') {
      sql += ' AND created_at LIKE ?';
      params.push(`${date}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const orders = query(sql, params);

    // Fetch items for each order
    const enrichedOrders = orders.map((ord: any) => {
      const items = query('SELECT * FROM order_items WHERE order_id = ?', [ord.id]);
      return {
        ...ord,
        items,
      };
    });

    const pendingCount = queryOne(
      "SELECT COUNT(*) as cnt FROM orders WHERE store_id = ? AND status = 'Menunggu'",
      [storeId]
    );

    res.json({
      success: true,
      orders: enrichedOrders,
      pending_count: pendingCount ? pendingCount.cnt : 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar pesanan.' });
  }
});

// Update order status (Menunggu -> Diterima -> Diproses -> Siap -> Selesai / Dibatalkan)
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const validStatuses = ['Menunggu', 'Diterima', 'Diproses', 'Siap', 'Selesai', 'Dibatalkan'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Status pesanan tidak valid.' });
      return;
    }

    const order = queryOne('SELECT * FROM orders WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!order) {
      res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
      return;
    }

    if (order.status === 'Dibatalkan' && status !== 'Dibatalkan') {
      res.status(400).json({
        success: false,
        message: 'Pesanan yang telah dibatalkan tidak dapat diubah kembali demi menjaga keakuratan stok.',
      });
      return;
    }

    const now = new Date().toISOString();

    transaction(() => {
      // If cancelling an order that was not already cancelled, restore stock!
      if (status === 'Dibatalkan' && order.status !== 'Dibatalkan') {
        const items = query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
        for (const it of items) {
          const prod = queryOne('SELECT stock FROM products WHERE id = ?', [it.product_id]);
          if (prod) {
            const restoredStock = prod.stock + it.quantity;
            run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [restoredStock, now, it.product_id]);
            run(
              `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
               VALUES (?, ?, ?, 'IN', ?, ?, ?, ?, ?)`,
              [
                `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                storeId,
                it.product_id,
                it.quantity,
                prod.stock,
                restoredStock,
                `Pembatalan Pesanan #${order.order_number}`,
                now,
              ]
            );
          }
        }
      }

      let updatePayment = payment_status ? payment_status : order.payment_status;
      if (!payment_status && status === 'Selesai') {
        updatePayment = 'PAID';
      } else if (!payment_status && status === 'Dibatalkan') {
        updatePayment = 'CANCELLED';
      }
      run('UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ? AND store_id = ?', [
        status,
        updatePayment,
        now,
        id,
        storeId,
      ]);
    });

    res.json({ success: true, message: `Status pesanan #${order.order_number} diubah menjadi "${status}".` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui status pesanan.' });
  }
});

// Delete order
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const order = queryOne('SELECT * FROM orders WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!order) {
      res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
      return;
    }

    transaction(() => {
      run('DELETE FROM order_items WHERE order_id = ?', [id]);
      run('DELETE FROM orders WHERE id = ? AND store_id = ?', [id, storeId]);
    });

    res.json({ success: true, message: `Pesanan #${order.order_number} berhasil dihapus.` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus pesanan.' });
  }
});

export default router;
