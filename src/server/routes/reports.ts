import { Router, Response } from 'express';
import { query, queryOne } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

// Store isolation: requireStore ensures every query is scoped to the user's logged-in store
router.use(authMiddleware, requireStore);

// Comprehensive financial and sales reports with filters
router.get('/finance', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    const { start_date, end_date, cashier_id, payment_method, product_id } = req.query;

    const todayStr = new Date().toISOString().split('T')[0];
    const startDateOnly = typeof start_date === 'string' && start_date ? start_date : todayStr;
    const endDateOnly = typeof end_date === 'string' && end_date ? end_date : todayStr;

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
