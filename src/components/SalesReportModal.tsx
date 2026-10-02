import { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  FileDown,
  Eye,
  Filter,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  ShoppingBag,
  Coins,
  TrendingUp,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { exportElementToPdf, printCleanDocument, formatDateIndo } from '../lib/pdfExport.ts';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function SalesReportModal({
  isOpen,
  onClose,
  initialStartDate,
  initialEndDate,
}: SalesReportModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(initialStartDate || todayStr);
  const [endDate, setEndDate] = useState(initialEndDate || todayStr);
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');

  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reportData, setReportData] = useState<any | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSalesData();
    }
  }, [isOpen, startDate, endDate, selectedCashier, selectedPaymentMethod, selectedProduct]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.getDetailedSalesReport({
        start_date: startDate,
        end_date: endDate,
        cashier_id: selectedCashier !== 'ALL' ? selectedCashier : undefined,
        payment_method: selectedPaymentMethod !== 'ALL' ? selectedPaymentMethod : undefined,
        product_id: selectedProduct !== 'ALL' ? selectedProduct : undefined,
      });

      if (res.success) {
        setReportData(res);
      } else {
        setErrorMessage(res.message || 'Gagal memuat rincian laporan penjualan.');
      }
    } catch (err: any) {
      console.error('Error loading sales report:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memuat laporan penjualan.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printableRef.current) return;
    try {
      const htmlContent = printableRef.current.innerHTML;
      const title = `Laporan_Penjualan_${formatDateIndo(startDate)}`;
      printCleanDocument(htmlContent, title);
    } catch (err: any) {
      alert('Gagal mencetak: ' + (err.message || String(err)));
    }
  };

  const handleSavePdf = async () => {
    if (!printableRef.current) return;
    try {
      setExportingPdf(true);
      setErrorMessage(null);
      const filename = `Laporan_Penjualan_${formatDateIndo(startDate)}.pdf`;
      await exportElementToPdf(printableRef.current, {
        filename,
        orientation: 'portrait',
      });
    } catch (err: any) {
      setErrorMessage('Gagal menyimpan PDF: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  const store = reportData?.store || {
    name: 'Kasir UMKM',
    address: 'Indonesia',
    phone: '',
  };

  const summary = reportData?.summary || {
    total_omzet: 0,
    transaction_count: 0,
    total_items_sold: 0,
    total_cogs: 0,
    gross_profit: 0,
  };

  const salesDetails: any[] = reportData?.sales_details || [];
  const cashiers: any[] = reportData?.filter_options?.cashiers || [];
  const products: any[] = reportData?.filter_options?.products || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cetak Laporan Penjualan</h3>
              <p className="text-xs text-slate-500">
                Rincian transaksi item per item: Omzet, Qty, Harga, Subtotal, HPP, dan Laba Kotor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 sm:p-5 bg-slate-100/70 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>Filter Sebelum Mencetak</span>
            </div>
            <button
              onClick={loadSalesData}
              disabled={loading}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Tanggal Mulai */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Tanggal Akhir */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Kasir */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Kasir</label>
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">Semua Kasir</option>
                {cashiers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Metode Pembayaran */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Metode Pembayaran</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="ALL">Semua Metode</option>
                <option value="TUNAI">Tunai (Cash)</option>
                <option value="QRIS">QRIS</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>

            {/* Produk */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Produk</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-emerald-500"
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

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Document Preview Area (Formatted A4 Sheet) */}
        <div className="p-4 sm:p-6 bg-slate-200/80 overflow-y-auto max-h-[60vh] flex flex-col items-center">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-600 font-semibold">Mengambil data penjualan riil dari database...</p>
            </div>
          ) : salesDetails.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-300 p-12 text-center max-w-md w-full space-y-3 shadow-sm">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Tidak ada data untuk periode yang dipilih.</h4>
              <p className="text-xs text-slate-500">
                Belum ada transaksi penjualan yang sesuai dengan rentang tanggal dan kriteria filter ini.
              </p>
            </div>
          ) : (
            <div
              ref={printableRef}
              className="bg-white w-full max-w-[820px] p-8 sm:p-10 shadow-xl border border-slate-300 rounded-sm text-slate-900 font-sans text-xs space-y-5"
              style={{ minHeight: '297mm', boxSizing: 'border-box' }}
            >
              {/* Header Toko */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 m-0">
                    {store.name}
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-sm">{store.address || 'Alamat Toko'}</p>
                  {store.phone && (
                    <p className="text-[11px] text-slate-600">Telepon: {store.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3.5 py-1 text-xs font-black uppercase tracking-wider rounded-sm">
                    LAPORAN PENJUALAN
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold mt-1.5">
                    Periode: {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}
                  </p>
                  <p className="text-[10px] text-slate-400">Dicetak: {new Date().toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* KPI Summary Block: Total Omzet, Jumlah Transaksi, Total Barang Terjual, Total HPP, Laba Kotor */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Omzet</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5 whitespace-nowrap">
                    Rp {Number(summary.total_omzet || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Trx</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    {summary.transaction_count} Struk
                  </span>
                </div>
                <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Barang Terjual</span>
                  <span className="text-sm font-black text-slate-900 block mt-0.5">
                    {summary.total_items_sold} Pcs
                  </span>
                </div>
                <div className="border border-slate-300 bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total HPP</span>
                  <span className="text-sm font-black text-slate-700 block mt-0.5 whitespace-nowrap">
                    Rp {Number(summary.total_cogs || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="border border-emerald-300 bg-emerald-50/70 p-2.5 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Laba Kotor</span>
                  <span className="text-sm font-black text-emerald-700 block mt-0.5 whitespace-nowrap">
                    Rp {Number(summary.gross_profit || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Rincian Penjualan Table: Tanggal | No Transaksi | Produk | Qty | Harga | Subtotal | HPP | Laba */}
              <div className="border border-slate-300 overflow-hidden">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                      <th className="p-2 border-r border-slate-800 w-24">Tanggal</th>
                      <th className="p-2 border-r border-slate-800 w-28">No. Transaksi</th>
                      <th className="p-2 border-r border-slate-800">Produk</th>
                      <th className="p-2 border-r border-slate-800 text-center w-12">Qty</th>
                      <th className="p-2 border-r border-slate-800 text-right w-20">Harga</th>
                      <th className="p-2 border-r border-slate-800 text-right w-24">Subtotal</th>
                      <th className="p-2 border-r border-slate-800 text-right w-20">HPP</th>
                      <th className="p-2 text-right w-20">Laba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {salesDetails.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2 border-r border-slate-200 whitespace-nowrap text-slate-600 font-mono text-[10px]">
                          {item.date ? item.date.replace('T', ' ').substring(0, 16) : '-'}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap text-[10px]">
                          {item.transaction_number}
                          {item.payment_method && (
                            <span className="block text-[8px] text-slate-400">{item.payment_method}</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                          {item.product_name}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right text-slate-700 whitespace-nowrap font-mono">
                          Rp {Number(item.price).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-extrabold text-slate-900 whitespace-nowrap font-mono">
                          Rp {Number(item.subtotal).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right text-slate-600 whitespace-nowrap font-mono">
                          Rp {Number(item.cogs).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2 text-right font-bold text-emerald-700 whitespace-nowrap font-mono">
                          Rp {Number(item.profit).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-[11px] border-t-2 border-slate-900">
                      <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-slate-800">
                        TOTAL REKAPITULASI:
                      </td>
                      <td className="p-2.5 text-center text-slate-900 font-black">
                        {summary.total_items_sold}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-right">-</td>
                      <td className="p-2.5 text-right text-slate-900 whitespace-nowrap font-mono">
                        Rp {Number(summary.total_omzet || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-right text-slate-700 whitespace-nowrap font-mono">
                        Rp {Number(summary.total_cogs || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-right text-emerald-700 whitespace-nowrap font-mono">
                        Rp {Number(summary.gross_profit || 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-8 mt-6 text-center text-xs text-slate-600">
                <div>
                  <p className="mb-14">Penanggung Jawab Kasir,</p>
                  <p className="font-bold border-t border-slate-400 mx-10 pt-1 text-slate-900">
                    Kasir Toko
                  </p>
                </div>
                <div>
                  <p className="mb-14">Mengetahui & Menyetujui,</p>
                  <p className="font-bold border-t border-slate-400 mx-10 pt-1 text-slate-900">
                    Pemilik / Manajemen ({store.name})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Format cetak standar A4 siap kirim ke printer fisik atau simpan PDF resmi.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              onClick={handleSavePdf}
              disabled={loading || salesDetails.length === 0 || exportingPdf}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Simpan sebagai file PDF asli ke perangkat"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportingPdf ? 'Membuat PDF...' : 'Simpan sebagai PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || salesDetails.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Cetak langsung ke printer fisik"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
