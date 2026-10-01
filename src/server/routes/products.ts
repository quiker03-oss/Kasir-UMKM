import { Router, Response } from 'express';
import { query, queryOne, run, transaction } from '../db.ts';
import { authMiddleware, requireStore, requireRole, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

// Get all categories for current store
router.get('/categories', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const categories = query(
      `SELECT c.*, (SELECT COUNT(*) FROM products WHERE category_id = c.id AND store_id = c.store_id) as product_count
       FROM categories c
       WHERE c.store_id = ?
       ORDER BY c.name ASC`,
      [storeId]
    );
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat kategori.' });
  }
});

// Create category (Admin Toko)
router.post('/categories', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { name, icon } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama kategori wajib diisi.' });
      return;
    }

    const id = `cat-${Date.now()}`;
    const now = new Date().toISOString();

    run(
      'INSERT INTO categories (id, store_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, storeId, name.trim(), icon || 'Tag', now]
    );

    res.json({ success: true, message: 'Kategori berhasil ditambahkan.', category: { id, name: name.trim(), icon } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menambahkan kategori.' });
  }
});

// Delete category (Admin Toko)
router.delete('/categories/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    // Detach products
    run('UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?', [id, storeId]);
    run('DELETE FROM categories WHERE id = ? AND store_id = ?', [id, storeId]);

    res.json({ success: true, message: 'Kategori berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
});

// Get products (with filters: search, category, low_stock, page)
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { search, category_id, low_stock } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.store_id = ? AND (p.is_active = 1 OR p.is_active IS NULL)
    `;
    const params: any[] = [storeId];

    if (search && typeof search === 'string' && search.trim().length > 0) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category_id && typeof category_id === 'string' && category_id.trim().length > 0) {
      sql += ' AND p.category_id = ?';
      params.push(category_id.trim());
    }

    if (low_stock === 'true' || low_stock === '1') {
      sql += ' AND p.stock <= p.min_stock';
    }

    sql += ' ORDER BY p.name ASC';

    const products = query(sql, params);
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat produk.' });
  }
});

// Lookup product by barcode (fast cashier scan)
router.get('/barcode/:barcode', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { barcode } = req.params;

    const product = queryOne(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = ? AND p.barcode = ? AND p.is_active = 1`,
      [storeId, barcode.trim()]
    );

    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    res.json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mencari barcode.' });
  }
});

