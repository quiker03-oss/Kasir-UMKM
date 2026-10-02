import { useState, useEffect, useRef } from 'react';
import {
  Printer,
  X,
  FileDown,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Share2,
  Check,
  RefreshCw,
  AlertCircle,
  User,
  Clock,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { terbilangRupiah } from '../lib/printer.ts';
import { exportElementToPdf, printCleanDocument } from '../lib/pdfExport.ts';

export interface SalarySlipData {
  payroll_number: string;
  period_month: number;
  period_year: number;
  paid_at?: string;
  payment_status?: string;
  employee_id?: string;
  employee_name: string;
  position: string;
  barcode_id?: string;
  attendance_count: number;
  // PENDAPATAN
  base_salary: number;
  allowance?: number; // Tunjangan
  bonus: number; // Bonus
  overtime: number; // Lembur
  other_income?: number; // Pendapatan lainnya
  // POTONGAN
  deductions: number; // Potongan
  cash_advance?: number; // Kasbon
  other_deductions?: number; // Potongan lainnya
  // TOTAL GAJI
  net_salary: number;
  notes?: string;
  store?: {
    name: string;
    logo_url?: string;
    address?: string;
    phone?: string;
  };
}

interface SalarySlipPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipData: SalarySlipData | null;
  allSlips?: SalarySlipData[];
  initialEmployeeId?: string;
  initialMonth?: number;
  initialYear?: number;
}

