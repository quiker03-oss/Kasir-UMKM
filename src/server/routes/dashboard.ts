import { Router, Response } from 'express';
import { query, queryOne } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

router.use(authMiddleware, requireStore);

router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    if (!storeId) {
      res.status(400).json({ success: false, message: 'Store ID tidak valid.' });
      return;
    }

    // Determine today's date (support client's local date if passed, else server UTC date)
    const clientToday =
      typeof req.query.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.today)
        ? req.query.today
        : new Date().toISOString().split('T')[0];

    // 1. Today's transactions, omzet, laba kotor
    // Robust date matching using substr(created_at, 1, 10) = clientToday
    const todayTrx = queryOne(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(total_amount), 0) as omzet,
              COALESCE(SUM(total_cogs), 0) as cogs
       FROM transactions
       WHERE store_id = ? AND (status IS NULL OR status != 'REFUNDED') AND substr(created_at, 1, 10) = ?`,
      [storeId, clientToday]
    );

    const todayOmzet = todayTrx ? Number(todayTrx.omzet) : 0;
    const todayCogs = todayTrx ? Number(todayTrx.cogs) : 0;
    const todayTransactions = todayTrx ? Number(todayTrx.count) : 0;
    const todayGrossProfit = Math.max(0, todayOmzet - todayCogs);

    // Check if any product sold today has no HPP (buy_price = 0 or null)
    const zeroCogsItems = queryOne(
      `SELECT COUNT(*) as count
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.store_id = ? AND substr(t.created_at, 1, 10) = ? AND (ti.buy_price <= 0 OR ti.buy_price IS NULL)`,
      [storeId, clientToday]
    );
    const hasUnspecifiedCogs = zeroCogsItems ? Number(zeroCogsItems.count) > 0 : false;

    // 2. Product count for this store
    const prodCountRes = queryOne(
      'SELECT COUNT(*) as count FROM products WHERE store_id = ? AND is_active = 1',
      [storeId]
    );

    // 3. Low stock count and list (stock <= min_stock)
    const lowStockCountRes = queryOne(
      'SELECT COUNT(*) as count FROM products WHERE store_id = ? AND is_active = 1 AND stock <= min_stock',
      [storeId]
    );

    const lowStockProducts = query(
      `SELECT id, name, barcode, stock, min_stock, unit, buy_price, sell_price 
       FROM products 
       WHERE store_id = ? AND is_active = 1 AND stock <= min_stock 
       ORDER BY stock ASC 
       LIMIT 10`,
      [storeId]
    );

    // 4. Pending online orders count
    const pendingOrdersRes = queryOne(
      "SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND status = 'Menunggu'",
      [storeId]
    );

    // 5. Total active employees for this store
    const empCountRes = queryOne(
      'SELECT COUNT(*) as count FROM employees WHERE store_id = ? AND is_active = 1',
      [storeId]
    );

    // 6. Today's attendance count (each employee is counted only once per day)
    const attCountRes = queryOne(
      'SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE store_id = ? AND date = ?',
      [storeId, clientToday]
    );

    // 7. Last 7 days revenue chart from actual database transactions
    const dailyChart: { date: string; label: string; revenue: number; transactions: number }[] = [];
    const [y, m, d] = clientToday.split('-').map(Number);
    const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

    for (let i = 6; i >= 0; i--) {
      const curDate = new Date(baseDate);
      curDate.setUTCDate(curDate.getUTCDate() - i);
      const dStr = curDate.toISOString().split('T')[0];
      const dLabel = curDate.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });

      const dTrx = queryOne(
        `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
         FROM transactions
         WHERE store_id = ? AND (status IS NULL OR status != 'REFUNDED') AND substr(created_at, 1, 10) = ?`,
        [storeId, dStr]
      );

      dailyChart.push({
        date: dStr,
        label: dLabel,
        revenue: dTrx ? Number(dTrx.revenue) : 0,
        transactions: dTrx ? Number(dTrx.count) : 0,
      });
    }

    // 8. Top selling products from transactions for this store
    const topProducts = query(
      `SELECT ti.product_name as name, 
              SUM(ti.quantity) as quantity,
              SUM(ti.subtotal) as revenue
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.store_id = ?
       GROUP BY ti.product_id, ti.product_name
       ORDER BY quantity DESC
       LIMIT 5`,
      [storeId]
    );

    res.json({
      success: true,
      stats: {
        today: clientToday,
        today_revenue: todayOmzet,
        today_transactions: todayTransactions,
        today_gross_profit: todayGrossProfit,
        today_cogs: todayCogs,
        has_unspecified_cogs: hasUnspecifiedCogs,
        total_products: prodCountRes ? Number(prodCountRes.count) : 0,
        low_stock_count: lowStockCountRes ? Number(lowStockCountRes.count) : 0,
        new_orders_count: pendingOrdersRes ? Number(pendingOrdersRes.count) : 0,
        total_employees: empCountRes ? Number(empCountRes.count) : 0,
        today_attendance_count: attCountRes ? Number(attCountRes.count) : 0,
        daily_revenue_chart: dailyChart,
        top_products: topProducts,
        low_stock_items: lowStockProducts,
      },
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Gagal memuat statistik dashboard.' });
  }
});

export default router;
