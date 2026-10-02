import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  Clock,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  ChefHat,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { api } from '../lib/api.ts';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

type PeriodFilter = 'today' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'all';

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('7days');
  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');

  const isMountedRef = useRef(true);

  const getLocalDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const loadStats = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setError(null);
      } else {
        setRefreshing(true);
      }

      const today = getLocalDateStr();
      const res = await api.getDashboardStats({ today, period: selectedPeriod });

      if (!isMountedRef.current) return;

      if (res.success && res.data) {
        setStats(res.data.stats || null);
        setStoreInfo(res.data.store || null);
        setError(null);
      } else if (res.success && res.stats) {
        // Fallback for older response format
        setStats(res.stats);
        setError(null);
      } else {
        if (!isBackground) {
          setError(res.message || 'Data dashboard gagal dimuat. Silakan coba lagi.');
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Dashboard load error:', err);
      if (!isBackground) {
        setError('Data dashboard gagal dimuat. Silakan coba lagi.');
      }
    } finally {
      if (isMountedRef.current) {
        if (!isBackground) setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadStats(false);

    // Auto-refresh poll every 3.5 seconds to immediately catch online checkout & order status changes
    const pollInterval = setInterval(() => {
      loadStats(true);
    }, 3500);

    // Immediate events from customer checkout or POS cashier
    const handleTxComplete = () => loadStats(true);
    const handleOrderPlaced = () => loadStats(true);
    const handleOrderUpdated = () => loadStats(true);
    const handleAttendance = () => loadStats(true);
    const handleProductUpdate = () => loadStats(true);
    const handleFocus = () => loadStats(true);

    window.addEventListener('pos:transaction_completed', handleTxComplete);
    window.addEventListener('order:placed', handleOrderPlaced);
    window.addEventListener('order:status_updated', handleOrderUpdated);
    window.addEventListener('attendance:scanned', handleAttendance);
    window.addEventListener('product:updated', handleProductUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      window.removeEventListener('pos:transaction_completed', handleTxComplete);
      window.removeEventListener('order:placed', handleOrderPlaced);
      window.removeEventListener('order:status_updated', handleOrderUpdated);
      window.removeEventListener('attendance:scanned', handleAttendance);
      window.removeEventListener('product:updated', handleProductUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedPeriod]);

  // Loading state
  if (loading && !stats) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4 min-h-[450px]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">Menghubungkan ke Database...</p>
          <p className="text-xs text-slate-500 mt-1">
            Mengambil data pesanan online, transaksi POS, dan statistik terkini
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Gagal Memuat Dashboard</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            loadStats(false);
          }}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const safeStats = stats || {
    total_orders: 0,
    all_time_orders: 0,
    today_orders: 0,
    month_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    ready_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
    orders_revenue: 0,
    pos_revenue: 0,
    today_revenue: 0,
    month_revenue: 0,
    gross_profit: 0,
    today_gross_profit: 0,
    pos_transactions_count: 0,
    combined_total_orders: 0,
    combined_today_orders: 0,
    combined_month_orders: 0,
    total_products: 0,
    low_stock_count: 0,
    total_employees: 0,
    today_attendance_count: 0,
    daily_revenue_chart: [],
    status_distribution: [],
    top_products: [],
    low_stock_items: [],
    recent_orders: [],
  };

  const periodLabels: Record<PeriodFilter, string> = {
    today: 'Hari Ini',
    '7days': '7 Hari Terakhir',
    this_month: 'Bulan Ini',
    last_month: 'Bulan Lalu',
    this_year: 'Tahun Ini',
    all: 'Semua',
  };

  // Calculate chart max values
  const chartRevenues = safeStats.daily_revenue_chart?.map((d: any) => Number(d.revenue) || 0) || [];
  const maxDailyRevenue = Math.max(...chartRevenues, 50000);

  const chartOrders = safeStats.daily_revenue_chart?.map((d: any) => Number(d.orders_count) || 0) || [];
  const maxDailyOrders = Math.max(...chartOrders, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. TOP BANNER & REAL-TIME CONTROLS */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Database Terhubung
            </span>
            {storeInfo?.name && (
              <span className="text-xs text-slate-300 font-medium">| {storeInfo.name}</span>
            )}
            {refreshing && (
              <RefreshCw className="w-3 h-3 text-emerald-300 animate-spin" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Dashboard Pesanan & Penjualan
          </h2>
          <p className="text-xs text-emerald-100/80 max-w-xl">
            Semua angka dan grafik terhubung langsung secara real-time ke pesanan online pelanggan dan transaksi kasir.
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-xs transition-transform active:scale-95 shadow-sm flex items-center space-x-1.5 cursor-pointer relative"
          >
            <ShoppingBag className="w-4 h-4 text-slate-900" />
            <span>Pesanan Online</span>
            {safeStats.pending_orders > 0 && (
              <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-xs animate-bounce">
                {safeStats.pending_orders} Baru
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-300" />
            <span>Kasir POS</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-teal-300" />
            <span>Laporan</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER PERIODE TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-bold">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filter Periode Data:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(['today', '7days', 'this_month', 'last_month', 'this_year', 'all'] as PeriodFilter[]).map((p) => {
            const isActive = selectedPeriod === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {periodLabels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. UTAMA: ANGKA STATISTIK & PESANAN (REAL-TIME DATABASE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pendapatan / Omzet */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
              Total Pendapatan ({periodLabels[selectedPeriod]})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            Rp {Number(safeStats.total_revenue || 0).toLocaleString('id-ID')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Online: Rp {Number(safeStats.orders_revenue || 0).toLocaleString('id-ID')}</span>
            <span>Kasir: Rp {Number(safeStats.pos_revenue || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Total Pesanan */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-teal-500 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-teal-700 transition-colors">
              Total Pesanan ({periodLabels[selectedPeriod]})
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
            {Number(safeStats.total_orders || 0)}{' '}
            <span className="text-xs font-medium text-slate-500">pesanan online</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>Semua Toko: {Number(safeStats.all_time_orders || 0)}</span>
            <span>+ {Number(safeStats.pos_transactions_count || 0)} POS</span>
          </div>
        </div>

        {/* Pesanan Hari Ini */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-700 transition-colors">
              Pesanan Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-700 tracking-tight">
            {Number(safeStats.today_orders || 0)}{' '}
            <span className="text-xs font-medium text-slate-500">pesanan</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Omzet Hari Ini: Rp {Number(safeStats.today_revenue || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Pesanan Bulan Ini */}
        <div
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-purple-500 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-purple-700 transition-colors">
              Pesanan Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-700 tracking-tight">
            {Number(safeStats.month_orders || 0)}{' '}
            <span className="text-xs font-medium text-slate-500">pesanan</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Omzet Bulan: Rp {Number(safeStats.month_revenue || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* 4. STATUS PESANAN (KARTU STATUS REAL-TIME) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Status Pesanan ({periodLabels[selectedPeriod]})
          </h3>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Buka Manajemen Pesanan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Menunggu */}
          <div
            onClick={() => onNavigate('orders')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              safeStats.pending_orders > 0
                ? 'bg-amber-50/80 border-amber-300 shadow-xs hover:border-amber-400'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Menunggu</span>
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900 mt-2">
              {safeStats.pending_orders}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">Perlu dikonfirmasi</p>
          </div>

          {/* Diproses */}
          <div
            onClick={() => onNavigate('orders')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800">Diproses / Siap</span>
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <ChefHat className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-blue-900 mt-2">
              {safeStats.processing_orders}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">Sedang dimasak / disiapkan</p>
          </div>

          {/* Selesai */}
          <div
            onClick={() => onNavigate('orders')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Selesai</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-2">
              {safeStats.completed_orders}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">Penjualan berhasil</p>
          </div>

          {/* Dibatalkan */}
          <div
            onClick={() => onNavigate('orders')}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Dibatalkan</span>
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                <XCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-900 mt-2">
              {safeStats.cancelled_orders}
            </div>
            <p className="text-[11px] text-rose-600 mt-0.5">Tidak dihitung omzet</p>
          </div>
        </div>
      </div>

      {/* 5. GRAFIK PENJUALAN & PESANAN DARI DATABASE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Grafik Penjualan & Pesanan per Hari
              </h3>
              <p className="text-xs text-slate-500">
                Data dinamis dari database pesanan & transaksi ({periodLabels[selectedPeriod]})
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setChartMode('revenue')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMode === 'revenue'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pendapatan (Rp)
              </button>
              <button
                onClick={() => setChartMode('orders')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMode === 'orders'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jumlah Pesanan
              </button>
            </div>
          </div>

          {/* Bar Chart Visualizer */}
          <div className="h-56 pt-8 flex items-end justify-between gap-2 border-b border-slate-100">
            {(!safeStats.daily_revenue_chart || safeStats.daily_revenue_chart.length === 0) ? (
              <div className="w-full text-center py-16 text-slate-400 text-xs">
                Tidak ada data transaksi pada periode ini.
              </div>
            ) : (
              safeStats.daily_revenue_chart.map((d: any, idx: number) => {
                const rev = Number(d.revenue) || 0;
                const ordCount = Number(d.orders_count) || 0;
                const isRevenueMode = chartMode === 'revenue';

                const val = isRevenueMode ? rev : ordCount;
                const maxVal = isRevenueMode ? maxDailyRevenue : maxDailyOrders;
                const heightPercent = maxVal > 0 ? (val / maxVal) * 100 : 0;
                const isToday = idx === safeStats.daily_revenue_chart.length - 1;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-20 space-y-0.5">
                      <p className="font-extrabold text-emerald-300">
                        {d.label}
                      </p>
                      <p className="font-bold">
                        Rp {rev.toLocaleString('id-ID')}
                      </p>
                      <p className="text-[9px] text-slate-300">
                        Total {ordCount} pesanan ({d.online_orders || 0} online, {d.pos_transactions || 0} kasir)
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {isRevenueMode
                        ? rev >= 1000 ? `${(rev / 1000).toFixed(0)}k` : `${rev}`
                        : `${ordCount}`}
                    </div>

                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                        val > 0
                          ? isToday
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                            : 'bg-emerald-400 hover:bg-emerald-500'
                          : 'bg-slate-200 hover:bg-slate-300'
                      }`}
                      style={{ height: `${Math.max(6, Math.min(100, heightPercent))}%` }}
                    />

                    <span className={`text-[10px] truncate w-full text-center ${isToday ? 'font-black text-emerald-800' : 'text-slate-500'}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span>Hari Ini (Aktif)</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 ml-2" />
              <span>Hari Sebelumnya</span>
            </span>
            <span className="font-bold text-emerald-700">
              Total Periode: Rp {Number(safeStats.total_revenue || 0).toLocaleString('id-ID')} ({safeStats.total_orders} pesanan)
            </span>
          </div>
        </div>

        {/* Status Distribution Chart (1 col) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Distribusi Status Pesanan</h3>
            <span className="text-[10px] text-slate-400 font-medium">{periodLabels[selectedPeriod]}</span>
          </div>

          <div className="space-y-3 pt-2">
            {safeStats.status_distribution?.map((st: any) => {
              const totalOrdersInFilter = safeStats.total_orders || 1;
              const percent = Math.round(((st.count || 0) / (totalOrdersInFilter > 0 ? totalOrdersInFilter : 1)) * 100);

              return (
                <div key={st.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{st.label}</span>
                    <span className="font-mono text-slate-500">
                      {st.count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, percent)}%`,
                        backgroundColor: st.color || '#10b981',
                      }}
                    />
                  </div>
                  {st.total_amount > 0 && (
                    <div className="text-[10px] text-right text-slate-400 font-medium">
                      Nilai: Rp {Number(st.total_amount).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('orders')}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kelola Semua Pesanan Online</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. DAFTAR PESANAN ONLINE TERBARU DARI DATABASE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Pesanan Online Terbaru (Real-Time Database)
            </h3>
            <p className="text-xs text-slate-500">
              Pesanan masuk dari pelanggan online otomatis tersimpan ke database toko Anda
            </p>
          </div>

          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Lihat Semua Pesanan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {(!safeStats.recent_orders || safeStats.recent_orders.length === 0) ? (
          <div className="text-center py-10 text-slate-400 text-xs space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Belum ada pesanan online yang masuk ke toko ini.</p>
            <p className="text-[11px] text-slate-400">
              Pesanan dari katalog online pelanggan akan langsung tampil di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">No. Pesanan</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Jenis / Meja</th>
                  <th className="py-2.5 px-3">Total Pembayaran</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeStats.recent_orders.map((ord: any) => {
                  const statusBadgeClass =
                    ord.status === 'Menunggu'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : ord.status === 'Selesai'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : ord.status === 'Dibatalkan'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300';

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        #{ord.order_number}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{ord.customer_name}</div>
                        <div className="text-[10px] text-slate-400">{ord.customer_phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-700 text-[10px]">
                          {ord.order_type === 'DINE_IN' ? `Makan di Meja ${ord.table_name || '-'}` : ord.order_type === 'DELIVERY' ? 'Pengiriman' : 'Bawa Pulang'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        Rp {Number(ord.total_amount).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusBadgeClass}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(ord.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('orders')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Buka
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. PRODUK TERLARIS & PERINGATAN STOK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">Produk Terlaris Toko</h3>
            <span className="text-[10px] text-slate-400 font-medium">Berdasarkan Total Terjual</span>
          </div>

          {!safeStats.top_products || safeStats.top_products.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada transaksi produk tercatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {safeStats.top_products.map((p: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 line-clamp-1">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">{p.quantity} terjual</span>
                    {p.revenue && (
                      <span className="text-[10px] text-slate-400">
                        Rp {Number(p.revenue).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm">Peringatan: Stok Menipis</h3>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
            >
              Kelola Stok
            </button>
          </div>

          {!safeStats.low_stock_items || safeStats.low_stock_items.length === 0 ? (
            <div className="text-center py-8 text-emerald-600 text-xs font-semibold flex flex-col items-center gap-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span>Semua stok produk dalam kondisi aman!</span>
            </div>
          ) : (
            <div className="space-y-2">
              {safeStats.low_stock_items.slice(0, 4).map((prod: any) => (
                <div
                  key={prod.id}
                  onClick={() => onNavigate('products')}
                  className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
                >
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">{prod.name}</h5>
                    <p className="text-[10px] text-slate-500 font-mono">{prod.barcode || '-'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-700 font-black text-xs rounded-md">
                      Sisa: {prod.stock} {prod.unit || 'pcs'}
                    </span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Min: {prod.min_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
