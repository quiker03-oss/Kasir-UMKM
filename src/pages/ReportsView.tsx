import { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  Printer,
  Calendar,
  RefreshCw,
  Award,
  Filter,
  User,
  Package,
  Layers,
  ShoppingBag,
  Coins,
  Wallet,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import FinancialReportModal from '../components/FinancialReportModal.tsx';
import SalesReportModal from '../components/SalesReportModal.tsx';

export default function ReportsView() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  // Print Modals
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);

  // Filter States
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');

  useEffect(() => {
    loadReport();
  }, [startDate, endDate, selectedCashier, selectedPaymentMethod, selectedProduct]);

  const setPresetRange = (type: 'today' | 'week' | 'month') => {
    setPreset(type);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const [finRes, topRes] = await Promise.all([
        api.getFinanceReport({
          start_date: startDate,
          end_date: endDate,
          cashier_id: selectedCashier !== 'ALL' ? selectedCashier : undefined,
          payment_method: selectedPaymentMethod !== 'ALL' ? selectedPaymentMethod : undefined,
          product_id: selectedProduct !== 'ALL' ? selectedProduct : undefined,
        }),
        api.getTopProducts({
          start_date: startDate,
          end_date: endDate,
          limit: 10,
        }),
      ]);

      if (finRes.success) {
        setReport(finRes);
      }
      if (topRes.success) {
        setTopProducts(topRes.top_products || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!report?.summary) return;
    const s = report.summary;
    const rows = [
      ['LAPORAN LENGKAP PENJUALAN & KEUANGAN KASIR UMKM'],
      ['Periode', `${startDate} s/d ${endDate}`],
      ['Filter Kasir', selectedCashier],
      ['Filter Metode', selectedPaymentMethod],
      ['Tanggal Cetak', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN INDIKATOR UTAMA', 'NILAI / JUMLAH'],
      ['Total Omzet (Penjualan)', `Rp ${Number(s.omzet || 0).toLocaleString('id-ID')}`],
      ['Total Transaksi', `${Number(s.transaction_count || 0)} Transaksi`],
      ['Total HPP (Harga Pokok Penjualan)', `Rp ${Number(s.total_cogs || 0).toLocaleString('id-ID')}`],
      ['Laba Kotor', `Rp ${Number(s.gross_profit || 0).toLocaleString('id-ID')}`],
      ['Jumlah Barang Terjual', `${Number(s.total_items_sold || 0)} Pcs`],
      ['Transaksi Tunai', `Rp ${Number(s.cash_transactions?.total || 0).toLocaleString('id-ID')} (${s.cash_transactions?.count || 0} Trx)`],
      ['Transaksi Non-Tunai (QRIS & Transfer)', `Rp ${Number(s.non_cash_transactions?.total || 0).toLocaleString('id-ID')} (${s.non_cash_transactions?.count || 0} Trx)`],
      [],
      ['DAFTAR TRANSAKSI'],
      ['No. Transaksi', 'Waktu', 'Kasir', 'Pelanggan', 'Metode', 'Total', 'Item'],
      ...(report.transactions || []).map((t: any) => [
        t.transaction_number,
        t.created_at,
        t.cashier_name,
        t.customer_name || 'Pelanggan Umum',
        t.payment_method,
        t.total_amount,
        t.items_summary || '-',
      ]),
      [],
      ['PRODUK TERLARIS', 'TERJUAL (QTY)', 'TOTAL OMZET'],
      ...topProducts.map((p) => [p.product_name, p.total_quantity, p.total_revenue]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      rows
        .map((e) =>
          e
            .map((val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kasir_UMKM_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const s = report?.summary || {
    omzet: 0,
    transaction_count: 0,
    total_cogs: 0,
    gross_profit: 0,
    total_items_sold: 0,
    cash_transactions: { count: 0, total: 0 },
    non_cash_transactions: { count: 0, total: 0 },
  };

  const cashiers = report?.filter_options?.cashiers || [];
  const products = report?.filter_options?.products || [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Laporan Lengkap Penjualan & Keuangan</h2>
          <p className="text-xs text-slate-500">
            Analisis omzet, HPP, laba kotor, metode pembayaran, dan rincian transaksi kasir real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel/CSV</span>
          </button>
          <button
            onClick={() => setIsFinancialModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Buka pratinjau dan cetak Laporan Keuangan & Buku Kas"
          >
            <Wallet className="w-4 h-4" />
            <span>Cetak Laporan Keuangan</span>
          </button>
          <button
            onClick={() => setIsSalesModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Buka pratinjau dan cetak Laporan Rincian Penjualan Produk"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Penjualan</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Tanggal Mulai, Tanggal Akhir, Kasir, Metode Pembayaran, Produk */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Laporan</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setPresetRange('today')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                preset === 'today'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPresetRange('week')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                preset === 'week'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setPresetRange('month')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                preset === 'month'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Tanggal Mulai */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 block">Tanggal Mulai</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setPreset('custom');
                  setStartDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Tanggal Akhir */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 block">Tanggal Akhir</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setPreset('custom');
                  setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Filter Kasir */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 block">Kasir</label>
            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Kasir</option>
              {cashiers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || c.username}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Metode Pembayaran */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 block">Metode Pembayaran</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Metode</option>
              <option value="TUNAI">Tunai (Cash)</option>
              <option value="QRIS">QRIS</option>
              <option value="TRANSFER">Transfer Bank</option>
            </select>
          </div>

          {/* Filter Produk */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 block">Produk</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Produk</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards: Total Omzet, Total Transaksi, Total HPP, Laba Kotor, Jumlah Barang Terjual, Transaksi Tunai, Transaksi Non-Tunai */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Omzet */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Omzet</span>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Rp {Number(s.omzet || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold">Penjualan kotor</p>
        </div>

        {/* 2. Total Transaksi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Total Transaksi</span>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {Number(s.transaction_count || 0)}
          </div>
          <p className="text-[10px] text-slate-500">Struk kasir selesai</p>
        </div>

        {/* 3. Total HPP */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Total HPP</span>
          <div className="text-base sm:text-lg font-black text-slate-700 tracking-tight">
            Rp {Number(s.total_cogs || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">Modal produk terjual</p>
        </div>

        {/* 4. Laba Kotor */}
        <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-2xs space-y-1">
          <span className="text-[11px] text-teal-800 font-semibold block">Laba Kotor</span>
          <div className="text-base sm:text-lg font-black text-teal-700 tracking-tight">
            Rp {Number(s.gross_profit || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-teal-600 font-medium">Omzet - HPP</p>
        </div>

        {/* 5. Jumlah Barang Terjual */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Barang Terjual</span>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {Number(s.total_items_sold || 0)}{' '}
            <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <p className="text-[10px] text-slate-500">Total kuantitas item</p>
        </div>

        {/* 6. Transaksi Tunai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Transaksi Tunai</span>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Rp {Number(s.cash_transactions?.total || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">{s.cash_transactions?.count || 0} Trx tunai</p>
        </div>

        {/* 7. Transaksi Non-Tunai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-semibold block">Transaksi Non-Tunai</span>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Rp {Number(s.non_cash_transactions?.total || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-[10px] text-slate-500">{s.non_cash_transactions?.count || 0} Trx QRIS/TF</p>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Detail List (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Daftar Transaksi Kasir</span>
            </h3>
            <span className="text-xs text-slate-500">
              {report?.transactions?.length || 0} transaksi ditampilkan
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : !report?.transactions || report.transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada data transaksi yang cocok dengan filter tanggal dan kasir ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold">No. Transaksi</th>
                    <th className="py-2.5 px-3 font-semibold">Waktu</th>
                    <th className="py-2.5 px-3 font-semibold">Kasir</th>
                    <th className="py-2.5 px-3 font-semibold">Metode</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.transactions.map((trx: any) => (
                    <tr key={trx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {trx.transaction_number}
                        {trx.items_summary && (
                          <span className="block text-[10px] text-slate-400 font-sans font-normal truncate max-w-[200px]">
                            {trx.items_summary}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {trx.created_at ? trx.created_at.replace('T', ' ').substring(0, 16) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {trx.cashier_name || 'Kasir'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            trx.payment_method === 'TUNAI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : trx.payment_method === 'QRIS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {trx.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 text-right whitespace-nowrap">
                        Rp {Number(trx.total_amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products (1 col) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Produk Terlaris Periode Ini</h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada transaksi di rentang tanggal ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between first:pt-0">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 line-clamp-1">{p.product_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Omzet: Rp {Number(p.total_revenue).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {p.total_quantity} Terjual
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 1. Modal Cetak Laporan Keuangan */}
      <FinancialReportModal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />

      {/* 2. Modal Cetak Laporan Penjualan */}
      <SalesReportModal
        isOpen={isSalesModalOpen}
        onClose={() => setIsSalesModalOpen(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
}
