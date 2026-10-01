import bcrypt from 'bcryptjs';
import { queryOne, run } from './db.ts';

export async function seedDatabase(): Promise<void> {
  const superAdminPasswordHash = await bcrypt.hash('password123', 10);
  const commonPasswordHash = await bcrypt.hash('password123', 10);

  const now = new Date().toISOString();
  const dateStr = now.split('T')[0];

  // 1. Super Admin Account
  const superAdmin = queryOne('SELECT id FROM users WHERE role = ?', ['SUPER_ADMIN']);
  if (!superAdmin) {
    run(
      `INSERT INTO users (id, store_id, username, email, password_hash, role, full_name, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['user-superadmin', null, 'superadmin', 'superadmin@kasirumkm.com', superAdminPasswordHash, 'SUPER_ADMIN', 'Super Administrator', 1, now]
    );
  } else {
    run('UPDATE users SET email = ?, password_hash = ? WHERE username = ? OR role = ?', [
      'superadmin@kasirumkm.com',
      superAdminPasswordHash,
      'superadmin',
      'SUPER_ADMIN',
    ]);
  }

  // ==========================================
  // TOKO A: Warung Kopi & Kuliner Nusantara
  // ==========================================
  const storeAId = 'store-nusantara-01';
  let storeA = queryOne('SELECT id FROM stores WHERE id = ?', [storeAId]);
  if (!storeA) {
    run(
      `INSERT INTO stores (id, name, slug, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storeAId,
        'Toko A - Warung Kopi Nusantara',
        'kopi-nusantara',
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150&auto=format&fit=crop&q=80',
        'Jl. Malioboro No. 45, Kota Yogyakarta',
        '0812-3456-7890',
        '6281234567890',
        'Warung Kopi & Kuliner Nusantara menyajikan racikan kopi istimewa dan masakan tradisional berkualitas.',
        '08:00 - 22:00 WIB',
        'Terima kasih atas kunjungan Anda di Toko A (Kopi Nusantara)!\nFollow IG: @kopinusantara.id',
        now,
        now,
      ]
    );
  }

  // Users Toko A
  const usersTokoA = [
    { id: 'user-kopi-admin', username: 'kopi_admin', email: 'admin@toko-a.com', role: 'ADMIN_TOKO', name: 'Bambang Wijaya (Admin Toko A)' },
    { id: 'user-kopi-kasir', username: 'kopi_kasir', email: 'kasir@toko-a.com', role: 'KASIR', name: 'Rina Melati (Kasir Toko A)' },
    { id: 'user-tokoa-admin', username: 'admin_tokoa', email: 'admin_tokoa@umkm.id', role: 'ADMIN_TOKO', name: 'Admin Toko A' },
    { id: 'user-tokoa-kasir', username: 'kasir_tokoa', email: 'kasir_tokoa@umkm.id', role: 'KASIR', name: 'Kasir Toko A' },
  ];
  for (const u of usersTokoA) {
    const ex = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
    if (!ex) {
      run(
        `INSERT INTO users (id, store_id, username, email, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, storeAId, u.username, u.email, commonPasswordHash, u.role, u.name, 1, now]
      );
    } else {
      run('UPDATE users SET store_id = ?, password_hash = ? WHERE username = ?', [storeAId, commonPasswordHash, u.username]);
    }
  }

  // Settings Toko A
  if (!queryOne('SELECT id FROM settings WHERE store_id = ?', [storeAId])) {
    run(
      `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, qris_image_url, bank_name, bank_account_number, bank_account_holder, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['setting-toko-a', storeAId, 0, 1, 1, 'Rp', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=QRIS_TOKO_A', 'BCA', '1234567890', 'Toko A Kopi Nusantara', now]
    );
  }

  // Categories Toko A
  const catA = [
    { id: 'cat-a1', name: 'Kopi & Minuman', icon: 'Coffee' },
    { id: 'cat-a2', name: 'Makanan Utama', icon: 'Utensils' },
    { id: 'cat-a3', name: 'Snack & Camilan', icon: 'Cookie' },
  ];
  for (const c of catA) {
    if (!queryOne('SELECT id FROM categories WHERE id = ?', [c.id])) {
      run('INSERT INTO categories (id, store_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)', [c.id, storeAId, c.name, c.icon, now]);
    }
  }

  // Tables Toko A
  for (let i = 1; i <= 6; i++) {
    const tNum = i < 10 ? `0${i}` : `${i}`;
    const tId = `tbl-a-${tNum}`;
    if (!queryOne('SELECT id FROM tables WHERE id = ?', [tId])) {
      run('INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        tId,
        storeAId,
        `Meja ${tNum}`,
        4,
        'AVAILABLE',
        1,
        now,
      ]);
    }
  }

  // Products Toko A
  const prodsA = [
    { id: 'prod-01', cat: 'cat-a1', name: 'Kopi Susu Gula Aren', code: '8991001001', buy: 6000, sell: 15000, stock: 48, unit: 'cup', img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-02', cat: 'cat-a1', name: 'Americano Dingin (Iced Americano)', code: '8991001002', buy: 4000, sell: 12000, stock: 65, unit: 'cup', img: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-03', cat: 'cat-a1', name: 'Matcha Espresso Fusion', code: '8991001003', buy: 8500, sell: 20000, stock: 32, unit: 'cup', img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-04', cat: 'cat-a2', name: 'Nasi Goreng Spesial Telur Mata Sapi', code: '8991001004', buy: 12000, sell: 25000, stock: 30, unit: 'porsi', img: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-05', cat: 'cat-a2', name: 'Ayam Geprek Sambal Bawang', code: '8991001005', buy: 11000, sell: 23000, stock: 24, unit: 'porsi', img: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-06', cat: 'cat-a2', name: 'Mie Goreng Jawa Spesial', code: '8991001006', buy: 9000, sell: 20000, stock: 28, unit: 'porsi', img: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-09', cat: 'cat-a3', name: 'Kentang Goreng Seasoned Crispy', code: '8991001009', buy: 6000, sell: 15000, stock: 22, unit: 'porsi', img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-10', cat: 'cat-a1', name: 'Es Teh Manis Melati Jumbo', code: '8991001010', buy: 1500, sell: 5000, stock: 119, unit: 'cup', img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80' },
  ];
  for (const p of prodsA) {
    if (!queryOne('SELECT id FROM products WHERE id = ?', [p.id])) {
      run(
        `INSERT INTO products (id, store_id, category_id, name, barcode, buy_price, sell_price, stock, unit, min_stock, image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [p.id, storeAId, p.cat, p.name, p.code, p.buy, p.sell, p.stock, p.unit, 5, p.img, now, now]
      );
    } else {
      run('UPDATE products SET store_id = ?, image_url = COALESCE(image_url, ?) WHERE id = ?', [storeAId, p.img, p.id]);
    }
  }

  // ==========================================
  // TOKO B: Bakery & Pastry Delight
  // ==========================================
  const storeBId = 'store-toko-b';
  let storeB = queryOne('SELECT id FROM stores WHERE id = ?', [storeBId]);
  if (!storeB) {
    run(
      `INSERT INTO stores (id, name, slug, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storeBId,
        'Toko B - Bakery & Pastry Delight',
        'toko-b',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop&q=80',
        'Jl. Palagan Tentara Pelajar No. 88, Yogyakarta',
        '0813-1122-3344',
        '6281311223344',
        'Spesialis Roti Artisan, Croissant Almond, Pastry Prancis, dan Slice Cake Segar setiap hari.',
        '07:00 - 21:00 WIB',
        'Terima kasih telah berbelanja di Toko B Bakery Delight!\nSimpan struk ini untuk promo loyalty.',
        now,
        now,
      ]
    );
  }

  // Users Toko B
  const usersTokoB = [
    { id: 'user-tokob-admin', username: 'admin_tokob', email: 'admin@toko-b.com', role: 'ADMIN_TOKO', name: 'Dewi Lestari (Admin Toko B)' },
    { id: 'user-tokob-kasir', username: 'kasir_tokob', email: 'kasir@toko-b.com', role: 'KASIR', name: 'Fani Anggita (Kasir Toko B)' },
  ];
  for (const u of usersTokoB) {
    const ex = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
    if (!ex) {
      run(
        `INSERT INTO users (id, store_id, username, email, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, storeBId, u.username, u.email, commonPasswordHash, u.role, u.name, 1, now]
      );
    }
  }

  // Settings Toko B
  if (!queryOne('SELECT id FROM settings WHERE store_id = ?', [storeBId])) {
    run(
      `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, qris_image_url, bank_name, bank_account_number, bank_account_holder, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['setting-toko-b', storeBId, 0, 1, 1, 'Rp', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=QRIS_TOKO_B', 'BCA', '9876543210', 'Toko B Bakery Delight', now]
    );
  }

  // Categories Toko B
  const catB = [
    { id: 'cat-b1', name: 'Croissant & Pastry', icon: 'Cookie' },
    { id: 'cat-b2', name: 'Roti Manis & Sobek', icon: 'Package' },
    { id: 'cat-b3', name: 'Cake & Tart Slice', icon: 'Sparkles' },
    { id: 'cat-b4', name: 'Minuman Hangat & Dingin', icon: 'Coffee' },
  ];
  for (const c of catB) {
    if (!queryOne('SELECT id FROM categories WHERE id = ?', [c.id])) {
      run('INSERT INTO categories (id, store_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)', [c.id, storeBId, c.name, c.icon, now]);
    }
  }

  // Tables Toko B
  for (let i = 1; i <= 4; i++) {
    const tNum = i < 10 ? `0${i}` : `${i}`;
    const tId = `tbl-b-${tNum}`;
    if (!queryOne('SELECT id FROM tables WHERE id = ?', [tId])) {
      run('INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        tId,
        storeBId,
        `Meja Bakery ${tNum}`,
        4,
        'AVAILABLE',
        1,
        now,
      ]);
    }
  }

  // Products Toko B
  const prodsB = [
    { id: 'prod-b01', cat: 'cat-b1', name: 'Butter Croissant Almond Flakes', code: '8992001001', buy: 9000, sell: 24000, stock: 35, unit: 'pcs', img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-b02', cat: 'cat-b2', name: 'Roti Sobek Cokelat Lumer Keju', code: '8992001002', buy: 8000, sell: 18000, stock: 40, unit: 'pack', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-b03', cat: 'cat-b1', name: 'Blueberry Danish Creamy Cheese', code: '8992001003', buy: 10000, sell: 26000, stock: 25, unit: 'pcs', img: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-b04', cat: 'cat-b3', name: 'New York Cheesecake Strawberry Slice', code: '8992001004', buy: 14000, sell: 32000, stock: 18, unit: 'slice', img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-b05', cat: 'cat-b1', name: 'Cinnamon Roll Glaze Vanilla', code: '8992001005', buy: 7500, sell: 20000, stock: 30, unit: 'pcs', img: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-b06', cat: 'cat-b4', name: 'Hot Cafe Latte Double Shot', code: '8992001006', buy: 6000, sell: 18000, stock: 50, unit: 'cup', img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80' },
  ];
  for (const p of prodsB) {
    if (!queryOne('SELECT id FROM products WHERE id = ?', [p.id])) {
      run(
        `INSERT INTO products (id, store_id, category_id, name, barcode, buy_price, sell_price, stock, unit, min_stock, image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [p.id, storeBId, p.cat, p.name, p.code, p.buy, p.sell, p.stock, p.unit, 5, p.img, now, now]
      );
    }
  }

  // Transactions Toko B
  const trxBId = 'trx-b-seed-01';
  if (!queryOne('SELECT id FROM transactions WHERE id = ?', [trxBId])) {
    run(
      `INSERT INTO transactions (id, store_id, transaction_number, order_id, cashier_id, cashier_name, customer_name, table_name, order_type, subtotal, discount, tax, total_amount, total_cogs, payment_method, amount_paid, change_amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trxBId,
        storeBId,
        'TRX-B-20260929-001',
        null,
        'user-tokob-kasir',
        'Fani Anggita (Kasir Toko B)',
        'Jessica Tan',
        'Meja Bakery 01',
        'DINE_IN',
        68000,
        0,
        0,
        68000,
        25500,
        'TUNAI',
        100000,
        32000,
        'Pesanan Toko B',
        `${dateStr} 11:20:00`,
      ]
    );

    run(
      `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, barcode, buy_price, sell_price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['trxi-b-01', trxBId, 'prod-b01', 'Butter Croissant Almond Flakes', '8992001001', 9000, 24000, 2, 48000]
    );
    run(
      `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, barcode, buy_price, sell_price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['trxi-b-02', trxBId, 'prod-b05', 'Cinnamon Roll Glaze Vanilla', '8992001005', 7500, 20000, 1, 20000]
    );
  }

  // ==========================================
  // TOKO C: Dimsum & Mie Tarik Express
  // ==========================================
  const storeCId = 'store-toko-c';
  let storeC = queryOne('SELECT id FROM stores WHERE id = ?', [storeCId]);
  if (!storeC) {
    run(
      `INSERT INTO stores (id, name, slug, logo_url, address, phone, whatsapp, description, opening_hours, receipt_footer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        storeCId,
        'Toko C - Dimsum & Mie Tarik Express',
        'toko-c',
        'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=150&auto=format&fit=crop&q=80',
        'Jl. Kaliurang Km 5.5 No. 19, Sleman',
        '0815-9988-7766',
        '6281599887766',
        'Dimsum Halal Kukus & Goreng, Mie Tarik Homemade kenyal dengan kuah kaldu sapi asli.',
        '10:00 - 22:00 WIB',
        'Terima kasih telah berkunjung di Toko C Dimsum & Mie Tarik!\nNikmati kelezatan dimsum halal setiap hari.',
        now,
        now,
      ]
    );
  }

  // Users Toko C
  const usersTokoC = [
    { id: 'user-tokoc-admin', username: 'admin_tokoc', email: 'admin@toko-c.com', role: 'ADMIN_TOKO', name: 'Hendra Gunawan (Admin Toko C)' },
    { id: 'user-tokoc-kasir', username: 'kasir_tokoc', email: 'kasir@toko-c.com', role: 'KASIR', name: 'Lia Safitri (Kasir Toko C)' },
  ];
  for (const u of usersTokoC) {
    const ex = queryOne('SELECT id FROM users WHERE username = ?', [u.username]);
    if (!ex) {
      run(
        `INSERT INTO users (id, store_id, username, email, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, storeCId, u.username, u.email, commonPasswordHash, u.role, u.name, 1, now]
      );
    }
  }

  // Settings Toko C
  if (!queryOne('SELECT id FROM settings WHERE store_id = ?', [storeCId])) {
    run(
      `INSERT INTO settings (id, store_id, tax_percentage, allow_dine_in, allow_takeaway, currency_symbol, qris_image_url, bank_name, bank_account_number, bank_account_holder, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['setting-toko-c', storeCId, 0, 1, 1, 'Rp', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=QRIS_TOKO_C', 'Mandiri', '1370001234567', 'Toko C Dimsum Express', now]
    );
  }

  // Categories Toko C
  const catC = [
    { id: 'cat-c1', name: 'Dimsum Kukus', icon: 'Utensils' },
    { id: 'cat-c2', name: 'Dimsum Goreng & Crispy', icon: 'Flame' },
    { id: 'cat-c3', name: 'Mie Tarik Sapi', icon: 'Soup' },
    { id: 'cat-c4', name: 'Teh & Minuman Segar', icon: 'GlassWater' },
  ];
  for (const c of catC) {
    if (!queryOne('SELECT id FROM categories WHERE id = ?', [c.id])) {
      run('INSERT INTO categories (id, store_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)', [c.id, storeCId, c.name, c.icon, now]);
    }
  }

  // Tables Toko C
  for (let i = 1; i <= 5; i++) {
    const tNum = i < 10 ? `0${i}` : `${i}`;
    const tId = `tbl-c-${tNum}`;
    if (!queryOne('SELECT id FROM tables WHERE id = ?', [tId])) {
      run('INSERT INTO tables (id, store_id, name, capacity, status, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        tId,
        storeCId,
        `Meja Dimsum ${tNum}`,
        4,
        'AVAILABLE',
        1,
        now,
      ]);
    }
  }

  // Products Toko C
  const prodsC = [
    { id: 'prod-c01', cat: 'cat-c1', name: 'Siomay Ayam Udang Spesial (4 pcs)', code: '8993001001', buy: 8000, sell: 18000, stock: 60, unit: 'porsi', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-c02', cat: 'cat-c1', name: 'Hakau Udang Transparan Premium (4 pcs)', code: '8993001002', buy: 10000, sell: 22000, stock: 45, unit: 'porsi', img: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-c03', cat: 'cat-c2', name: 'Lumpia Kulit Tahu Udang Crispy (3 pcs)', code: '8993001003', buy: 8500, sell: 19000, stock: 50, unit: 'porsi', img: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-c04', cat: 'cat-c1', name: 'Pao Telur Asin Lava Melt (3 pcs)', code: '8993001004', buy: 9000, sell: 20000, stock: 35, unit: 'porsi', img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-c05', cat: 'cat-c3', name: 'Mie Tarik Daging Sapi Kuah Pedas Szechuan', code: '8993001005', buy: 12000, sell: 28000, stock: 30, unit: 'mangkuk', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80' },
    { id: 'prod-c06', cat: 'cat-c4', name: 'Es Teh Oolong Jasmine Dingin', code: '8993001006', buy: 2000, sell: 6000, stock: 80, unit: 'cup', img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80' },
  ];
  for (const p of prodsC) {
    if (!queryOne('SELECT id FROM products WHERE id = ?', [p.id])) {
      run(
        `INSERT INTO products (id, store_id, category_id, name, barcode, buy_price, sell_price, stock, unit, min_stock, image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [p.id, storeCId, p.cat, p.name, p.code, p.buy, p.sell, p.stock, p.unit, 5, p.img, now, now]
      );
    }
  }

  // Transactions Toko C
  const trxCId = 'trx-c-seed-01';
  if (!queryOne('SELECT id FROM transactions WHERE id = ?', [trxCId])) {
    run(
      `INSERT INTO transactions (id, store_id, transaction_number, order_id, cashier_id, cashier_name, customer_name, table_name, order_type, subtotal, discount, tax, total_amount, total_cogs, payment_method, amount_paid, change_amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trxCId,
        storeCId,
        'TRX-C-20260929-001',
        null,
        'user-tokoc-kasir',
        'Lia Safitri (Kasir Toko C)',
        'Hendra Wijaya',
        'Meja Dimsum 02',
        'DINE_IN',
        46000,
        0,
        0,
        46000,
        20000,
        'QRIS',
        46000,
        0,
        'Pesanan Toko C',
        `${dateStr} 12:45:00`,
      ]
    );

    run(
      `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, barcode, buy_price, sell_price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['trxi-c-01', trxCId, 'prod-c05', 'Mie Tarik Daging Sapi Kuah Pedas Szechuan', '8993001005', 12000, 28000, 1, 28000]
    );
    run(
      `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, barcode, buy_price, sell_price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['trxi-c-02', trxCId, 'prod-c01', 'Siomay Ayam Udang Spesial (4 pcs)', '8993001001', 8000, 18000, 1, 18000]
    );
  }

  console.log('Multi-Tenant UMKM Database verified & seeded successfully with Toko A, Toko B, and Toko C!');
}
