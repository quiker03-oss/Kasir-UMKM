import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Printer,
  Edit3,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  FileText,
  DollarSign,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Payroll, PayrollItem } from '../types/index.ts';
import SalarySlipPrintModal from '../components/SalarySlipPrintModal.tsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

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

export default function PayrollView() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected payroll details
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [storeInfo, setStoreInfo] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create new payroll modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMonth, setCreateMonth] = useState<number>(new Date().getMonth() + 1);
  const [createYear, setCreateYear] = useState<number>(new Date().getFullYear());

  // Edit payroll item (Bonus, Overtime, Deductions)
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editOvertime, setEditOvertime] = useState<number>(0);
  const [editDeductions, setEditDeductions] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Slip Gaji Print Modal
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [slipData, setSlipData] = useState<any | null>(null);
  const [allPeriodSlips, setAllPeriodSlips] = useState<any[]>([]);

  useEffect(() => {
    loadPayrolls();
  }, []);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const res = await api.getPayrolls();
      if (res.success) {
        setPayrolls(res.payrolls || []);
      }
    } catch (err) {
      console.error('Failed to load payrolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (payrollId: string) => {
    try {
      const res = await api.getPayrollDetail(payrollId);
      if (res.success) {
        setSelectedPayroll(res.payroll);
        setStoreInfo(res.store);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memuat rincian penggajian.');
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPayroll({
        period_month: createMonth,
        period_year: createYear,
      });
      if (res.success) {
        setIsCreateOpen(false);
        loadPayrolls();
        if (res.payroll_id) {
          openDetail(res.payroll_id);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal membuat daftar gaji.');
    }
  };

  const handleUpdateStatus = async (payrollId: string, status: 'Draft' | 'Diproses' | 'Dibayar') => {
    if (status === 'Dibayar') {
      if (!window.confirm('Tandai penggajian ini sebagai DIBAYAR? Total gaji akan otomatis dicatat sebagai pengeluaran operasional toko.')) {
        return;
      }
    }

    try {
      const res = await api.updatePayrollStatus(payrollId, status);
      if (res.success) {
        openDetail(payrollId);
        loadPayrolls();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status penggajian.');
    }
  };

  const openEditItemModal = (item: PayrollItem) => {
    setEditingItem(item);
    setEditBonus(item.bonus || 0);
    setEditOvertime(item.overtime || 0);
    setEditDeductions(item.deductions || 0);
    setEditNotes(item.notes || '');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await api.updatePayrollItem(editingItem.id, {
        bonus: editBonus,
        overtime: editOvertime,
        deductions: editDeductions,
        notes: editNotes,
      });
      if (res.success) {
        setEditingItem(null);
        openDetail(selectedPayroll.id);
        loadPayrolls();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui rincian gaji.');
    }
  };

  const openSalarySlipPrint = (item: PayrollItem) => {
    setAllPeriodSlips([]);
    setSlipData({
      payroll_number: selectedPayroll.payroll_number,
      period_month: selectedPayroll.period_month,
      period_year: selectedPayroll.period_year,
      paid_at: selectedPayroll.paid_at,
      payment_status: selectedPayroll.status,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      position: item.position,
      barcode_id: (item as any).barcode_id,
      attendance_count: item.attendance_count,
      base_salary: item.base_salary,
      allowance: 0,
      bonus: item.bonus,
      overtime: item.overtime,
      other_income: 0,
      deductions: item.deductions,
      cash_advance: 0,
      other_deductions: 0,
      net_salary: item.net_salary,
      notes: item.notes,
      store: storeInfo,
    });
    setIsSlipModalOpen(true);
  };

  const openAllSlipsPrint = () => {
    if (!selectedPayroll || !selectedPayroll.items) return;
    const slips = selectedPayroll.items.map((item: any) => ({
      payroll_number: selectedPayroll.payroll_number,
      period_month: selectedPayroll.period_month,
      period_year: selectedPayroll.period_year,
      paid_at: selectedPayroll.paid_at,
      payment_status: selectedPayroll.status,
      employee_id: item.employee_id,
      employee_name: item.employee_name,
      position: item.position,
      barcode_id: item.barcode_id,
      attendance_count: item.attendance_count,
      base_salary: item.base_salary,
      allowance: 0,
      bonus: item.bonus,
      overtime: item.overtime,
      other_income: 0,
      deductions: item.deductions,
      cash_advance: 0,
      other_deductions: 0,
      net_salary: item.net_salary,
      notes: item.notes,
      store: storeInfo,
    }));
    setAllPeriodSlips(slips);
    setSlipData(null);
    setIsSlipModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Penggajian & Slip Gaji Karyawan</h2>
          <p className="text-xs text-slate-500">
            Kalkulasi gaji berbasis kehadiran absensi barcode, tunjangan lembur, potongan kasbon, dan cetak slip gaji resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAllPeriodSlips([]);
              setSlipData(null);
              setIsSlipModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Buka dan cetak Slip Gaji karyawan berdasarkan pilihan nama dan periode"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Slip Gaji</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Penggajian Periode Baru</span>
          </button>
        </div>
      </div>

      {/* Payroll Periods List */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : payrolls.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">Belum ada periode penggajian</h3>
          <p className="text-xs text-slate-400">
            Klik "Buat Penggajian Periode Baru" untuk mengalkulasi gaji berdasarkan absensi bulan ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {payrolls.map((p) => {
            const periodStr = `${MONTH_NAMES[p.period_month]} ${p.period_year}`;
            return (
              <div
                key={p.id}
                onClick={() => openDetail(p.id)}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      #{p.payroll_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'Dibayar'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'Diproses'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900">{periodStr}</h3>
                  <p className="text-xs text-slate-500">{p.employee_count || 0} Karyawan Terdaftar</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Pembayaran:</span>
                    <span className="font-extrabold text-sm text-slate-900">
                      Rp {Number(p.total_payout).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payroll Detail Modal */}
      {isDetailOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Penggajian Periode {MONTH_NAMES[selectedPayroll.period_month]} {selectedPayroll.period_year}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedPayroll.status === 'Dibayar'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedPayroll.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nomor: {selectedPayroll.payroll_number} • Total Pengeluaran Gaji:{' '}
                  <b className="text-slate-900">Rp {Number(selectedPayroll.total_payout).toLocaleString('id-ID')}</b>
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  onClick={openAllSlipsPrint}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Cetak Semua Slip Gaji Karyawan Periode Ini Sekaligus"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>Cetak Semua Slip Gaji</span>
                </button>

                {selectedPayroll.status !== 'Dibayar' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedPayroll.id, 'Dibayar')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Tandai Sudah Dibayar</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Employee items table */}
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Karyawan</th>
                    <th className="p-3 text-center">Kehadiran (Barcode)</th>
                    <th className="p-3 text-right">Gaji Pokok</th>
                    <th className="p-3 text-right">Tunjangan/Bonus</th>
                    <th className="p-3 text-right">Lembur</th>
                    <th className="p-3 text-right">Potongan</th>
                    <th className="p-3 text-right">Gaji Bersih</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPayroll.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{item.employee_name}</span>
                        <span className="text-[11px] text-slate-400">{item.position}</span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {item.attendance_count} Hari
                      </td>
                      <td className="p-3 text-right">Rp {Number(item.base_salary).toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        + Rp {Number(item.bonus).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-medium">
                        + Rp {Number(item.overtime).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right text-rose-600 font-medium">
                        - Rp {Number(item.deductions).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-extrabold text-slate-900">
                        Rp {Number(item.net_salary).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {selectedPayroll.status !== 'Dibayar' && (
                            <button
                              onClick={() => openEditItemModal(item)}
                              title="Sesuaikan Bonus/Potongan"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openSalarySlipPrint(item)}
                            title="Cetak Slip Gaji Resmi"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Payroll Period Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Buat Penggajian Periode Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayroll} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Bulan</label>
                <select
                  value={createMonth}
                  onChange={(e) => setCreateMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  {MONTH_NAMES.slice(1).map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun</label>
                <input
                  type="number"
                  value={createYear}
                  onChange={(e) => setCreateYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                Sistem akan mengumpulkan seluruh karyawan aktif dan menghitung total kehadiran mereka dari log absensi barcode pada bulan tersebut.
              </p>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Proses Penggajian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payroll Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Sesuaikan Slip Gaji</h3>
                <p className="text-xs text-slate-500">{editingItem.employee_name}</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tunjangan / Bonus (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={editBonus}
                  onChange={(e) => setEditBonus(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Uang Lembur (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={editOvertime}
                  onChange={(e) => setEditOvertime(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Potongan / Kasbon (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={editDeductions}
                  onChange={(e) => setEditDeductions(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  placeholder="Keterangan tambahan..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Salary Slip Print Modal */}
      <SalarySlipPrintModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        slipData={slipData}
        allSlips={allPeriodSlips}
      />
    </div>
  );
}
