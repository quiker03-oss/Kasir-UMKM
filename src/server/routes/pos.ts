import { Router, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

// In-memory idempotency cache to protect against rapid double clicks / network retries
const idempotencyCache = new Map<string, { timestamp: number; result: any }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > 30000) {
      idempotencyCache.delete(key);
    }
  }
}, 60000);

router.use(authMiddleware, requireStore);

// Get transactions history
router.get('/transactions', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, search, payment_method, limit } = req.query;

    let sql = `
      SELECT t.*, 
             (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as item_count
      FROM transactions t
      WHERE t.store_id = ?
    `;
    const params: any[] = [storeId];

    if (start_date && typeof start_date === 'string') {
      sql += ' AND t.created_at >= ?';
      params.push(`${start_date} 00:00:00`);
    }

    if (end_date && typeof end_date === 'string') {
      sql += ' AND t.created_at <= ?';
      params.push(`${end_date} 23:59:59`);
    }

    if (payment_method && typeof payment_method === 'string') {
      sql += ' AND t.payment_method = ?';
      params.push(payment_method);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      sql += ' AND (t.transaction_number LIKE ? OR t.customer_name LIKE ? OR t.table_name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY t.created_at DESC';

    const maxLimit = Math.min(Number(limit) || 100, 500);
    sql += ` LIMIT ${maxLimit}`;

    const transactions = query(sql, params);
    res.json({ success: true, transactions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat riwayat transaksi.' });
  }
});

// Get single transaction details & receipt data
router.get('/transactions/:id', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const trx = queryOne('SELECT * FROM transactions WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!trx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    const items = query('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
    const store = queryOne('SELECT name, logo_url, address, phone, whatsapp, receipt_footer FROM stores WHERE id = ?', [
      storeId,
    ]);

    res.json({
      success: true,
      transaction: {
        ...trx,
        items,
      },
      store,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat detail transaksi.' });
  }
});

// Process POS Checkout
router.post('/checkout', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const {
      customer_name,
      order_type,
      table_name,
      payment_method,
      amount_paid,
      discount,
      notes,
      items,
      order_id,
      idempotency_key,
    } = req.body;

    // Check idempotency cache to protect against rapid double clicks
    if (idempotency_key && idempotencyCache.has(`${storeId}:${idempotency_key}`)) {
      const cached = idempotencyCache.get(`${storeId}:${idempotency_key}`);
      res.json(cached?.result);
      return;
    }

    // Check if order was already paid
    if (order_id) {
      const existingTrx = queryOne('SELECT id, transaction_number FROM transactions WHERE order_id = ? AND store_id = ?', [
        order_id,
        storeId,
      ]);
      if (existingTrx) {
        res.status(400).json({
          success: false,
          message: `Pesanan ini sudah pernah diselesaikan dengan No. Transaksi ${existingTrx.transaction_number}.`,
        });
        return;
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Keranjang kasir masih kosong.' });
      return;
    }

    if (!payment_method || !['TUNAI', 'TRANSFER', 'QRIS'].includes(payment_method)) {
      res.status(400).json({ success: false, message: 'Metode pembayaran tidak valid.' });
      return;
    }

    // Verify stock and calculate totals
    let subtotal = 0;
    let totalCogs = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const product = queryOne('SELECT id, name, barcode, buy_price, sell_price, stock FROM products WHERE id = ? AND store_id = ?', [
        item.product_id,
        storeId,
      ]);

      if (!product) {
        res.status(400).json({ success: false, message: `Produk "${item.product_name || 'Item'}" tidak ditemukan di database.` });
        return;
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ success: false, message: `Jumlah untuk ${product.name} tidak valid.` });
        return;
      }

      // If this transaction is NOT fulfilling an already-deducted order
      if (!order_id && product.stock < qty) {
        res.status(400).json({
          success: false,
          message: `Stok produk "${product.name}" tidak mencukupi. Sisa stok: ${product.stock}, diminta: ${qty}.`,
        });
        return;
      }

      const itemSubtotal = product.sell_price * qty;
      subtotal += itemSubtotal;
      totalCogs += product.buy_price * qty;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        quantity: qty,
        subtotal: itemSubtotal,
        current_stock: product.stock,
      });
    }

    const discountAmount = Math.max(0, Number(discount) || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const paid = Number(amount_paid);

    if (payment_method === 'TUNAI' && (isNaN(paid) || paid < totalAmount)) {
      res.status(400).json({
        success: false,
        message: `Uang yang diterima (Rp ${paid.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalAmount.toLocaleString('id-ID')}).`,
      });
      return;
    }

    const changeAmount = payment_method === 'TUNAI' ? Math.max(0, paid - totalAmount) : 0;
    const actualPaid = payment_method === 'TUNAI' ? paid : totalAmount;

    const now = new Date();
    const dateCode = now.toISOString().split('T')[0].replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const trxNumber = `TRX-${dateCode}-${randCode}`;
    const trxId = `trx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = now.toISOString();

    const result = transaction(() => {
      // 1. Insert transaction
      run(
        `INSERT INTO transactions (id, store_id, transaction_number, order_id, cashier_id, cashier_name, customer_name, table_name, order_type, subtotal, discount, tax, total_amount, total_cogs, payment_method, amount_paid, change_amount, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trxId,
          storeId,
          trxNumber,
          order_id || null,
          req.user!.id,
          req.user!.full_name,
          customer_name ? customer_name.trim() : 'Pelanggan Umum',
          table_name || null,
          order_type || 'DINE_IN',
          subtotal,
          discountAmount,
          totalAmount,
          totalCogs,
          payment_method,
          actualPaid,
          changeAmount,
          notes || '',
          nowIso,
        ]
      );

      // 2. Insert items & deduct stock (if not already deducted by order)
      for (const item of validatedItems) {
        run(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, barcode, buy_price, sell_price, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `ti-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            trxId,
            item.product_id,
            item.product_name,
            item.barcode,
            item.buy_price,
            item.sell_price,
            item.quantity,
            item.subtotal,
          ]
        );

        if (!order_id) {
          const updatedStock = item.current_stock - item.quantity;
          run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [updatedStock, nowIso, item.product_id]);

          run(
            `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
             VALUES (?, ?, ?, 'SALE', ?, ?, ?, ?, ?)`,
            [
              `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              storeId,
              item.product_id,
              item.quantity,
              item.current_stock,
              updatedStock,
              `Transaksi Kasir #${trxNumber}`,
              nowIso,
            ]
          );
        }
      }

      // 3. Insert payment record
      run(
        `INSERT INTO payments (id, store_id, reference_type, reference_id, payment_method, amount, status, created_at)
         VALUES (?, ?, 'TRANSACTION', ?, ?, ?, 'SUCCESS', ?)`,
        [`pay-${Date.now()}`, storeId, trxId, payment_method, totalAmount, nowIso]
      );

      // 4. If linked to an order, update order status to Selesai and payment to PAID
      if (order_id) {
        run("UPDATE orders SET status = 'Selesai', payment_status = 'PAID', updated_at = ? WHERE id = ? AND store_id = ?", [
          nowIso,
          order_id,
          storeId,
        ]);
      }

      // Fetch store profile for receipt
      const storeInfo = queryOne(
        'SELECT name, logo_url, address, phone, whatsapp, receipt_footer FROM stores WHERE id = ?',
        [storeId]
      );

      return {
        transaction_id: trxId,
        transaction_number: trxNumber,
        cashier_name: req.user!.full_name,
        customer_name: customer_name || 'Pelanggan Umum',
        table_name: table_name || null,
        order_type: order_type || 'DINE_IN',
        subtotal,
        discount: discountAmount,
        total_amount: totalAmount,
        payment_method,
        amount_paid: actualPaid,
        change_amount: changeAmount,
        notes: notes || '',
        created_at: nowIso,
        items: validatedItems,
        store: storeInfo,
      };
    });

    const responsePayload = {
      success: true,
      message: 'Transaksi kasir berhasil disimpan.',
      receipt: result,
    };

    if (idempotency_key) {
      idempotencyCache.set(`${storeId}:${idempotency_key}`, {
        timestamp: Date.now(),
        result: responsePayload,
      });
    }

    res.json(responsePayload);
  } catch (err: any) {
    console.error('POS Checkout error:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal memproses transaksi kasir.' });
  }
});

