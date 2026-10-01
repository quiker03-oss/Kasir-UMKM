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
  Info,
} from 'lucide-react';
import { api } from '../lib/api.ts';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      }
      const today = getLocalDateStr();
      const res = await api.getDashboardStats({ today });
      if (!isMountedRef.current) return;

      if (res.success && res.stats) {
        setStats(res.stats);
        setError(null);
      } else {
        if (!isBackground) {
          setError(res.message || 'Gagal memuat data statistik dashboard.');
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Dashboard load error:', err);
      if (!isBackground) {
        setError(err.message || 'Koneksi ke server database gagal.');
      }
    } finally {
      if (isMountedRef.current && !isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadStats(false);

    // Auto-refresh poll every 4 seconds so any new transaction or barcode scan immediately updates
    const pollInterval = setInterval(() => {
      loadStats(true);
    }, 4000);

    // Event-driven immediate updates
    const handleTxComplete = () => loadStats(true);
    const handleAttendance = () => loadStats(true);
    const handleProductUpdate = () => loadStats(true);
    const handleFocus = () => loadStats(true);

    window.addEventListener('pos:transaction_completed', handleTxComplete);
    window.addEventListener('attendance:scanned', handleAttendance);
    window.addEventListener('product:updated', handleProductUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
      window.removeEventListener('pos:transaction_completed', handleTxComplete);
      window.removeEventListener('attendance:scanned', handleAttendance);
      window.removeEventListener('product:updated', handleProductUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Memuat data transaksi & operasional...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800">Gagal Terhubung ke Database</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            loadStats(false);
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const safeStats = stats || {
    today_revenue: 0,
    today_transactions: 0,
    today_gross_profit: 0,
    today_cogs: 0,
    has_unspecified_cogs: false,
    low_stock_count: 0,
    today_attendance_count: 0,
    total_employees: 0,
    new_orders_count: 0,
    daily_revenue_chart: [],
    top_products: [],
    low_stock_items: [],
  };

  const chartRevenues = safeStats.daily_revenue_chart?.map((d: any) => Number(d.revenue) || 0) || [];
  const maxDailyRevenue = Math.max(...chartRevenues, 50000);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Quick Shortcuts */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:flex-center justify-between gap-4">
        <div>
          <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">
            Ringkasan Usaha Hari Ini
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-1">Dashboard KASIR UMKM</h2>
          <p className="text-xs text-emerald-100 mt-1">
            Pantau transaksi kasir, stok, absensi karyawan, dan pesanan pelanggan secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-extrabold shadow-xs transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Buka Kasir POS</span>
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="px-4 py-2.5 bg-emerald-600/60 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-white/20 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Scan Absensi</span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2.5 bg-emerald-600/60 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 border border-white/20 relative cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Pesanan Online</span>
            {safeStats.new_orders_count > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {safeStats.new_orders_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Omzet Hari Ini */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-sm transition-all group"
          title="Klik untuk melihat riwayat dan rincian transaksi hari ini"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
              Omzet Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Rp {Number(safeStats.today_revenue || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-500">
            {Number(safeStats.today_transactions || 0)} Transaksi kasir
          </p>
        </div>

        {/* 2. Laba Kotor Hari Ini */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-teal-400 hover:shadow-sm transition-all group"
          title="Klik untuk membuka laporan keuangan laba kotor & HPP"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-teal-700 transition-colors">
              Laba Kotor Hari Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-teal-700 tracking-tight">
            Rp {Number(safeStats.today_gross_profit || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Omzet dikurangi HPP</span>
            {safeStats.has_unspecified_cogs && (
              <span className="text-[10px] text-amber-600 font-bold" title="Beberapa item transaksi belum memiliki HPP produk">
                *HPP parsial
              </span>
            )}
          </p>
        </div>

        {/* 3. Stok Menipis */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-amber-400 hover:shadow-sm transition-all group"
          title="Klik untuk membuka daftar produk yang perlu restock"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition-colors">
              Stok Menipis
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                safeStats.low_stock_count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {Number(safeStats.low_stock_count || 0)}{' '}
            <span className="text-xs font-normal text-slate-500">produk</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium">Perlu segera restock</p>
        </div>

        {/* 4. Absensi Karyawan Hari Ini */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
          title="Klik untuk membuka halaman absensi scan barcode karyawan"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-700 transition-colors">
              Absensi Karyawan
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center transition-transform group-hover:scale-105">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {Number(safeStats.today_attendance_count || 0)} / {Number(safeStats.total_employees || 0)}{' '}
            <span className="text-xs font-normal text-slate-500">Hadir</span>
          </div>
          <p className="text-[11px] text-slate-500">Berdasarkan scan barcode</p>
        </div>
      </div>

      {/* 5. 7-Days Revenue Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Tren Pendapatan 7 Hari Terakhir</h3>
              <p className="text-xs text-slate-500">Grafik omzet harian transaksi kasir</p>
            </div>
            {/* 6. Tombol Laporan Lengkap */}
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer hover:underline"
            >
              <span>Laporan Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar Chart Visual */}
          <div className="h-48 pt-6 flex items-end justify-between gap-2 border-b border-slate-100">
            {safeStats.daily_revenue_chart?.map((d: any, idx: number) => {
              const rev = Number(d.revenue) || 0;
              const heightPercent = maxDailyRevenue > 0 ? (rev / maxDailyRevenue) * 100 : 0;
              const isToday = idx === safeStats.daily_revenue_chart.length - 1;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-10">
                    <p className="font-bold">Rp {rev.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-slate-300">{d.transactions || 0} transaksi</p>
                  </div>

                  <div className="text-[10px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {rev >= 1000 ? `${(rev / 1000).toFixed(0)}k` : rev > 0 ? `${rev}` : '0'}
                  </div>

                  <div
                    className={`w-full max-w-[40px] rounded-t-lg transition-all ${
                      rev > 0
                        ? isToday
                          ? 'bg-emerald-500 hover:bg-emerald-600'
                          : 'bg-emerald-400 hover:bg-emerald-500'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                    style={{ height: `${Math.max(8, heightPercent)}%` }}
                  />
                  <span className={`text-[10px] truncate w-full text-center ${isToday ? 'font-bold text-emerald-800' : 'text-slate-500'}`}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Produk Terlaris</h3>
            <span className="text-[10px] text-slate-400 font-medium">Berdasarkan Qty</span>
          </div>

          {!safeStats.top_products || safeStats.top_products.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada data transaksi produk.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {safeStats.top_products.map((p: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block">{p.quantity} terjual</span>
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
      </div>

      {/* Low Stock Items Warning Table */}
      {safeStats.low_stock_items && safeStats.low_stock_items.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="font-bold text-sm">Peringatan: Stok Produk Menipis</h4>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-bold text-amber-800 hover:underline cursor-pointer"
            >
              Lihat Semua Stok
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {safeStats.low_stock_items.map((prod: any) => (
              <div
                key={prod.id}
                onClick={() => onNavigate('products')}
                className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-2xs cursor-pointer hover:border-amber-400 transition-colors"
              >
                <div>
                  <h5 className="font-bold text-xs text-slate-800">{prod.name}</h5>
                  <p className="text-[10px] text-slate-500 font-mono">{prod.barcode}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-xs rounded-md">
                    Sisa: {prod.stock} {prod.unit || 'pcs'}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">Min: {prod.min_stock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