// Create product (Admin Toko)
router.post('/', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    let { name, category_id, barcode, buy_price, sell_price, stock, unit, min_stock, image_url } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
      return;
    }

    // Auto generate barcode if empty
    if (!barcode || barcode.trim().length === 0) {
      barcode = `899${Math.floor(1000000 + Math.random() * 9000000)}`;
    } else {
      barcode = barcode.trim();
    }

    // Check barcode uniqueness in this store
    const existing = queryOne('SELECT id FROM products WHERE store_id = ? AND barcode = ?', [storeId, barcode]);
    if (existing) {
      res.status(400).json({ success: false, message: `Barcode "${barcode}" sudah digunakan oleh produk lain di toko ini.` });
      return;
    }

    const id = `prod-${Date.now()}`;
    const now = new Date().toISOString();
    const parsedStock = Number(stock) || 0;
    const parsedBuy = Number(buy_price) || 0;
    const parsedSell = Number(sell_price) || 0;
    const parsedMin = Number(min_stock) || 5;

    transaction(() => {
      run(
        `INSERT INTO products (id, store_id, category_id, name, barcode, buy_price, sell_price, stock, unit, min_stock, image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          id,
          storeId,
          category_id || null,
          name.trim(),
          barcode,
          parsedBuy,
          parsedSell,
          parsedStock,
          unit || 'pcs',
          parsedMin,
          image_url || null,
          now,
          now,
        ]
      );

      // Record initial inventory
      if (parsedStock > 0) {
        run(
          `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
           VALUES (?, ?, ?, 'IN', ?, 0, ?, 'Penambahan produk baru', ?)`,
          [`inv-${Date.now()}`, storeId, id, parsedStock, parsedStock, now]
        );
      }
    });

    res.json({ success: true, message: 'Produk berhasil ditambahkan.', product_id: id });
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Gagal menambahkan produk.' });
  }
});

// Update product (Admin Toko)
router.put('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { name, category_id, barcode, buy_price, sell_price, unit, min_stock, image_url, is_active } = req.body;

    const product = queryOne('SELECT * FROM products WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
      return;
    }

    const cleanBarcode = barcode ? barcode.trim() : product.barcode;
    if (cleanBarcode !== product.barcode) {
      const existing = queryOne('SELECT id FROM products WHERE store_id = ? AND barcode = ? AND id != ?', [
        storeId,
        cleanBarcode,
        id,
      ]);
      if (existing) {
        res.status(400).json({ success: false, message: `Barcode "${cleanBarcode}" sudah digunakan oleh produk lain.` });
        return;
      }
    }

    const now = new Date().toISOString();

    run(
      `UPDATE products
       SET name = ?, category_id = ?, barcode = ?, buy_price = ?, sell_price = ?, unit = ?, min_stock = ?, image_url = ?, is_active = ?, updated_at = ?
       WHERE id = ? AND store_id = ?`,
      [
        name.trim(),
        category_id || null,
        cleanBarcode,
        Number(buy_price) || 0,
        Number(sell_price) || 0,
        unit || 'pcs',
        Number(min_stock) || 0,
        image_url || null,
        is_active !== undefined ? (is_active ? 1 : 0) : product.is_active,
        now,
        id,
        storeId,
      ]
    );

    res.json({ success: true, message: 'Produk berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui produk.' });
  }
});

// Update product image directly (accessible by Kasir & Admin Toko)
router.patch('/:id/image', requireRole(['KASIR', 'ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { image_url } = req.body;

    const product = queryOne('SELECT id, name FROM products WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    const now = new Date().toISOString();
    run('UPDATE products SET image_url = ?, updated_at = ? WHERE id = ? AND store_id = ?', [
      image_url || null,
      now,
      id,
      storeId,
    ]);

    res.json({ success: true, message: `Foto produk "${product.name}" berhasil diperbarui.`, image_url });
  } catch (err: any) {
    console.error('Error updating product image:', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui foto produk.' });
  }
});

// Adjust stock (Admin Toko)
router.post('/:id/stock-adjust', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;
    const { type, quantity, note } = req.body; // type: 'IN' | 'OUT' | 'ADJUST'

    const product = queryOne('SELECT * FROM products WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ success: false, message: 'Jumlah penyesuaian stok harus lebih besar dari 0.' });
      return;
    }

    let newStock = product.stock;
    if (type === 'IN') {
      newStock += qty;
    } else if (type === 'OUT') {
      if (product.stock < qty) {
        res.status(400).json({ success: false, message: `Stok saat ini (${product.stock}) tidak cukup untuk dikurangi ${qty}.` });
        return;
      }
      newStock -= qty;
    } else if (type === 'ADJUST') {
      newStock = qty;
    } else {
      res.status(400).json({ success: false, message: 'Jenis penyesuaian tidak valid (pilih: Masuk, Keluar, atau Koreksi).' });
      return;
    }

    const now = new Date().toISOString();

    transaction(() => {
      run('UPDATE products SET stock = ?, updated_at = ? WHERE id = ? AND store_id = ?', [newStock, now, id, storeId]);

      run(
        `INSERT INTO inventory (id, store_id, product_id, type, quantity, previous_stock, current_stock, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`inv-${Date.now()}`, storeId, id, type, qty, product.stock, newStock, note || 'Penyesuaian stok manual', now]
      );
    });

    res.json({
      success: true,
      message: 'Stok produk berhasil disesuaikan.',
      current_stock: newStock,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal menyesuaikan stok.' });
  }
});

// Delete product (Admin Toko)
router.delete('/:id', requireRole(['ADMIN_TOKO', 'SUPER_ADMIN']), (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { id } = req.params;

    const product = queryOne('SELECT name FROM products WHERE id = ? AND store_id = ?', [id, storeId]);
    if (!product) {
      res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      return;
    }

    try {
      transaction(() => {
        run('DELETE FROM inventory WHERE product_id = ? AND store_id = ?', [id, storeId]);
        run('DELETE FROM products WHERE id = ? AND store_id = ?', [id, storeId]);
      });
    } catch (err: any) {
      // Fallback: If foreign keys prevent hard delete, soft delete
      run('UPDATE products SET is_active = 0 WHERE id = ? AND store_id = ?', [id, storeId]);
    }

    res.json({ success: true, message: `Produk "${product.name}" berhasil dihapus.` });
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus produk.' });
  }
});

export default router;
