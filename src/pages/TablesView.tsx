import { useState, useEffect } from 'react';
import { Utensils, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.ts';
import { TableItem } from '../types/index.ts';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

export default function TablesView() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableItem | null>(null);
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState<number>(4);

  // Deletion modal state
  const [deleteTableTarget, setDeleteTableTarget] = useState<TableItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const res = await api.getTables();
      if (res.success) {
        setTables(res.tables || []);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTable(null);
    setTableName(`Meja ${tables.length + 1 < 10 ? '0' : ''}${tables.length + 1}`);
    setCapacity(4);
    setIsModalOpen(true);
  };

  const openEditModal = (t: TableItem) => {
    setEditingTable(t);
    setTableName(t.name);
    setCapacity(t.capacity);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) return;

    try {
      if (editingTable) {
        await api.updateTable(editingTable.id, { name: tableName.trim(), capacity });
        setNotification({ message: 'Data meja berhasil diperbarui.', type: 'success' });
      } else {
        await api.createTable({ name: tableName.trim(), capacity });
        setNotification({ message: 'Meja baru berhasil ditambahkan.', type: 'success' });
      }
      setIsModalOpen(false);
      loadTables();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menyimpan data meja.', type: 'error' });
    }
  };

  const handleDelete = (table: TableItem) => {
    setDeleteTableTarget(table);
  };

  const executeDelete = async () => {
    if (!deleteTableTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteTable(deleteTableTarget.id);
      setNotification({ message: `Meja "${deleteTableTarget.name}" berhasil dihapus.`, type: 'success' });
      setDeleteTableTarget(null);
      loadTables();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus meja.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Nomor Meja</h2>
          <p className="text-xs text-slate-500">
            Atur meja makan pelanggan (Dine-in) untuk kasir POS dan pemesanan online mandiri.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Meja</span>
        </button>
      </div>

      {/* Grid of Tables */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Utensils className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">Belum ada meja</h3>
          <p className="text-xs text-slate-400">Klik "Tambah Meja" untuk menambahkan meja makan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables.map((tbl) => (
            <div
              key={tbl.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between items-center text-center shadow-2xs hover:shadow-md transition-shadow relative group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-sm mb-2">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{tbl.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{tbl.capacity} Kursi</p>
              </div>

              <div className="flex items-center space-x-1 mt-3 pt-2 border-t border-slate-100 w-full justify-center">
                <button
                  onClick={() => openEditModal(tbl)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  title="Edit Meja"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tbl)}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Hapus Meja"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingTable ? 'Edit Meja' : 'Tambah Meja Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama / Nomor Meja *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Meja 01, VIP 1"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kapasitas Kursi</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Table Modal */}
      <ConfirmDeleteModal
        isOpen={deleteTableTarget !== null}
        title="Hapus Meja"
        itemName={deleteTableTarget?.name}
        message="Apakah Anda yakin ingin menghapus meja ini? Meja yang dihapus tidak akan muncul lagi di kasir atau sistem pemesanan."
        confirmText="Ya, Hapus Meja"
        isDeleting={isDeleting}
        onConfirm={executeDelete}
        onClose={() => setDeleteTableTarget(null)}
      />
    </div>
  );
}
