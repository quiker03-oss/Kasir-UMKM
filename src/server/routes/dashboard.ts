import { Router, Response } from 'express';
import { query, queryOne } from '../db.ts';
import { authMiddleware, requireStore, AuthRequest } from '../auth.ts';

const router = Router();

// Store isolation: requireStore ensures every query is scoped to authenticated store
router.use(authMiddleware, requireStore);

router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req as any).storeId;
    if (!storeId) {
      res.status(400).json({ success: false, message: 'Store ID tidak valid.' });
      return;
    }

    // Determine client today date (format: YYYY-MM-DD)
    const clientToday =
      typeof req.query.today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.today)
        ? req.query.today
        : new Date().toISOString().split('T')[0];

    const currentYear = clientToday.substring(0, 4);
    const currentMonth = clientToday.substring(0, 7); // YYYY-MM

    // Filter period: 'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all'
    const period = (typeof req.query.period === 'string' ? req.query.period : '7days').toLowerCase();

    // Calculate start_date and end_date based on period
    let startDate: string | null = null;
    let endDate: string | null = clientToday;

    const [tY, tM, tD] = clientToday.split('-').map(Number);
    const todayDateObj = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));

    if (period === 'today') {
      startDate = clientToday;
      endDate = clientToday;
    } else if (period === '7days') {
      const d7 = new Date(todayDateObj);
      d7.setUTCDate(d7.getUTCDate() - 6);
      startDate = d7.toISOString().split('T')[0];
      endDate = clientToday;
    } else if (period === 'this_month') {
      startDate = `${currentMonth}-01`;
      endDate = clientToday;
    } else if (period === 'last_month') {
      const prevMonthObj = new Date(Date.UTC(tY, tM - 2, 1, 12, 0, 0));
      const pmY = prevMonthObj.getUTCFullYear();
      const pmM = String(prevMonthObj.getUTCMonth() + 1).padStart(2, '0');
      const lastDayPrevMonth = new Date(Date.UTC(pmY, prevMonthObj.getUTCMonth() + 1, 0)).getUTCDate();
      startDate = `${pmY}-${pmM}-01`;
      endDate = `${pmY}-${pmM}-${String(lastDayPrevMonth).padStart(2, '0')}`;
    } else if (period === 'this_year') {
      startDate = `${currentYear}-01-01`;
      endDate = clientToday;
    } else {
      // 'all'
      startDate = null;
      endDate = null;
    }

    // Helper for SQL date range filter
    const getDateClause = (dateCol: string) => {
      if (!startDate || !endDate) return { clause: '', params: [] as any[] };
      return {
        clause: ` AND substr(${dateCol}, 1, 10) >= ? AND substr(${dateCol}, 1, 10) <= ?`,
        params: [startDate, endDate],
      };
    };

    const orderDateFilter = getDateClause('created_at');
    const trxDateFilter = getDateClause('created_at');

    // =========================================================================
    // 1. ONLINE ORDERS STATISTICS (Sesuai Permintaan User: PESANAN ONLINE -> DASHBOARD)
    // =========================================================================
    // A. All-time & Period Orders Count
    const totalOrdersRes = queryOne(
      `SELECT COUNT(*) as count FROM orders WHERE store_id = ? ${orderDateFilter.clause}`,
      [storeId, ...orderDateFilter.params]
    );
    const totalOrders = totalOrdersRes ? Number(totalOrdersRes.count) : 0;

    const allTimeOrdersRes = queryOne(
      `SELECT COUNT(*) as count FROM orders WHERE store_id = ?`,
      [storeId]
    );
    const allTimeOrders = allTimeOrdersRes ? Number(allTimeOrdersRes.count) : 0;

    // B. Today & Month Orders Count
    const todayOrdersRes = queryOne(
      `SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND substr(created_at, 1, 10) = ?`,
      [storeId, clientToday]
    );
    const todayOrders = todayOrdersRes ? Number(todayOrdersRes.count) : 0;

    const monthOrdersRes = queryOne(
      `SELECT COUNT(*) as count FROM orders WHERE store_id = ? AND substr(created_at, 1, 7) = ?`,
      [storeId, currentMonth]
    );
    const monthOrders = monthOrdersRes ? Number(monthOrdersRes.count) : 0;

    // C. Orders Count by Status (Sesuai status di sistem)
    // Status: Menunggu, Diterima, Diproses, Siap, Dikirim, Selesai, Dibatalkan
    const statusCountsRaw = query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_val
       FROM orders
       WHERE store_id = ? ${orderDateFilter.clause}
       GROUP BY status`,
      [storeId, ...orderDateFilter.params]
    );

    const statusCounts: Record<string, { count: number; total_amount: number }> = {
      Menunggu: { count: 0, total_amount: 0 },
      Diterima: { count: 0, total_amount: 0 },
      Diproses: { count: 0, total_amount: 0 },
      Siap: { count: 0, total_amount: 0 },
      Dikirim: { count: 0, total_amount: 0 },
      Selesai: { count: 0, total_amount: 0 },
      Dibatalkan: { count: 0, total_amount: 0 },
    };

    for (const r of statusCountsRaw) {
      if (r.status && statusCounts[r.status] !== undefined) {
        statusCounts[r.status] = {
          count: Number(r.count),
          total_amount: Number(r.total_val),
        };
      }
    }

    const pendingOrders = statusCounts['Menunggu'].count;
    const processingOrders =
      statusCounts['Diterima'].count +
      statusCounts['Diproses'].count +
      statusCounts['Siap'].count +
      statusCounts['Dikirim'].count;
    const readyOrders = statusCounts['Siap'].count;
    const completedOrders = statusCounts['Selesai'].count;
    const cancelledOrders = statusCounts['Dibatalkan'].count;

    // =========================================================================
    // 2. REVENUE / PENDAPATAN (ONLINE ORDERS & POS TRANSACTIONS)
    // Aturan: Hanya pesanan Selesai / Terbayar yang dihitung omzet (Dibatalkan TIDAK dihitung)
    // =========================================================================
    const ordersRevenueRes = queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as omzet
       FROM orders
       WHERE store_id = ? 
         AND (status = 'Selesai' OR payment_status = 'PAID')
         AND status != 'Dibatalkan'
         ${orderDateFilter.clause}`,
      [storeId, ...orderDateFilter.params]
    );
    const ordersRevenue = ordersRevenueRes ? Number(ordersRevenueRes.omzet) : 0;

    // In-store POS Transactions
    const posRevenueRes = queryOne(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(total_amount), 0) as omzet,
              COALESCE(SUM(total_cogs), 0) as cogs
       FROM transactions
       WHERE store_id = ? 
         AND (status IS NULL OR status != 'REFUNDED')
         ${trxDateFilter.clause}`,
      [storeId, ...trxDateFilter.params]
    );
    const posRevenue = posRevenueRes ? Number(posRevenueRes.omzet) : 0;
    const posCount = posRevenueRes ? Number(posRevenueRes.count) : 0;
    const posCogs = posRevenueRes ? Number(posRevenueRes.cogs) : 0;

    // Today's revenue & transactions
    const todayOrdersRevRes = queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as omzet
       FROM orders
       WHERE store_id = ? 
         AND (status = 'Selesai' OR payment_status = 'PAID')
         AND status != 'Dibatalkan'
         AND substr(created_at, 1, 10) = ?`,
      [storeId, clientToday]
    );
    const todayPosRevRes = queryOne(
      `SELECT COUNT(*) as count,
              COALESCE(SUM(total_amount), 0) as omzet,
              COALESCE(SUM(total_cogs), 0) as cogs
       FROM transactions
       WHERE store_id = ? 
         AND (status IS NULL OR status != 'REFUNDED')
         AND substr(created_at, 1, 10) = ?`,
      [storeId, clientToday]
    );

    const todayOrdersRev = todayOrdersRevRes ? Number(todayOrdersRevRes.omzet) : 0;
    const todayPosRev = todayPosRevRes ? Number(todayPosRevRes.omzet) : 0;
    const todayPosTrx = todayPosRevRes ? Number(todayPosRevRes.count) : 0;
    const todayPosCogs = todayPosRevRes ? Number(todayPosRevRes.cogs) : 0;

    // Month's revenue
    const monthOrdersRevRes = queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as omzet
       FROM orders
       WHERE store_id = ? 
         AND (status = 'Selesai' OR payment_status = 'PAID')
         AND status != 'Dibatalkan'
         AND substr(created_at, 1, 7) = ?`,
      [storeId, currentMonth]
    );
    const monthPosRevRes = queryOne(
      `SELECT COALESCE(SUM(total_amount), 0) as omzet
       FROM transactions
       WHERE store_id = ? 
         AND (status IS NULL OR status != 'REFUNDED')
         AND substr(created_at, 1, 7) = ?`,
      [storeId, currentMonth]
    );
    const monthRevenue = (monthOrdersRevRes ? Number(monthOrdersRevRes.omzet) : 0) +
                         (monthPosRevRes ? Number(monthPosRevRes.omzet) : 0);

    // Total combined metrics
    const totalRevenue = ordersRevenue + posRevenue;
    const todayRevenue = todayOrdersRev + todayPosRev;
    const todayTransactions = todayOrders + todayPosTrx;
    const combinedTotalOrders = totalOrders + posCount;
    const combinedTodayOrders = todayOrders + todayPosTrx;
    const combinedMonthOrders = monthOrders + Number(queryOne(
      `SELECT COUNT(*) as c FROM transactions WHERE store_id = ? AND (status IS NULL OR status != 'REFUNDED') AND substr(created_at, 1, 7) = ?`,
      [storeId, currentMonth]
    )?.c || 0);

    // Calculate COGS from order items as well
    const ordersCogsRes = queryOne(
      `SELECT COALESCE(SUM(oi.buy_price * oi.quantity), 0) as cogs
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.store_id = ? 
         AND (o.status = 'Selesai' OR o.payment_status = 'PAID')
         AND o.status != 'Dibatalkan'
         ${orderDateFilter.clause.replace(/created_at/g, 'o.created_at')}`,
      [storeId, ...orderDateFilter.params]
    );
    const ordersCogs = ordersCogsRes ? Number(ordersCogsRes.cogs) : 0;
    const totalCogs = posCogs + ordersCogs;
    const grossProfit = Math.max(0, totalRevenue - totalCogs);
    const todayGrossProfit = Math.max(0, todayRevenue - todayPosCogs);

    // =========================================================================
    // 3. GRAFIK DASHBOARD (PENJUALAN & PESANAN PER HARI DARI DATABASE)
    // Menghasilkan data point harian secara dinamis berdasarkan periode filter
    // =========================================================================
    let chartDaysCount = 7;
    if (period === 'today') chartDaysCount = 7; // Show 7 days window ending today for context
    else if (period === '7days') chartDaysCount = 7;
    else if (period === 'this_month') chartDaysCount = Math.min(31, tD);
    else if (period === 'last_month') chartDaysCount = 30;
    else if (period === 'this_year') chartDaysCount = 14;
    else chartDaysCount = 14;

    const dailyChart: {
      date: string;
      label: string;
      revenue: number;
      orders_count: number;
      online_orders: number;
      pos_transactions: number;
      completed_orders: number;
    }[] = [];

    // Query daily aggregations in batch for efficiency
    for (let i = chartDaysCount - 1; i >= 0; i--) {
      const curDate = new Date(todayDateObj);
      curDate.setUTCDate(curDate.getUTCDate() - i);
      const dStr = curDate.toISOString().split('T')[0];
      const dLabel = curDate.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });

      // Online orders on this day
      const dOrders = queryOne(
        `SELECT COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN (status = 'Selesai' OR payment_status = 'PAID') AND status != 'Dibatalkan' THEN total_amount ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN status = 'Selesai' THEN 1 ELSE 0 END), 0) as completed_count
         FROM orders
         WHERE store_id = ? AND substr(created_at, 1, 10) = ?`,
        [storeId, dStr]
      );

      // POS transactions on this day
      const dTrx = queryOne(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(total_amount), 0) as revenue
         FROM transactions
         WHERE store_id = ? AND (status IS NULL OR status != 'REFUNDED') AND substr(created_at, 1, 10) = ?`,
        [storeId, dStr]
      );

      const dOnlineCount = dOrders ? Number(dOrders.total_count) : 0;
      const dPosCount = dTrx ? Number(dTrx.count) : 0;
      const dOnlineRev = dOrders ? Number(dOrders.revenue) : 0;
      const dPosRev = dTrx ? Number(dTrx.revenue) : 0;
      const dCompleted = dOrders ? Number(dOrders.completed_count) : 0;

      dailyChart.push({
        date: dStr,
        label: dLabel,
        revenue: dOnlineRev + dPosRev,
        orders_count: dOnlineCount + dPosCount,
        online_orders: dOnlineCount,
        pos_transactions: dPosCount,
        completed_orders: dCompleted,
      });
    }

    // =========================================================================
    // 4. GRAFIK STATUS PESANAN (DISTRIBUSI STATUS)
    // =========================================================================
    const statusDistribution = [
      {
        status: 'Menunggu',
        label: 'Menunggu Konfirmasi',
        count: statusCounts['Menunggu'].count,
        total_amount: statusCounts['Menunggu'].total_amount,
        color: '#f59e0b', // Amber
      },
      {
        status: 'Diproses',
        label: 'Sedang Diproses / Siap',
        count: statusCounts['Diterima'].count + statusCounts['Diproses'].count + statusCounts['Siap'].count + statusCounts['Dikirim'].count,
        total_amount: statusCounts['Diterima'].total_amount + statusCounts['Diproses'].total_amount + statusCounts['Siap'].total_amount + statusCounts['Dikirim'].total_amount,
        color: '#3b82f6', // Blue
      },
      {
        status: 'Selesai',
        label: 'Pesanan Selesai',
        count: statusCounts['Selesai'].count,
        total_amount: statusCounts['Selesai'].total_amount,
        color: '#10b981', // Emerald
      },
      {
        status: 'Dibatalkan',
        label: 'Pesanan Dibatalkan',
        count: statusCounts['Dibatalkan'].count,
        total_amount: statusCounts['Dibatalkan'].total_amount,
        color: '#ef4444', // Rose
      },
    ];

    // =========================================================================
    // 5. RECENT ORDERS (DAFTAR PESANAN ONLINE TERBARU)
    // =========================================================================
    const recentOrdersRaw = query(
      `SELECT id, order_number, customer_name, customer_phone, order_type, table_name,
              status, payment_method, payment_status, total_amount, created_at
       FROM orders
       WHERE store_id = ?
       ORDER BY created_at DESC
       LIMIT 6`,
      [storeId]
    );

    const recentOrders = recentOrdersRaw.map((ord: any) => {
      const items = query(
        `SELECT product_name, quantity, price, subtotal FROM order_items WHERE order_id = ? LIMIT 5`,
        [ord.id]
      );
      return {
        ...ord,
        items,
        items_count: items.length,
      };
    });

    // =========================================================================
    // 6. PRODUK TERLARIS (TOP SELLING PRODUCTS DARI PESANAN & TRANSAKSI)
    // =========================================================================
    const topProducts = query(
      `SELECT product_name as name, 
              SUM(quantity) as quantity,
              SUM(subtotal) as revenue
       FROM (
         SELECT ti.product_name, ti.quantity, ti.subtotal
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         WHERE t.store_id = ? AND (t.status IS NULL OR t.status != 'REFUNDED')
         UNION ALL
         SELECT oi.product_name, oi.quantity, oi.subtotal
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.store_id = ? AND o.status != 'Dibatalkan'
       )
       GROUP BY product_name
       ORDER BY quantity DESC
       LIMIT 5`,
      [storeId, storeId]
    );

    // =========================================================================
    // 7. OPERASIONAL: PRODUK, STOK MENIPIS & ABSENSI
    // =========================================================================
    const prodCountRes = queryOne(
      'SELECT COUNT(*) as count FROM products WHERE store_id = ? AND is_active = 1',
      [storeId]
    );

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

    const empCountRes = queryOne(
      'SELECT COUNT(*) as count FROM employees WHERE store_id = ? AND is_active = 1',
      [storeId]
    );

    const attCountRes = queryOne(
      'SELECT COUNT(DISTINCT employee_id) as count FROM attendance WHERE store_id = ? AND date = ?',
      [storeId, clientToday]
    );

    // Store Info
    const storeInfo = queryOne(
      'SELECT id, name, slug FROM stores WHERE id = ?',
      [storeId]
    );

    // =========================================================================
    // RESPONSE LENGKAP
    // =========================================================================
    res.json({
      success: true,
      data: {
        store: storeInfo,
        period,
        date_range: {
          start_date: startDate,
          end_date: endDate,
          today: clientToday,
        },
        stats: {
          // Key Order Metrics (Sesuai Permintaan User)
          total_orders: totalOrders,
          all_time_orders: allTimeOrders,
          today_orders: todayOrders,
          month_orders: monthOrders,
          pending_orders: pendingOrders,
          processing_orders: processingOrders,
          ready_orders: readyOrders,
          completed_orders: completedOrders,
          cancelled_orders: cancelledOrders,

          // Revenue Metrics
          total_revenue: totalRevenue,
          orders_revenue: ordersRevenue,
          pos_revenue: posRevenue,
          today_revenue: todayRevenue,
          month_revenue: monthRevenue,
          gross_profit: grossProfit,
          today_gross_profit: todayGrossProfit,
          total_cogs: totalCogs,

          // Combined In-store POS + Online
          pos_transactions_count: posCount,
          combined_total_orders: combinedTotalOrders,
          combined_today_orders: combinedTodayOrders,
          combined_month_orders: combinedMonthOrders,
          today_transactions: todayTransactions,

          // Operational & Inventory
          total_products: prodCountRes ? Number(prodCountRes.count) : 0,
          low_stock_count: lowStockCountRes ? Number(lowStockCountRes.count) : 0,
          total_employees: empCountRes ? Number(empCountRes.count) : 0,
          today_attendance_count: attCountRes ? Number(attCountRes.count) : 0,

          // Breakdown & Details
          status_breakdown: statusCounts,
          status_distribution: statusDistribution,
          daily_revenue_chart: dailyChart,
          top_products: topProducts,
          low_stock_items: lowStockProducts,
          recent_orders: recentOrders,
        },
      },
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Data dashboard gagal dimuat. Silakan coba lagi.' });
  }
});

export default router;
