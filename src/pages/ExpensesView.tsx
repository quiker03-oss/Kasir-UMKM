import { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, Calendar, Filter, X, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Expense } from '../types/index.ts';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

export default function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<any>({ total_expenses: 0, total_modal: 0, total_operasional: 0 });
  const [loading, setLoading] = useState(false);

  // Deletion state
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('OPERASIONAL');
  const [type, setType] = useState<'BIAYA_OPERASIONAL' | 'MODAL'>('BIAYA_OPERASIONAL');
  const [amount, setAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadExpenses();
  }, [startDate, endDate, categoryFilter]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({
        start_date: startDate,
        end_date: endDate,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      if (res.success) {
        setExpenses(res.expenses || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setNotification({ message: 'Jumlah pengeluaran harus lebih besar dari 0.', type: 'error' });
      return;
    }
    if (!description.trim()) {
      setNotification({ message: 'Keterangan pengeluaran wajib diisi.', type: 'error' });
      return;
    }

    try {
      await api.createExpense({
        category,
        type,
        amount,
        description: description.trim(),
        date: expenseDate,
      });
      setIsModalOpen(false);
      setDescription('');
      setNotification({ message: 'Pengeluaran berhasil dicatat.', type: 'success' });
      loadExpenses();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menyimpan pengeluaran.', type: 'error' });
    }
  };

  const handleDeleteExpense = (exp: Expense) => {
    setDeleteExpenseTarget(exp);
  };

  const executeDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteExpense(deleteExpenseTarget.id);
      setNotification({ message: 'Pencatatan pengeluaran berhasil dihapus.', type: 'success' });
      setDeleteExpenseTarget(null);
      loadExpenses();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus pengeluaran.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    OPERASIONAL: 'Operasional',
    BAHAN_BAKU: 'Bahan Baku',
    GAJI: 'Gaji Karyawan',
    SEWA: 'Sewa Tempat',
    UTILITAS: 'Listrik & Air',
    LAINNYA: 'Lain-lain',
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pencatatan Keuangan & Pengeluaran</h2>
          <p className="text-xs text-slate-500">
            Catat pengeluaran operasional, pembelian bahan baku, sewa, dan pengeluaran modal usaha.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Seluruh Pengeluaran</span>
          <div className="text-xl font-black text-rose-600">
            Rp {Number(summary.total_expenses || 0).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Biaya Operasional</span>
          <div className="text-xl font-black text-slate-900">
            Rp {Number(summary.total_operasional || 0).toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Pengeluaran Modal (Investasi)</span>
          <div className="text-xl font-black text-slate-900">
            Rp {Number(summary.total_modal || 0).toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex space-x-1 overflow-x-auto no-scrollbar">
            {['ALL', 'OPERASIONAL', 'BAHAN_BAKU', 'GAJI', 'UTILITAS', 'SEWA'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : categoryLabels[cat] || cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Keterangan</th>
                <th className="p-3">Tipe</th>
                <th className="p-3 text-right">Nominal</th>
                <th className="p-3 text-right">Dicatat Oleh</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada data pengeluaran pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium text-slate-600">{exp.date}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {categoryLabels[exp.category] || exp.category}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-900">{exp.description}</td>
                    <td className="p-3 text-[11px] text-slate-500">
                      {exp.type === 'MODAL' ? 'Modal (Investasi)' : 'Biaya Operasional'}
                    </td>
                    <td className="p-3 text-right font-extrabold text-rose-600">
                      Rp {Number(exp.amount).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-slate-500">{exp.created_by || 'Admin'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Catat Pengeluaran Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori Pengeluaran</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                >
                  <option value="OPERASIONAL">Operasional</option>
                  <option value="BAHAN_BAKU">Bahan Baku (Beras, Kopi, Telur, dll)</option>
                  <option value="GAJI">Gaji Karyawan</option>
                  <option value="UTILITAS">Listrik / Air / Internet</option>
                  <option value="SEWA">Sewa Tempat / Ruko</option>
                  <option value="LAINNYA">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('BIAYA_OPERASIONAL')}
                    className={`py-2 text-[11px] font-bold rounded-xl border ${
                      type === 'BIAYA_OPERASIONAL'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Biaya Operasional
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('MODAL')}
                    className={`py-2 text-[11px] font-bold rounded-xl border ${
                      type === 'MODAL'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Modal / Investasi
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Pengeluaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli gas LPG 3kg 2 tabung"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Expense Modal */}
      <ConfirmDeleteModal
        isOpen={deleteExpenseTarget !== null}
        title="Hapus Pengeluaran"
        itemName={deleteExpenseTarget ? `${deleteExpenseTarget.description} (Rp ${Number(deleteExpenseTarget.amount).toLocaleString('id-ID')})` : ''}
        message="Apakah Anda yakin ingin menghapus catatan pengeluaran ini dari laporan keuangan toko?"
        confirmText="Ya, Hapus Pengeluaran"
        isDeleting={isDeleting}
        onConfirm={executeDeleteExpense}
        onClose={() => setDeleteExpenseTarget(null)}
      />
    </div>
  );
}