// Refund / Void transaction (recalculates omzet, laba, restores stock)
router.post('/transactions/:id/refund', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { reason } = req.body;

    const trx = queryOne('SELECT * FROM transactions WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!trx) {
      res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
      return;
    }

    if (trx.status === 'REFUNDED') {
      res.status(400).json({ success: false, message: 'Transaksi ini sudah pernah dibatalkan/direfund sebelumnya.' });
      return;
    }

    const items = query('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
    const nowIso = new Date().toISOString();

    transaction(() => {
      // 1. Mark transaction as REFUNDED
      run("UPDATE transactions SET status = 'REFUNDED', notes = notes || ? WHERE id = ?", [
        ` [DIBATALKAN: ${reason || 'Pengembalian / Refund kasir'}]`,
        trx.id,
      ]);

      // 2. Return items to product stock
      for (const item of items) {
        const prod = queryOne('SELECT id, stock FROM products WHERE id = ? AND store_id = ?', [item.product_id, storeId]);
        if (prod) {
          const newStock = prod.stock + item.quantity;
          run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, nowIso, item.product_id]);

          run(
            `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
             VALUES (?, ?, ?, 'ADJUST', ?, ?, ?, ?, ?)`,
            [
              `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              storeId,
              item.product_id,
              item.quantity,
              prod.stock,
              newStock,
              `Pengembalian Stok Pembatalan #${trx.transaction_number}`,
              nowIso,
            ]
          );
        }
      }
    });

    res.json({
      success: true,
      message: `Transaksi ${trx.transaction_number} berhasil dibatalkan dan stok dikembalikan.`,
    });
  } catch (err: any) {
    console.error('Refund transaction error:', err);
    res.status(500).json({ success: false, message: err.message || 'Gagal membatalkan transaksi.' });
  }
});

export default router;
