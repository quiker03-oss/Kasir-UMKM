import { Router, Request, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';

const router = Router();

// Get all active public stores for platform landing page directory
router.get('/stores', (_req: Request, res: Response) => {
  try {
    const stores = query(
      `SELECT s.id, s.name, s.slug, s.subdomain, s.custom_domain, s.status, s.logo_url, s.address, s.phone, s.whatsapp, s.description,
              (SELECT COUNT(*) FROM products WHERE store_id = s.id AND is_active = 1) as product_count
       FROM stores s
       WHERE s.status = 'ACTIVE' OR s.status IS NULL
       ORDER BY s.created_at ASC`
    );
    res.json({ success: true, stores });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat direktori toko.' });
  }
});

// Get public store catalog by identifier (slug, subdomain, custom_domain, or id)
router.get('/store/:identifier', (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    const cleanId = (identifier || '').trim().toLowerCase();

    const store = queryOne(
      `SELECT id, name, slug, subdomain, custom_domain, status, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer
       FROM stores
       WHERE LOWER(slug) = ? OR LOWER(COALESCE(subdomain, '')) = ? OR LOWER(COALESCE(custom_domain, '')) = ? OR id = ?`,
      [cleanId, cleanId, cleanId, identifier]
    );

    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan. Periksa kembali alamat link atau domain toko.' });
      return;
    }

    const settings = queryOne(
      `SELECT allow_dine_in, allow_takeaway, currency_symbol, qris_image_url, bank_name, bank_account_number, bank_account_holder
       FROM settings WHERE store_id = ?`,
      [store.id]
    );

    if (store.status === 'INACTIVE') {
      res.json({
        success: true,
        is_inactive: true,
        message: 'Toko ini sedang dinonaktifkan dan tidak menerima pesanan saat ini.',
        store: {
          ...store,
          is_active: false,
        },
        settings: settings || {
          allow_dine_in: 0,
          allow_takeaway: 0,
          currency_symbol: 'Rp',
        },
        categories: [],
        products: [],
        tables: [],
      });
      return;
    }

    const categories = query(
      `SELECT id, name, icon FROM categories WHERE store_id = ? ORDER BY name ASC`,
      [store.id]
    );

    const products = query(
      `SELECT p.id, p.category_id, c.name as category_name, p.name, p.barcode, p.sell_price, p.stock, p.unit, p.image_url
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = ? AND p.is_active = 1 AND p.stock > 0
       ORDER BY p.name ASC`,
      [store.id]
    );

    const tables = query(
      `SELECT id, name, capacity, status FROM tables WHERE store_id = ? AND is_active = 1 ORDER BY name ASC`,
      [store.id]
    );

    res.json({
      success: true,
      is_inactive: false,
      store: {
        ...store,
        is_active: true,
      },
      settings: settings || {
        allow_dine_in: 1,
        allow_takeaway: 1,
        currency_symbol: 'Rp',
      },
      categories,
      products,
      tables,
    });
  } catch (err: any) {
    console.error('Error fetching public store:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat katalog toko.' });
  }
});

