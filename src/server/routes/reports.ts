import { Router, Response } from 'express';
import { query, queryOne } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

// Store isolation: requireStore ensures every query is scoped to the user's logged-in store
router.use(authMiddleware, requireStore);

// 1. Comprehensive financial and sales reports summary (KPIs and overview)
router.get('/finance', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, cashier_id, payment_method, product_id } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const startDateOnly = typeof start_date === 'string' && start_date ? start_date : todayStr;
    const endDateOnly = typeof end_date === 'string' && end_date ? end_date : todayStr;

    const store = queryOne('SELECT id, name, address, phone, logo_url FROM stores WHERE id = ?', [storeId]) || {
      name: 'Kasir UMKM',
    };

    // Base condition for transactions
    let whereClause = `WHERE t.store_id = ? AND substr(t.created_at, 1, 10) >= ? AND substr(t.created_at, 1, 10) <= ?`;
    const params: any[] = [storeId, startDateOnly, endDateOnly];

    if (cashier_id && typeof cashier_id === 'string' && cashier_id !== 'ALL') {
      whereClause += ` AND t.cashier_id = ?`;
      params.push(cashier_id);
    }

    if (payment_method && typeof payment_method === 'string' && payment_method !== 'ALL') {
      whereClause += ` AND t.payment_method = ?`;
      params.push(payment_method);
    }

    if (product_id && typeof product_id === 'string' && product_id !== 'ALL') {
      whereClause += ` AND EXISTS (SELECT 1 FROM transaction_items WHERE transaction_id = t.id AND product_id = ?)`;
      params.push(product_id);
    }

    // 1. Transaction Summary
    const trxSummary = queryOne(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(t.total_amount), 0) as omzet,
              COALESCE(SUM(t.total_cogs), 0) as total_cogs,
              COALESCE(SUM(t.discount), 0) as total_discount
       FROM transactions t
       ${whereClause}`,
      params
    );

    // 2. Total items sold
    let itemsSoldQuery = `
      SELECT COALESCE(SUM(ti.quantity), 0) as total_items
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      ${whereClause}
    `;
    const itemsSoldParams = [...params];
    if (product_id && typeof product_id === 'string' && product_id !== 'ALL') {
      itemsSoldQuery += ` AND ti.product_id = ?`;
      itemsSoldParams.push(product_id);
    }
    const itemsSoldRes = queryOne(itemsSoldQuery, itemsSoldParams);
    const totalItemsSold = itemsSoldRes ? Number(itemsSoldRes.total_items) : 0;

    // 3. Cash vs Non-Cash Breakdown
    const cashSummary = queryOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(t.total_amount), 0) as total
       FROM transactions t
       ${whereClause} AND t.payment_method = 'TUNAI'`,
      params
    );

    const nonCashSummary = queryOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(t.total_amount), 0) as total
       FROM transactions t
       ${whereClause} AND t.payment_method IN ('QRIS', 'TRANSFER')`,
      params
    );

    // 4. Expenses
    const expSummary = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses,
              COALESCE(SUM(CASE WHEN type = 'MODAL' THEN amount ELSE 0 END), 0) as modal_expenses,
              COALESCE(SUM(CASE WHEN type = 'BIAYA_OPERASIONAL' THEN amount ELSE 0 END), 0) as operational_expenses
       FROM expenses
       WHERE store_id = ? AND date >= ? AND date <= ?`,
      [storeId, startDateOnly, endDateOnly]
    );

    // 5. Payment method breakdown
    const paymentMethods = query(
      `SELECT t.payment_method, COUNT(*) as count, SUM(t.total_amount) as total
       FROM transactions t
       ${whereClause}
       GROUP BY t.payment_method`,
      params
    );

    // 6. List of transactions matching the filter (up to 150)
    const transactionList = query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = t.id) as item_count,
              (SELECT GROUP_CONCAT(product_name || ' (' || quantity || ')', ', ') FROM transaction_items WHERE transaction_id = t.id) as items_summary
       FROM transactions t
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 150`,
      params
    );

    // 7. Store Cashiers & Products for dropdown filter
    const cashiersList = query(
      `SELECT id, full_name, username, role FROM users WHERE store_id = ? AND is_active = 1`,
      [storeId]
    );

    const productsList = query(
      `SELECT id, name, barcode FROM products WHERE store_id = ? AND is_active = 1 ORDER BY name ASC`,
      [storeId]
    );

    const omzet = trxSummary ? Number(trxSummary.omzet) : 0;
    const cogs = trxSummary ? Number(trxSummary.total_cogs) : 0;
    const grossProfit = Math.max(0, omzet - cogs);
    const operationalExpenses = expSummary ? Number(expSummary.operational_expenses) : 0;
    const netProfit = grossProfit - operationalExpenses;

    res.json({
      success: true,
      store,
      summary: {
        omzet,
        transaction_count: trxSummary ? Number(trxSummary.count) : 0,
        total_cogs: cogs,
        gross_profit: grossProfit,
        total_items_sold: totalItemsSold,
        cash_transactions: {
          count: cashSummary ? Number(cashSummary.count) : 0,
          total: cashSummary ? Number(cashSummary.total) : 0,
        },
        non_cash_transactions: {
          count: nonCashSummary ? Number(nonCashSummary.count) : 0,
          total: nonCashSummary ? Number(nonCashSummary.total) : 0,
        },
        total_expenses: expSummary ? Number(expSummary.total_expenses) : 0,
        operational_expenses: operationalExpenses,
        modal_expenses: expSummary ? Number(expSummary.modal_expenses) : 0,
        net_profit: netProfit,
        total_discount: trxSummary ? Number(trxSummary.total_discount) : 0,
      },
      transactions: transactionList,
      payment_methods: paymentMethods,
      filter_options: {
        cashiers: cashiersList,
        products: productsList,
      },
    });
  } catch (err: any) {
    console.error('Finance report error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghasilkan laporan keuangan.' });
  }
});

// 2. Real Financial Ledger (Laporan Keuangan Resmi)
// Combines Pemasukan (transactions) and Pengeluaran (expenses) with running balance (saldo)
router.get('/financial-ledger', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, transaction_type, category, cashier_id } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const startDate = typeof start_date === 'string' && start_date ? start_date : todayStr;
    const endDate = typeof end_date === 'string' && end_date ? end_date : todayStr;
    const typeFilter = typeof transaction_type === 'string' ? transaction_type.toUpperCase() : 'ALL';
    const categoryFilter = typeof category === 'string' ? category : 'ALL';
    const cashierFilter = typeof cashier_id === 'string' ? cashier_id : 'ALL';

    const store = queryOne('SELECT id, name, address, phone, logo_url FROM stores WHERE id = ?', [storeId]) || {
      name: 'Kasir UMKM',
      address: '',
      phone: '',
    };

    // 1. Fetch Income (Transactions)
    let incomeRows: any[] = [];
    if (typeFilter === 'ALL' || typeFilter === 'PEMASUKAN' || typeFilter === 'INCOME') {
      let incomeSql = `
        SELECT 
          t.id,
          t.transaction_number,
          t.created_at,
          t.cashier_id,
          t.cashier_name,
          t.total_amount,
          t.payment_method,
          COALESCE(NULLIF(t.notes, ''), 'Penjualan Kasir (' || t.payment_method || ')') as description,
          'Penjualan Kasir' as category,
          'PEMASUKAN' as entry_type
        FROM transactions t
        WHERE t.store_id = ?
          AND substr(t.created_at, 1, 10) >= ?
          AND substr(t.created_at, 1, 10) <= ?
      `;
      const incomeParams: any[] = [storeId, startDate, endDate];

      if (cashierFilter !== 'ALL') {
        incomeSql += ` AND t.cashier_id = ?`;
        incomeParams.push(cashierFilter);
      }

      if (categoryFilter !== 'ALL' && categoryFilter !== 'Penjualan Kasir') {
        // If specific non-sales category requested, income from sales is excluded
        incomeSql += ` AND 1 = 0`;
      }

      incomeRows = query(incomeSql, incomeParams);
    }

    // 2. Fetch Expenses (Pengeluaran)
    let expenseRows: any[] = [];
    if (typeFilter === 'ALL' || typeFilter === 'PENGELUARAN' || typeFilter === 'EXPENSE') {
      // If cashier is filtered and not ALL, expenses may only match if created_by matches cashier name
      let expenseSql = `
        SELECT 
          e.id,
          ('BIAYA-' || UPPER(substr(e.id, 1, 8))) as transaction_number,
          e.date as created_at,
          NULL as cashier_id,
          COALESCE(e.created_by, 'Admin Toko') as cashier_name,
          e.amount as total_amount,
          'TUNAI' as payment_method,
          e.description,
          e.category,
          'PENGELUARAN' as entry_type
        FROM expenses e
        WHERE e.store_id = ?
          AND e.date >= ?
          AND e.date <= ?
      `;
      const expenseParams: any[] = [storeId, startDate, endDate];

      if (categoryFilter !== 'ALL') {
        expenseSql += ` AND e.category = ?`;
        expenseParams.push(categoryFilter);
      }

      if (cashierFilter !== 'ALL') {
        // Find cashier name
        const cashierUser = queryOne('SELECT full_name, username FROM users WHERE id = ?', [cashierFilter]);
        if (cashierUser) {
          expenseSql += ` AND (e.created_by = ? OR e.created_by = ?)`;
          expenseParams.push(cashierUser.full_name, cashierUser.username);
        } else {
          expenseSql += ` AND 1 = 0`;
        }
      }

      expenseRows = query(expenseSql, expenseParams);
    }

    // 3. Merge and sort chronologically ascending to calculate running balance
    const combined = [
      ...incomeRows.map((r) => ({
        id: r.id,
        transaction_number: r.transaction_number,
        date: r.created_at,
        description: r.description || 'Penjualan Kasir',
        category: r.category || 'Penjualan Kasir',
        cashier_name: r.cashier_name || 'Kasir',
        income: Number(r.total_amount) || 0,
        expense: 0,
        entry_type: 'PEMASUKAN',
      })),
      ...expenseRows.map((r) => ({
        id: r.id,
        transaction_number: r.transaction_number,
        date: r.created_at.length === 10 ? `${r.created_at}T12:00:00` : r.created_at,
        description: r.description || 'Pengeluaran Toko',
        category: r.category || 'Operasional',
        cashier_name: r.cashier_name || 'Admin',
        income: 0,
        expense: Number(r.total_amount) || 0,
        entry_type: 'PENGELUARAN',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute running balance
    let runningBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    const ledger = combined.map((item) => {
      runningBalance += item.income - item.expense;
      totalIncome += item.income;
      totalExpense += item.expense;
      return {
        ...item,
        saldo: runningBalance,
      };
    });

    // Also get all distinct categories in expenses for dropdown
    const existingCategories = query(
      `SELECT DISTINCT category FROM expenses WHERE store_id = ? ORDER BY category ASC`,
      [storeId]
    ).map((c: any) => c.category);

    const allCategories = Array.from(new Set(['Penjualan Kasir', ...existingCategories])).filter(Boolean);

    // Cashiers list
    const cashiers = query(
      `SELECT id, full_name, username, role FROM users WHERE store_id = ? AND is_active = 1 ORDER BY full_name ASC`,
      [storeId]
    );

    res.json({
      success: true,
      store,
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_pemasukan: totalIncome,
        total_pengeluaran: totalExpense,
        saldo: runningBalance,
        total_transaksi: ledger.length,
      },
      transactions: ledger,
      filter_options: {
        categories: allCategories,
        cashiers,
      },
    });
  } catch (err: any) {
    console.error('Financial ledger error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat buku besar laporan keuangan.' });
  }
});

// 3. Real Detailed Sales Report (Laporan Penjualan Resmi)
// Detailed rows: Tanggal | No Transaksi | Produk | Qty | Harga | Subtotal | HPP | Laba
router.get('/sales-detailed', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, cashier_id, payment_method, product_id } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const startDate = typeof start_date === 'string' && start_date ? start_date : todayStr;
    const endDate = typeof end_date === 'string' && end_date ? end_date : todayStr;
    const cashierFilter = typeof cashier_id === 'string' ? cashier_id : 'ALL';
    const paymentFilter = typeof payment_method === 'string' ? payment_method : 'ALL';
    const productFilter = typeof product_id === 'string' ? product_id : 'ALL';

    const store = queryOne('SELECT id, name, address, phone, logo_url FROM stores WHERE id = ?', [storeId]) || {
      name: 'Kasir UMKM',
      address: '',
      phone: '',
    };

    let sql = `
      SELECT 
        ti.id as item_id,
        t.id as transaction_id,
        t.transaction_number,
        t.created_at,
        t.cashier_name,
        t.cashier_id,
        t.payment_method,
        ti.product_id,
        ti.product_name,
        ti.quantity,
        ti.sell_price as price,
        ti.subtotal,
        ti.buy_price,
        (ti.buy_price * ti.quantity) as total_cogs,
        (ti.subtotal - (ti.buy_price * ti.quantity)) as profit
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.store_id = ?
        AND substr(t.created_at, 1, 10) >= ?
        AND substr(t.created_at, 1, 10) <= ?
    `;
    const params: any[] = [storeId, startDate, endDate];

    if (cashierFilter !== 'ALL') {
      sql += ` AND t.cashier_id = ?`;
      params.push(cashierFilter);
    }

    if (paymentFilter !== 'ALL') {
      sql += ` AND t.payment_method = ?`;
      params.push(paymentFilter);
    }

    if (productFilter !== 'ALL') {
      sql += ` AND ti.product_id = ?`;
      params.push(productFilter);
    }

    sql += ` ORDER BY t.created_at DESC, ti.id ASC`;

    const items = query(sql, params);

    // Summary calculations
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalItemsSold = 0;
    const transactionIdSet = new Set<string>();

    const salesDetails = items.map((r) => {
      const subtotal = Number(r.subtotal) || 0;
      const cogs = Number(r.total_cogs) || 0;
      const profit = Number(r.profit) || (subtotal - cogs);
      const qty = Number(r.quantity) || 0;

      totalRevenue += subtotal;
      totalCogs += cogs;
      totalItemsSold += qty;
      transactionIdSet.add(r.transaction_id);

      return {
        item_id: r.item_id,
        transaction_id: r.transaction_id,
        date: r.created_at,
        transaction_number: r.transaction_number,
        cashier_name: r.cashier_name || 'Kasir',
        payment_method: r.payment_method,
        product_name: r.product_name,
        quantity: qty,
        price: Number(r.price) || 0,
        subtotal,
        cogs,
        profit,
      };
    });

    const grossProfit = totalRevenue - totalCogs;

    // Filter options
    const cashiers = query(
      `SELECT id, full_name, username, role FROM users WHERE store_id = ? AND is_active = 1 ORDER BY full_name ASC`,
      [storeId]
    );

    const products = query(
      `SELECT id, name, barcode FROM products WHERE store_id = ? AND is_active = 1 ORDER BY name ASC`,
      [storeId]
    );

    res.json({
      success: true,
      store,
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_omzet: totalRevenue,
        transaction_count: transactionIdSet.size,
        total_items_sold: totalItemsSold,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
      },
      sales_details: salesDetails,
      filter_options: {
        cashiers,
        products,
        payment_methods: ['TUNAI', 'QRIS', 'TRANSFER'],
      },
    });
  } catch (err: any) {
    console.error('Detailed sales report error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat rincian laporan penjualan.' });
  }
});

// Top selling products with date filter
router.get('/top-products', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, limit } = req.query;

    const startDateOnly = typeof start_date === 'string' && start_date ? start_date : '2000-01-01';
    const endDateOnly = typeof end_date === 'string' && end_date ? end_date : '2099-12-31';
    const max = Number(limit) || 10;

    const topProducts = query(
      `SELECT ti.product_name, 
              SUM(ti.quantity) as total_quantity,
              SUM(ti.subtotal) as total_revenue
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.store_id = ? AND substr(t.created_at, 1, 10) >= ? AND substr(t.created_at, 1, 10) <= ?
       GROUP BY ti.product_id, ti.product_name
       ORDER BY total_quantity DESC
       LIMIT ?`,
      [storeId, startDateOnly, endDateOnly, max]
    );

    res.json({ success: true, top_products: topProducts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat produk terlaris.' });
  }
});

export default router;
