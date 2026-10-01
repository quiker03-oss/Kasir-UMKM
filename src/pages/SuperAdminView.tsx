import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Store,
  Users,
  ExternalLink,
  X,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Globe,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import ImageUploadPicker from '../components/ImageUploadPicker.tsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

export default function SuperAdminView() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Deletion modal state
  const [deleteStoreTarget, setDeleteStoreTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Add Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [storeStatus, setStoreStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await api.getSuperAdminStores();
      if (res.success) {
        setStores(res.stores || []);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !adminUsername.trim() || !adminPassword.trim()) {
      alert('Nama toko, username admin, dan password awal wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.createStore({
        name: storeName.trim(),
        admin_username: adminUsername.trim(),
        admin_password: adminPassword.trim(),
        admin_name: ownerName.trim() || `Pemilik ${storeName.trim()}`,
        phone: phone.trim(),
        address: address.trim(),
        subdomain: domain.trim() || null,
        custom_domain: domain.trim() || null,
        logo_url: logoUrl.trim() || null,
        status: storeStatus,
      });

      if (res.success) {
        alert('Toko UMKM baru berhasil didaftarkan dan siap digunakan!');
        setIsAddOpen(false);
        resetAddForm();
        loadStores();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mendaftarkan toko baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setStoreName('');
    setAdminUsername('');
    setAdminPassword('');
    setOwnerName('');
    setPhone('');
    setAddress('');
    setDomain('');
    setLogoUrl('');
    setStoreStatus('ACTIVE');
  };

  const openEditModal = (store: any) => {
    setEditingStore(store);
    setEditName(store.name || '');
    setEditSlug(store.slug || '');
    setEditAddress(store.address || '');
    setEditPhone(store.phone || '');
    setEditDomain(store.custom_domain || store.subdomain || '');
    setEditAdminUsername(store.admin_username || '');
    setEditAdminPassword('');
    setEditAdminName(store.admin_name || '');
    setEditLogoUrl(store.logo_url || '');
    setEditStatus(store.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    try {
      setEditSubmitting(true);
      const res = await api.updateStore(editingStore.id, {
        name: editName.trim(),
        slug: editSlug.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        subdomain: editDomain.trim() || null,
        custom_domain: editDomain.trim() || null,
        logo_url: editLogoUrl.trim() || null,
        status: editStatus,
        admin_username: editAdminUsername.trim() || undefined,
        admin_password: editAdminPassword.trim() || undefined,
        admin_name: editAdminName.trim() || undefined,
      });

      if (res.success) {
        alert('Data toko dan kredensial admin berhasil diperbarui!');
        setIsEditOpen(false);
        setEditingStore(null);
        loadStores();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui toko.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleStatus = async (storeId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.updateSuperAdminStoreStatus(storeId, nextStatus === 'ACTIVE');
      loadStores();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status toko.');
    }
  };

  const handleDeleteStore = (store: any) => {
    setDeleteStoreTarget(store);
  };

  const executeDeleteStore = async () => {
    if (!deleteStoreTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteStore(deleteStoreTarget.id);
      if (res.success) {
        setNotification({ message: `Toko "${deleteStoreTarget.name}" berhasil dihapus.`, type: 'success' });
        setDeleteStoreTarget(null);
        loadStores();
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus toko.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered stores
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      // Search
      const matchSearch =
        searchQuery.trim() === '' ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admin_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && (s.status === 'ACTIVE' || s.is_active)) ||
        (statusFilter === 'INACTIVE' && (s.status === 'INACTIVE' || !s.is_active));

      return matchSearch && matchStatus;
    });
  }, [stores, searchQuery, statusFilter]);

  const activeStoresCount = stores.filter((s) => s.status === 'ACTIVE' || s.is_active).length;
  const inactiveStoresCount = stores.filter((s) => s.status === 'INACTIVE' || !s.is_active).length;
  const totalTransactionsCount = stores.reduce((acc, s) => acc + (Number(s.transaction_count) || 0), 0);

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
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800 text-[10px] font-black uppercase flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Multi-Tenant Super Admin</span>
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1.5 tracking-tight">Manajemen Toko UMKM</h2>
          <p className="text-xs text-slate-500">
            Satu aplikasi, multi-tenant. Kelola seluruh toko, domain, akun admin, serta status aktif/nonaktif.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadStores}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-purple-700/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Toko Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Total Toko Terdaftar</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stores.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">Tenant aktif & terisolasi</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600">Toko Aktif</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeStoresCount}</p>
          <p className="text-[10px] text-emerald-500 mt-1">Dapat login & beroperasi</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-rose-600">Toko Dinonaktifkan</p>
          <p className="text-2xl font-black text-rose-700 mt-1">{inactiveStoresCount}</p>
          <p className="text-[10px] text-rose-500 mt-1">Akses login ditangguhkan</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-purple-600">Total Transaksi Platform</p>
          <p className="text-2xl font-black text-purple-800 mt-1">{totalTransactionsCount}</p>
          <p className="text-[10px] text-purple-500 mt-1">Dari semua toko</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama toko, ID, slug, atau admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-1.5 self-stretch sm:self-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === status
                  ? 'bg-purple-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'Semua Toko' : status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">ID & Nama Toko</th>
                <th className="p-3.5">Admin Akun</th>
                <th className="p-3.5">Domain / Slug</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Produk</th>
                <th className="p-3.5 text-center">Karyawan</th>
                <th className="p-3.5 text-center">Transaksi</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                    <p className="mt-2 text-xs">Memuat data toko UMKM...</p>
                  </td>
                </tr>
              ) : filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    Tidak ada toko yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredStores.map((s) => {
                  const isActive = s.status === 'ACTIVE' || s.is_active;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Store className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {s.id}</span>
                            {s.phone && <span className="text-[10px] text-slate-500 block">📞 {s.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 block">{s.admin_username || '-'}</span>
                        <span className="text-[10px] text-slate-400">{s.admin_name || 'Admin Toko'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-600 block">/store/{s.slug}</span>
                        {s.custom_domain && (
                          <span className="text-[10px] text-purple-600 font-medium flex items-center space-x-1">
                            <Globe className="w-3 h-3" />
                            <span>{s.custom_domain}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-700">{s.product_count || 0}</td>
                      <td className="p-3.5 text-center font-bold text-slate-700">{s.employee_count || 0}</td>
                      <td className="p-3.5 text-center font-bold text-slate-700">{s.transaction_count || 0}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(s.id, s.status || (s.is_active ? 'ACTIVE' : 'INACTIVE'))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={isActive ? 'Nonaktifkan Toko' : 'Aktifkan Toko'}
                          >
                            {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          {/* Edit Store */}
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                            title="Edit Toko & Reset Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Public Store Preview */}
                          <a
                            href={`#store/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg"
                            title="Buka Halaman Publik Pelanggan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Delete Store */}
                          <button
                            onClick={() => handleDeleteStore(s)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg transition-colors"
                            title="Hapus Toko"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Store Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Daftarkan Toko UMKM Baru</h3>
                <p className="text-[11px] text-slate-500">Buat record toko, store_id terisolasi, dan akun Admin Toko.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Toko *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kedai Kopi Isti"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Pemilik</label>
                  <input
                    type="text"
                    placeholder="Contoh: Isti Anisa"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat Toko</label>
                  <input
                    type="text"
                    placeholder="Jl. Malioboro No. 45, Yogyakarta"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Domain / Subdomain</label>
                  <input
                    type="text"
                    placeholder="kedaisti.umkm.id"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Toko</label>
                  <select
                    value={storeStatus}
                    onChange={(e: any) => setStoreStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
                  >
                    <option value="ACTIVE">Aktif (Bisa Operasi)</option>
                    <option value="INACTIVE">Nonaktif (Ditangguhkan)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <ImageUploadPicker
                    label="Logo Toko"
                    value={logoUrl}
                    onChange={(url) => setLogoUrl(url)}
                    placeholderText="Pilih foto logo toko dari Galeri HP / Komputer"
                    helperText="Format JPG, PNG, WEBP. Maks 8MB."
                  />
                </div>
              </div>

              {/* Admin Toko Credentials */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-1.5 text-purple-900 font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Akun Admin Toko (Login Pertama)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Username Admin *</label>
                    <input
                      type="text"
                      required
                      placeholder="admin_kedaisti"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password Awal *</label>
                    <input
                      type="password"
                      required
                      placeholder="Minimal 6 karakter"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-purple-700/20"
                >
                  {submitting ? 'Menyimpan Toko...' : 'Simpan & Buat Toko'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {isEditOpen && editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Toko & Akun Admin</h3>
                <p className="text-[11px] text-slate-500">Perbarui profil toko, status, atau reset password admin.</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Toko *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Slug URL Toko</label>
                  <input
                    type="text"
                    required
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Toko</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
                  >
                    <option value="ACTIVE">Aktif (Bisa Operasi)</option>
                    <option value="INACTIVE">Nonaktif (Ditangguhkan)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Custom Domain / Subdomain</label>
                  <input
                    type="text"
                    placeholder="Contoh: tokoku.com"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Alamat</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WA</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <ImageUploadPicker
                    label="Logo Toko"
                    value={editLogoUrl}
                    onChange={(url) => setEditLogoUrl(url)}
                    placeholderText="Pilih foto logo toko dari Galeri HP / Komputer"
                    helperText="Format JPG, PNG, WEBP. Maks 8MB."
                  />
                </div>
              </div>

              {/* Admin Toko Credentials Management */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-1.5 text-purple-900 font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Kredensial Akun Admin Toko</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Username Admin</label>
                    <input
                      type="text"
                      value={editAdminUsername}
                      onChange={(e) => setEditAdminUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Pemilik / Admin</label>
                    <input
                      type="text"
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reset Password Admin (Kosongkan jika tidak diubah)
                    </label>
                    <input
                      type="password"
                      placeholder="Masukkan password baru untuk reset"
                      value={editAdminPassword}
                      onChange={(e) => setEditAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-purple-700/20"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Store Modal */}
      <ConfirmDeleteModal
        isOpen={deleteStoreTarget !== null}
        title="Hapus Akun Toko Secara Permanen"
        itemName={deleteStoreTarget ? `${deleteStoreTarget.name} (${deleteStoreTarget.slug})` : ''}
        message="Apakah Anda yakin ingin menghapus toko ini beserta SELURUH data produk, transaksi kasir, inventaris, karyawan, dan pengaturannya? Data yang dihapus tidak dapat dipulihkan kembali."
        confirmText="Ya, Hapus Toko Ini"
        isDeleting={isDeleting}
        onConfirm={executeDeleteStore}
        onClose={() => setDeleteStoreTarget(null)}
      />
    </div>
  );
}