// Customer places an order online (No login required)
router.post('/orders', (req: Request, res: Response) => {
  try {
    const {
      store_id,
      customer_name,
      customer_phone,
      order_type,
      table_name,
      payment_method,
      notes,
      items,
    } = req.body;

    if (!store_id) {
      res.status(400).json({ success: false, message: 'ID Toko tidak valid.' });
      return;
    }

    if (!customer_name || customer_name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama pemesan wajib diisi.' });
      return;
    }

    if (!customer_phone || customer_phone.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nomor WhatsApp / HP wajib diisi.' });
      return;
    }

    if (!order_type || (order_type !== 'DINE_IN' && order_type !== 'TAKEAWAY' && order_type !== 'DELIVERY')) {
      res.status(400).json({ success: false, message: 'Pilih jenis pesanan: Makan di Tempat, Bawa Pulang, atau Pengiriman (Delivery).' });
      return;
    }

    if (order_type === 'DINE_IN' && !table_name) {
      res.status(400).json({ success: false, message: 'Silakan pilih nomor meja untuk makan di tempat.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Keranjang belanja masih kosong.' });
      return;
    }

    // Verify store exists and is ACTIVE
    const store = queryOne('SELECT id, name, status FROM stores WHERE id = ?', [store_id]);
    if (!store) {
      res.status(404).json({ success: false, message: 'Toko tidak ditemukan.' });
      return;
    }

    if (store.status === 'INACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Toko sedang dinonaktifkan dan tidak menerima pesanan saat ini.',
      });
      return;
    }

    // Verify stock and prepare items
    const verifiedItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = queryOne(
        'SELECT id, name, buy_price, sell_price, stock FROM products WHERE id = ? AND store_id = ? AND is_active = 1',
        [item.product_id, store_id]
      );

      if (!product) {
        res.status(400).json({ success: false, message: `Produk "${item.product_name || 'Item'}" tidak ditemukan atau sudah tidak aktif.` });
        return;
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ success: false, message: `Jumlah pesanan untuk ${product.name} tidak valid.` });
        return;
      }

      if (product.stock < qty) {
        res.status(400).json({
          success: false,
          message: `Stok untuk "${product.name}" tidak mencukupi. Tersedia: ${product.stock}, diminta: ${qty}.`,
        });
        return;
      }

      const itemSubtotal = product.sell_price * qty;
      subtotal += itemSubtotal;

      verifiedItems.push({
        product_id: product.id,
        product_name: product.name,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        quantity: qty,
        subtotal: itemSubtotal,
        note: item.note || '',
        current_stock: product.stock,
      });
    }

    const totalAmount = subtotal;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randCode}`;
    const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = now.toISOString();

    const orderResult = transaction(() => {
      // 1. Create or update customer record
      let customer = queryOne('SELECT id, total_orders, total_spend FROM customers WHERE store_id = ? AND phone = ?', [
        store_id,
        customer_phone.trim(),
      ]);

      let customerId = customer ? customer.id : null;

      if (customer) {
        run(
          'UPDATE customers SET name = ?, total_orders = total_orders + 1, total_spend = total_spend + ? WHERE id = ?',
          [customer_name.trim(), totalAmount, customer.id]
        );
      } else {
        customerId = `cust-${Date.now()}`;
        run(
          'INSERT INTO customers (id, store_id, name, phone, total_orders, total_spend, created_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
          [customerId, store_id, customer_name.trim(), customer_phone.trim(), totalAmount, nowIso]
        );
      }

      // 2. Insert order
      run(
        `INSERT INTO orders (id, store_id, order_number, customer_id, customer_name, customer_phone, order_type, table_name, status, payment_method, payment_status, notes, subtotal, discount, total_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          store_id,
          orderNumber,
          customerId,
          customer_name.trim(),
          customer_phone.trim(),
          order_type,
          order_type === 'DINE_IN' ? table_name : null,
          'Menunggu',
          payment_method || 'TUNAI',
          'PENDING',
          notes || '',
          subtotal,
          0,
          totalAmount,
          nowIso,
          nowIso,
        ]
      );

      // 3. Insert order items & reduce stock
      for (const item of verifiedItems) {
        const orderItemId = `oi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        run(
          `INSERT INTO order_items (id, order_id, product_id, product_name, buy_price, price, quantity, subtotal, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderItemId,
            orderId,
            item.product_id,
            item.product_name,
            item.buy_price,
            item.sell_price,
            item.quantity,
            item.subtotal,
            item.note,
          ]
        );

        // Update product stock
        const newStock = item.current_stock - item.quantity;
        run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?', [newStock, nowIso, item.product_id]);

        // Log to inventory
        run(
          `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
           VALUES (?, ?, ?, 'ORDER', ?, ?, ?, ?, ?)`,
          [
            `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            store_id,
            item.product_id,
            item.quantity,
            item.current_stock,
            newStock,
            `Pesanan Online #${orderNumber}`,
            nowIso,
          ]
        );
      }

      return {
        id: orderId,
        order_number: orderNumber,
        total_amount: totalAmount,
      };
    });

    res.json({
      success: true,
      message: 'Pesanan Anda berhasil dikirim ke kasir toko!',
      order: orderResult,
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Gagal memproses pesanan. Silakan coba beberapa saat lagi.' });
  }
});

// Track customer order status by order number
router.get('/orders/track/:orderNumber', (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = queryOne(
      `SELECT o.*, s.name as store_name, s.phone as store_phone, s.whatsapp as store_whatsapp, s.address as store_address
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.order_number = ?`,
      [orderNumber]
    );

    if (!order) {
      res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan dengan nomor tersebut.' });
      return;
    }

    const items = query(
      `SELECT id, product_name, price, quantity, subtotal, note FROM order_items WHERE order_id = ?`,
      [order.id]
    );

    res.json({
      success: true,
      order: {
        ...order,
        items,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal melacak pesanan.' });
  }
});

export default router;
