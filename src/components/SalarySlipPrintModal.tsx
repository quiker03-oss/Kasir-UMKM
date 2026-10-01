import { useState } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Share2,
} from 'lucide-react';
import { printHtmlDirect, terbilangRupiah } from '../lib/printer.ts';

export interface SalarySlipData {
  payroll_number: string;
  period_month: number;
  period_year: number;
  paid_at?: string;
  employee_id?: string;
  employee_name: string;
  position: string;
  barcode_id?: string;
  attendance_count: number;
  base_salary: number;
  bonus: number;
  overtime: number;
  deductions: number;
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
  slipData,
  allSlips = [],
}: SalarySlipPrintModalProps) {
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>(
    allSlips.length > 1 && !slipData ? 'batch' : 'single'
  );

  if (!isOpen || (!slipData && allSlips.length === 0)) return null;

  const currentSlip = slipData || allSlips[0];
  const targetSlips = activeTab === 'single' ? (currentSlip ? [currentSlip] : []) : allSlips;

  const store = currentSlip.store || {
    name: 'KASIR UMKM',
    address: 'Indonesia',
    phone: '',
  };

  const periodString = `${MONTH_NAMES[currentSlip.period_month] || currentSlip.period_month} ${
    currentSlip.period_year
  }`;

  const paymentDate = currentSlip.paid_at
    ? new Date(currentSlip.paid_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Generate clean printable HTML
  const generateSlipHtml = () => {
    return targetSlips
      .map((slip, idx) => {
        const slipPeriod = `${MONTH_NAMES[slip.period_month] || slip.period_month} ${slip.period_year}`;
        const slipStore = slip.store || store;
        const terbilang = terbilangRupiah(slip.net_salary);

        return `
          <div style="
            max-width: 680px;
            margin: 0 auto 30px auto;
            padding: 24px;
            background: #ffffff;
            border: 2px solid #0f172a;
            border-radius: 12px;
            page-break-after: ${idx < targetSlips.length - 1 ? 'always' : 'auto'};
            font-family: system-ui, -apple-system, sans-serif;
            color: #0f172a;
            box-sizing: border-box;
          ">
            <!-- Header Store -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #0f172a;">
              <div>
                <h2 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${slipStore.name}</h2>
                <div style="font-size: 11px; color: #475569; margin-top: 3px;">${slipStore.address || ''}</div>
                ${slipStore.phone ? `<div style="font-size: 11px; color: #475569;">Telp / WhatsApp: ${slipStore.phone}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 14px; font-size: 12px; font-weight: 800; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                  SLIP GAJI
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 5px; font-family: monospace; font-weight: 700;">No: ${slip.payroll_number}</div>
              </div>
            </div>

            <!-- Employee Info Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
              <tr>
                <td style="padding: 6px 12px; width: 25%; color: #64748b;">Nama Karyawan</td>
                <td style="padding: 6px 12px; width: 25%; font-weight: 700; color: #0f172a;">: ${slip.employee_name}</td>
                <td style="padding: 6px 12px; width: 25%; color: #64748b;">Periode Gaji</td>
                <td style="padding: 6px 12px; width: 25%; font-weight: 700; color: #0f172a;">: ${slipPeriod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; color: #64748b;">Jabatan / Peran</td>
                <td style="padding: 6px 12px; font-weight: 600;">: ${slip.position}</td>
                <td style="padding: 6px 12px; color: #64748b;">Kehadiran Absensi</td>
                <td style="padding: 6px 12px; font-weight: 700; color: #059669;">: ${slip.attendance_count} Hari Kerja</td>
              </tr>
              ${slip.barcode_id ? `
              <tr>
                <td style="padding: 6px 12px; color: #64748b;">ID Barcode</td>
                <td style="padding: 6px 12px; font-family: monospace; font-weight: 600;">: ${slip.barcode_id}</td>
                <td style="padding: 6px 12px; color: #64748b;">Tanggal Cetak</td>
                <td style="padding: 6px 12px; color: #475569;">: ${paymentDate}</td>
              </tr>` : ''}
            </table>

            <!-- Salary Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
              <thead>
                <tr style="background: #0f172a; color: #ffffff;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Komponen Penghasilan & Potongan</th>
                  <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; width: 160px;">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 12px;">1. Gaji Pokok</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">Rp ${slip.base_salary.toLocaleString('id-ID')}</td>
                </tr>
                ${slip.bonus > 0 ? `
                <tr style="border-bottom: 1px solid #e2e8f0; color: #047857;">
                  <td style="padding: 8px 12px;">2. Tunjangan Kinerja / Bonus</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">+ Rp ${slip.bonus.toLocaleString('id-ID')}</td>
                </tr>` : ''}
                ${slip.overtime > 0 ? `
                <tr style="border-bottom: 1px solid #e2e8f0; color: #047857;">
                  <td style="padding: 8px 12px;">3. Upah Lembur</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">+ Rp ${slip.overtime.toLocaleString('id-ID')}</td>
                </tr>` : ''}
                ${slip.deductions > 0 ? `
                <tr style="border-bottom: 1px solid #e2e8f0; color: #dc2626;">
                  <td style="padding: 8px 12px;">4. Potongan (Kasbon / Keterlambatan / Pinjaman)</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600;">- Rp ${slip.deductions.toLocaleString('id-ID')}</td>
                </tr>` : ''}
                <tr style="background: #f1f5f9; font-size: 13px; font-weight: 800; border-top: 2px solid #0f172a;">
                  <td style="padding: 10px 12px;">TOTAL GAJI DITERIMA (TAKE HOME PAY)</td>
                  <td style="padding: 10px 12px; text-align: right; color: #047857;">Rp ${slip.net_salary.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>

            <!-- Terbilang -->
            <div style="padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 11px; margin-bottom: 16px;">
              <b>Terbilang:</b> <i># ${terbilang} #</i>
            </div>

            ${slip.notes ? `
            <div style="font-size: 11px; color: #475569; margin-bottom: 18px; font-style: italic;">
              Catatan: ${slip.notes}
            </div>` : ''}

            <!-- Signatures -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 24px; text-align: center; font-size: 11px;">
              <tr>
                <td style="width: 50%; padding-bottom: 50px; color: #64748b;">Penerima (Karyawan),</td>
                <td style="width: 50%; padding-bottom: 50px; color: #64748b;">Pengelola Toko,</td>
              </tr>
              <tr>
                <td style="font-weight: 700; text-decoration: underline;">${slip.employee_name}</td>
                <td style="font-weight: 700; text-decoration: underline;">${slipStore.name}</td>
              </tr>
            </table>
          </div>
        `;
      })
      .join('');
  };

  const handlePrintSlip = () => {
    const html = generateSlipHtml();
    printHtmlDirect(
      html,
      activeTab === 'single'
        ? `Slip-Gaji-${currentSlip.employee_name}-${periodString}`
        : `Semua-Slip-Gaji-${periodString}`
    );
  };

  const handleCopyWhatsapp = () => {
    const terbilang = terbilangRupiah(currentSlip.net_salary);
    const text = `*SLIP GAJI RESMI — ${store.name}*
No. Slip: ${currentSlip.payroll_number}
Periode: ${periodString}

*DATA KARYAWAN:*
• Nama: *${currentSlip.employee_name}*
• Jabatan: ${currentSlip.position}
• Kehadiran: ${currentSlip.attendance_count} Hari Kerja

*RINCIAN GAJI:*
• Gaji Pokok: Rp ${currentSlip.base_salary.toLocaleString('id-ID')}
${currentSlip.bonus > 0 ? `• Tunjangan/Bonus: + Rp ${currentSlip.bonus.toLocaleString('id-ID')}\n` : ''}${currentSlip.overtime > 0 ? `• Lembur: + Rp ${currentSlip.overtime.toLocaleString('id-ID')}\n` : ''}${currentSlip.deductions > 0 ? `• Potongan/Kasbon: - Rp ${currentSlip.deductions.toLocaleString('id-ID')}\n` : ''}
*TOTAL DITERIMA (Take Home Pay):*
👉 *Rp ${currentSlip.net_salary.toLocaleString('id-ID')}*
_${terbilang}_

${currentSlip.notes ? `Catatan: ${currentSlip.notes}\n` : ''}Terima kasih atas kerja keras Anda bersama ${store.name}! 🙏`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Cetak Slip Gaji Karyawan</h3>
              <p className="text-[11px] text-slate-500">
                Format resmi UMKM dengan rincian penghasilan, kehadiran absensi, dan tanda tangan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          {allSlips.length > 1 ? (
            <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'single'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Slip {currentSlip.employee_name}
              </button>
              <button
                onClick={() => setActiveTab('batch')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'batch'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Cetak Semua ({allSlips.length} Slip)
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-slate-600 font-semibold">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Periode: {periodString}</span>
            </div>
          )}

          {/* Quick WhatsApp Share Button */}
          <button
            onClick={handleCopyWhatsapp}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold transition-all flex items-center space-x-1.5 shadow-2xs"
            title="Salin teks rincian slip gaji untuk dikirim ke chat WhatsApp karyawan"
          >
            {copiedWhatsapp ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tersalin! Siap Paste di WA</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Salin Format WhatsApp</span>
              </>
            )}
          </button>
        </div>

        {/* Slip Preview on Screen */}
        <div className="p-6 bg-slate-100 max-h-[60vh] overflow-y-auto flex flex-col items-center">
          {activeTab === 'batch' && allSlips.length > 1 ? (
            <div className="w-full space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Pratinjau Cetak Massal: <b>{allSlips.length} slip gaji</b> akan dicetak dengan pemisah halaman
                  (1 slip per lembar) untuk seluruh karyawan periode ini.
                </span>
              </div>

              {allSlips.map((slip, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{slip.employee_name}</h4>
                      <p className="text-[11px] text-slate-500">{slip.position}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-emerald-600">
                        Rp {slip.net_salary.toLocaleString('id-ID')}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono">#{slip.payroll_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 sm:p-7 shadow-lg border border-slate-200/90 rounded-2xl w-full max-w-xl text-slate-900 text-xs space-y-4">
              {/* Header Store */}
              <div className="flex items-start justify-between pb-3.5 border-b-2 border-slate-900">
                <div className="flex items-center space-x-3">
                  {store.logo_url && (
                    <img
                      src={store.logo_url}
                      alt="Logo"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                    />
                  )}
                  <div>
                    <h2 className="font-black text-base uppercase tracking-tight text-slate-900">
                      {store.name}
                    </h2>
                    <p className="text-[11px] text-slate-600">{store.address}</p>
                    {store.phone && (
                      <p className="text-[11px] text-slate-600">Telp: {store.phone}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-[11px] rounded-lg uppercase tracking-wider">
                    SLIP GAJI
                  </span>
                  <p className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                    No: {currentSlip.payroll_number}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Karyawan:</span>
                  <p className="font-bold text-slate-900 text-xs">{currentSlip.employee_name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Jabatan / Peran:</span>
                  <p className="font-semibold text-slate-800">{currentSlip.position}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Periode Penggajian:</span>
                  <p className="font-semibold text-slate-800">{periodString}</p>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kehadiran (Absensi):</span>
                  <p className="font-bold text-emerald-700">{currentSlip.attendance_count} Hari Kerja</p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-3.5 py-2 font-bold text-[11px] flex justify-between">
                  <span>KOMPONEN PENGHASILAN</span>
                  <span>JUMLAH</span>
                </div>
                <div className="p-3.5 space-y-2 text-[11px] bg-white">
                  <div className="flex justify-between text-slate-700">
                    <span>1. Gaji Pokok</span>
                    <span className="font-bold">
                      Rp {currentSlip.base_salary.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {currentSlip.bonus > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>2. Tunjangan / Bonus</span>
                      <span className="font-bold">+ Rp {currentSlip.bonus.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {currentSlip.overtime > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>3. Upah Lembur</span>
                      <span className="font-bold">
                        + Rp {currentSlip.overtime.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  {currentSlip.deductions > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>4. Potongan (Kasbon / Absen)</span>
                      <span className="font-bold">
                        - Rp {currentSlip.deductions.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-900 pt-2.5 flex justify-between font-black text-sm text-slate-900 bg-slate-50 -mx-3.5 -mb-3.5 p-3.5">
                    <span>TOTAL DITERIMA (TAKE HOME PAY)</span>
                    <span className="text-emerald-700 font-extrabold text-base">
                      Rp {currentSlip.net_salary.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terbilang */}
              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                <span className="font-bold">Terbilang: </span>
                <span className="italic font-medium">#{terbilangRupiah(currentSlip.net_salary)}#</span>
              </div>

              {currentSlip.notes && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-slate-600 italic">
                  Catatan: {currentSlip.notes}
                </div>
              )}

              {/* Signature */}
              <div className="grid grid-cols-2 gap-4 text-center pt-3 border-t border-slate-200 text-[11px]">
                <div>
                  <p className="text-slate-500 mb-10">Penerima (Karyawan),</p>
                  <p className="font-bold border-t border-slate-400 mx-6 pt-1">
                    {currentSlip.employee_name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-10">
                    {paymentDate}
                    <br />
                    Pengelola Toko,
                  </p>
                  <p className="font-bold border-t border-slate-400 mx-6 pt-1">{store.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Dapat dicetak langsung ke printer fisik atau disimpan sebagai PDF.
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrintSlip}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {activeTab === 'single'
                  ? 'Cetak Slip Gaji'
                  : `Cetak Semua (${allSlips.length} Slip)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