const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default function SalarySlipPrintModal({
  isOpen,
  onClose,
  slipData: propSlipData,
  allSlips = [],
  initialEmployeeId,
  initialMonth,
  initialYear,
}: SalarySlipPrintModalProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || propSlipData?.period_month || now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || propSlipData?.period_year || now.getFullYear());
  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId || propSlipData?.employee_id || '');

  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [currentSlip, setCurrentSlip] = useState<SalarySlipData | null>(propSlipData);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const printableRef = useRef<HTMLDivElement>(null);

  // Sync when propSlipData changes
  useEffect(() => {
    if (propSlipData) {
      setCurrentSlip(propSlipData);
      setSelectedMonth(propSlipData.period_month);
      setSelectedYear(propSlipData.period_year);
      if (propSlipData.employee_id) setSelectedEmpId(propSlipData.employee_id);
    }
  }, [propSlipData]);

  // Load employee list and slip if opened without direct slipData or when filter changes
  useEffect(() => {
    if (isOpen) {
      loadSlipFromDb();
    }
  }, [isOpen, selectedMonth, selectedYear, selectedEmpId]);

  const loadSlipFromDb = async () => {
    // If propSlipData is provided and hasn't changed filter, keep it
    if (propSlipData && !selectedEmpId) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.querySalarySlip({
        employee_id: selectedEmpId || undefined,
        period_month: selectedMonth,
        period_year: selectedYear,
      });

      if (res.success) {
        if (res.employees) {
          setEmployeesList(res.employees);
          if (!selectedEmpId && res.employees.length > 0) {
            setSelectedEmpId(res.employees[0].id);
          }
        }
        if (res.slip) {
          setCurrentSlip(res.slip);
        } else if (!res.employees || res.employees.length === 0) {
          setErrorMessage('Tidak ada data karyawan di toko ini.');
        } else {
          setErrorMessage('Tidak ada data penggajian untuk periode yang dipilih.');
        }
      } else {
        setErrorMessage(res.message || 'Gagal memuat slip gaji dari database.');
      }
    } catch (err: any) {
      console.error('Failed to load salary slip:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memuat slip gaji.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printableRef.current || !currentSlip) return;
    try {
      const html = printableRef.current.innerHTML;
      const cleanEmpName = currentSlip.employee_name.replace(/\s+/g, '_');
      const monthStr = MONTH_NAMES[currentSlip.period_month] || currentSlip.period_month;
      const title = `Slip_Gaji_${cleanEmpName}_${monthStr}_${currentSlip.period_year}`;
      printCleanDocument(html, title);
    } catch (err: any) {
      alert('Gagal mencetak: ' + (err.message || String(err)));
    }
  };

  const handleSavePdf = async () => {
    if (!printableRef.current || !currentSlip) return;
    try {
      setExportingPdf(true);
      setErrorMessage(null);
      const cleanEmpName = currentSlip.employee_name.replace(/[^a-zA-Z0-9]/g, '_');
      const monthStr = MONTH_NAMES[currentSlip.period_month] || currentSlip.period_month;
      // Auto file name pattern: Slip_Gaji_Ahmad_September_2026.pdf
      const filename = `Slip_Gaji_${cleanEmpName}_${monthStr}_${currentSlip.period_year}.pdf`;

      await exportElementToPdf(printableRef.current, {
        filename,
        orientation: 'portrait',
      });
    } catch (err: any) {
      setErrorMessage('Gagal membuat PDF: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyWhatsapp = () => {
    if (!currentSlip) return;
    const storeName = currentSlip.store?.name || 'Kasir UMKM';
    const periodStr = `${MONTH_NAMES[currentSlip.period_month]} ${currentSlip.period_year}`;
    const terbilang = terbilangRupiah(currentSlip.net_salary);

    const text = `*SLIP GAJI KARYAWAN — ${storeName}*
Periode: ${periodStr}
No. Slip: ${currentSlip.payroll_number}

*DATA KARYAWAN:*
• Nama: *${currentSlip.employee_name}*
• Jabatan: ${currentSlip.position}
• ID Karyawan: ${currentSlip.barcode_id || currentSlip.employee_id || '-'}
• Kehadiran: ${currentSlip.attendance_count} Hari Kerja

*PENDAPATAN:*
• Gaji Pokok: Rp ${Number(currentSlip.base_salary).toLocaleString('id-ID')}
${(currentSlip.allowance || 0) > 0 ? `• Tunjangan: + Rp ${Number(currentSlip.allowance).toLocaleString('id-ID')}\n` : ''}${Number(currentSlip.bonus || 0) > 0 ? `• Bonus: + Rp ${Number(currentSlip.bonus).toLocaleString('id-ID')}\n` : ''}${Number(currentSlip.overtime || 0) > 0 ? `• Lembur: + Rp ${Number(currentSlip.overtime).toLocaleString('id-ID')}\n` : ''}${(currentSlip.other_income || 0) > 0 ? `• Pendapatan Lainnya: + Rp ${Number(currentSlip.other_income).toLocaleString('id-ID')}\n` : ''}
*POTONGAN:*
${Number(currentSlip.deductions || 0) > 0 ? `• Potongan: - Rp ${Number(currentSlip.deductions).toLocaleString('id-ID')}\n` : ''}${(currentSlip.cash_advance || 0) > 0 ? `• Kasbon: - Rp ${Number(currentSlip.cash_advance).toLocaleString('id-ID')}\n` : ''}${(currentSlip.other_deductions || 0) > 0 ? `• Potongan Lainnya: - Rp ${Number(currentSlip.other_deductions).toLocaleString('id-ID')}\n` : ''}
*TOTAL GAJI (Gaji Bersih):*
👉 *Rp ${Number(currentSlip.net_salary).toLocaleString('id-ID')}*
_${terbilang}_

Tanggal Pembayaran: ${currentSlip.paid_at ? new Date(currentSlip.paid_at).toLocaleDateString('id-ID') : '-'}
Status: ${currentSlip.payment_status || 'Dibayar'}
${currentSlip.notes ? `Catatan: ${currentSlip.notes}\n` : ''}
Terima kasih atas kerja keras dan kontribusi Anda! 🙏`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  if (!isOpen) return null;

  const store = currentSlip?.store || {
    name: 'Kasir UMKM',
    address: 'Indonesia',
    phone: '',
  };

  const periodString = currentSlip
    ? `${MONTH_NAMES[currentSlip.period_month] || currentSlip.period_month} ${currentSlip.period_year}`
    : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  const paymentDate = currentSlip?.paid_at
    ? new Date(currentSlip.paid_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const paymentStatus = currentSlip?.payment_status || 'Dibayar';

  // Kalkulasi Pendapatan & Potongan
  const baseSalary = Number(currentSlip?.base_salary || 0);
  const allowance = Number(currentSlip?.allowance || 0);
  const bonus = Number(currentSlip?.bonus || 0);
  const overtime = Number(currentSlip?.overtime || 0);
  const otherIncome = Number(currentSlip?.other_income || 0);
  const totalPendapatan = baseSalary + allowance + bonus + overtime + otherIncome;

  const deductions = Number(currentSlip?.deductions || 0);
  const cashAdvance = Number(currentSlip?.cash_advance || 0);
  const otherDeductions = Number(currentSlip?.other_deductions || 0);
  const totalPotongan = deductions + cashAdvance + otherDeductions;

  const netSalary = Number(currentSlip?.net_salary || totalPendapatan - totalPotongan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cetak Slip Gaji Karyawan</h3>
              <p className="text-xs text-slate-500">
                Data resmi dari database: Pendapatan, Potongan, Gaji Bersih, dan Terbilang Rupiah
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

        {/* Filter / Pemilihan Karyawan & Periode Gaji */}
        <div className="p-4 sm:p-5 bg-slate-100/70 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Pilih Karyawan & Periode Penggajian</span>
            </div>
            {currentSlip && (
              <button
                onClick={handleCopyWhatsapp}
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                title="Salin rincian slip untuk dikirim ke WhatsApp"
              >
                {copiedWhatsapp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Salin Format WA</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Karyawan Dropdown */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pilih Karyawan</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
              >
                {employeesList.length === 0 && currentSlip && (
                  <option value={currentSlip.employee_id || ''}>
                    {currentSlip.employee_name} ({currentSlip.position})
                  </option>
                )}
                {employeesList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.position}
                  </option>
                ))}
              </select>
            </div>

            {/* Periode Bulan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bulan Gaji</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
              >
                {MONTH_NAMES.slice(1).map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Periode Tahun */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tahun Gaji</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
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

        {/* Document Preview (A4 / Neat Slip Gaji Layout) */}
        <div className="p-4 sm:p-6 bg-slate-200/80 overflow-y-auto max-h-[60vh] flex flex-col items-center">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs text-slate-600 font-semibold">Mengambil data slip gaji dari database...</p>
            </div>
          ) : !currentSlip ? (
            <div className="bg-white rounded-2xl border border-slate-300 p-12 text-center max-w-md w-full space-y-3 shadow-sm">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Tidak ada data untuk periode yang dipilih.</h4>
              <p className="text-xs text-slate-500">
                Pilih karyawan atau periode penggajian lain pada opsi di atas.
              </p>
            </div>
          ) : (
            <div
              ref={printableRef}
              className="bg-white w-full max-w-[620px] p-6 sm:p-8 shadow-xl border border-slate-300 rounded-sm text-slate-900 font-sans text-xs space-y-4"
              style={{ boxSizing: 'border-box' }}
            >
              {/* SLIP GAJI KARYAWAN HEADER */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div className="flex items-center space-x-3">
                  {store.logo_url && (
                    <img
                      src={store.logo_url}
                      alt="Logo"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <div>
                    <h1 className="text-base font-black uppercase tracking-tight text-slate-900 m-0">
                      {store.name}
                    </h1>
                    <p className="text-[11px] text-slate-600 mt-0.5">{store.address || 'Alamat Toko'}</p>
                    {store.phone && (
                      <p className="text-[10px] text-slate-500">Telp / WA: {store.phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white px-3 py-1 text-xs font-black uppercase tracking-wider rounded-sm">
                    SLIP GAJI KARYAWAN
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 mt-1">Periode: {periodString}</p>
                  <p className="text-[10px] font-mono text-slate-500">No: {currentSlip.payroll_number}</p>
                </div>
              </div>

              {/* Data Karyawan */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px] block">Nama Karyawan:</span>
                  <span className="font-bold text-slate-900 text-xs">{currentSlip.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Jabatan:</span>
                  <span className="font-semibold text-slate-800">{currentSlip.position}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ID Karyawan:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {currentSlip.barcode_id || currentSlip.employee_id || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Kehadiran (Absensi):</span>
                  <span className="font-bold text-emerald-700">{currentSlip.attendance_count} Hari Kerja</span>
                </div>
              </div>

              {/* PENDAPATAN SECTION */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider flex justify-between">
                  <span>PENDAPATAN</span>
                  <span>JUMLAH</span>
                </div>
                <div className="p-3 space-y-1.5 bg-white text-[11px]">
                  <div className="flex justify-between text-slate-800">
                    <span>• Gaji Pokok</span>
                    <span className="font-semibold font-mono">Rp {baseSalary.toLocaleString('id-ID')}</span>
                  </div>
                  {allowance > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>• Tunjangan</span>
                      <span className="font-semibold font-mono">+ Rp {allowance.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {bonus > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>• Bonus</span>
                      <span className="font-semibold font-mono">+ Rp {bonus.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {overtime > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>• Lembur</span>
                      <span className="font-semibold font-mono">+ Rp {overtime.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {otherIncome > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>• Pendapatan lainnya</span>
                      <span className="font-semibold font-mono">+ Rp {otherIncome.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                    <span>Total Pendapatan</span>
                    <span className="text-emerald-700 font-mono">Rp {totalPendapatan.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* POTONGAN SECTION */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-rose-900 text-white px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider flex justify-between">
                  <span>POTONGAN</span>
                  <span>JUMLAH</span>
                </div>
                <div className="p-3 space-y-1.5 bg-white text-[11px]">
                  {deductions > 0 ? (
                    <div className="flex justify-between text-rose-700">
                      <span>• Potongan</span>
                      <span className="font-semibold font-mono">- Rp {deductions.toLocaleString('id-ID')}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-500 italic">
                      <span>• Potongan</span>
                      <span className="font-mono">Rp 0</span>
                    </div>
                  )}
                  {cashAdvance > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>• Kasbon</span>
                      <span className="font-semibold font-mono">- Rp {cashAdvance.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {otherDeductions > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>• Potongan lainnya</span>
                      <span className="font-semibold font-mono">- Rp {otherDeductions.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                    <span>Total Potongan</span>
                    <span className="text-rose-700 font-mono">- Rp {totalPotongan.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* TOTAL GAJI (Gaji Bersih / Take Home Pay) */}
              <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-300 uppercase tracking-wider block font-bold">
                    TOTAL GAJI (GAJI BERSIH)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">Take Home Pay</span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono tracking-tight">
                    Rp {netSalary.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Terbilang */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-950">
                <span className="font-bold">Terbilang: </span>
                <span className="italic font-medium">#{terbilangRupiah(netSalary)}#</span>
              </div>

              {/* Info Tambahan */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Tanggal Pembayaran: <b>{paymentDate}</b></span>
                <span>Status Pembayaran: <b className="text-emerald-700 uppercase">{paymentStatus}</b></span>
              </div>

              {currentSlip.notes && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-slate-600 italic">
                  Catatan: {currentSlip.notes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-center pt-4 border-t border-slate-300 text-[11px]">
                <div>
                  <p className="text-slate-500 mb-12">Penerima (Karyawan),</p>
                  <p className="font-bold border-t border-slate-400 mx-6 pt-1 text-slate-900">
                    {currentSlip.employee_name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-12">
                    {paymentDate}
                    <br />
                    Pengelola Toko,
                  </p>
                  <p className="font-bold border-t border-slate-400 mx-6 pt-1 text-slate-900">
                    {store.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Format slip rapi cocok untuk printer thermal atau printer A4/Letter standar.
          </p>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              onClick={handleSavePdf}
              disabled={loading || !currentSlip || exportingPdf}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Simpan slip gaji sebagai file PDF asli"
            >
              <FileDown className="w-4 h-4" />
              <span>{exportingPdf ? 'Membuat PDF...' : 'Simpan sebagai PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading || !currentSlip}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Cetak slip gaji langsung ke printer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
