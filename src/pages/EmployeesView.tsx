import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Barcode,
  Printer,
  X,
  RefreshCw,
  Phone,
  DollarSign,
  Calendar,
  Camera,
  ImagePlus,
  CheckCircle2,
  Search,
  FileText,
  CreditCard,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Employee } from '../types/index.ts';
import ImageUploadPicker from '../components/ImageUploadPicker.tsx';
import EmployeeIdCardModal from '../components/EmployeeIdCardModal.tsx';
import SalarySlipPrintModal, { SalarySlipData } from '../components/SalarySlipPrintModal.tsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

export default function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  // Deletion modal state
  const [deleteEmployeeTarget, setDeleteEmployeeTarget] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Card Print Modal
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [idCardEmployee, setIdCardEmployee] = useState<Employee | null>(null);

  // Salary Slip Modal
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipData, setSlipData] = useState<SalarySlipData | null>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  // Quick photo upload state
  const [quickPhotoEmployee, setQuickPhotoEmployee] = useState<Employee | null>(null);
  const [quickPhotoSuccess, setQuickPhotoSuccess] = useState<string | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formHireDate, setFormHireDate] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(2000000);
  const [formBarcodeId, setFormBarcodeId] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees();
      if (res.success) {
        setEmployees(res.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setFormName('');
    setFormPosition('Kasir');
    setFormPhone('');
    setFormAddress('');
    setFormHireDate(new Date().toISOString().split('T')[0]);
    setFormBaseSalary(2000000);
    setFormBarcodeId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormPhotoUrl('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormPosition(emp.position);
    setFormPhone(emp.phone);
    setFormAddress(emp.address || '');
    setFormHireDate(emp.hire_date || '');
    setFormBaseSalary(emp.base_salary);
    setFormBarcodeId(emp.barcode_id);
    setFormPhotoUrl(emp.photo_url || '');
    setIsAddEditOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPosition.trim() || !formPhone.trim()) {
      alert('Nama, jabatan, dan nomor HP karyawan wajib diisi.');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        position: formPosition.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        hire_date: formHireDate,
        base_salary: formBaseSalary,
        barcode_id: formBarcodeId.trim(),
        photo_url: formPhotoUrl.trim() || null,
      };

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, payload);
      } else {
        await api.createEmployee(payload);
      }

      setIsAddEditOpen(false);
      loadEmployees();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data karyawan.');
    }
  };

  const handleDelete = (emp: Employee) => {
    setDeleteEmployeeTarget(emp);
  };

  const executeDelete = async () => {
    if (!deleteEmployeeTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteEmployee(deleteEmployeeTarget.id);
      setNotification({ message: `Data karyawan "${deleteEmployeeTarget.name}" berhasil dihapus.`, type: 'success' });
      setDeleteEmployeeTarget(null);
      loadEmployees();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus karyawan.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openIdCardModal = (emp: Employee) => {
    setIdCardEmployee(emp);
    setIsIdCardOpen(true);
  };

  const openAllIdCardsModal = () => {
    setIdCardEmployee(employees[0] || null);
    setIsIdCardOpen(true);
  };

  // Open slip gaji modal directly from employee card
  const handleOpenSlipGaji = async (emp: Employee) => {
    try {
      setLoadingSlip(true);
      const res = await api.getEmployeeSalarySlip(emp.id);
      if (res.success && res.slip) {
        setSlipData(res.slip);
        setIsSlipOpen(true);
      } else {
        alert(res.message || 'Gagal memuat slip gaji karyawan.');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil data slip gaji.');
    } finally {
      setLoadingSlip(false);
    }
  };

  const handleTriggerQuickPhoto = (emp: Employee) => {
    setQuickPhotoEmployee(emp);
    if (quickPhotoInputRef.current) {
      quickPhotoInputRef.current.value = '';
      quickPhotoInputRef.current.click();
    }
  };

  const handleQuickPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoEmployee) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WEBP).');
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const uploadRes = await api.uploadImage(base64, file.name);
          const newPhotoUrl = uploadRes.url || base64;

          await api.updateEmployee(quickPhotoEmployee.id, {
            ...quickPhotoEmployee,
            photo_url: newPhotoUrl,
          });

          setQuickPhotoSuccess(`Foto ${quickPhotoEmployee.name} berhasil diganti dari galeri!`);
          setTimeout(() => setQuickPhotoSuccess(null), 4000);
          loadEmployees();
        } catch (uploadErr: any) {
          alert(uploadErr.message || 'Gagal mengunggah foto.');
        } finally {
          setLoading(false);
          setQuickPhotoEmployee(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'Gagal memproses file foto.');
      setLoading(false);
    }
  };

  // Unique positions for filtering
  const positions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.position) set.add(e.position);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees for smooth, responsive experience
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.barcode_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPos = positionFilter === 'ALL' || emp.position === positionFilter;
      return matchSearch && matchPos;
    });
  }, [employees, searchQuery, positionFilter]);

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
      {/* Hidden file input for quick direct photo replacement from gallery */}
      <input
        type="file"
        ref={quickPhotoInputRef}
        onChange={handleQuickPhotoSelected}
        accept="image/*"
        className="hidden"
      />

      {quickPhotoSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{quickPhotoSuccess}</span>
          </div>
          <button
            onClick={() => setQuickPhotoSuccess(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Karyawan</h2>
          <p className="text-xs text-slate-500">
            Daftar karyawan, foto profil galeri, cetak kartu tanda pengenal barcode, dan cetak slip gaji.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {employees.length > 0 && (
            <button
              onClick={openAllIdCardsModal}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
              title="Cetak Semua Kartu ID Karyawan (A4 Sheet Siap Laminating)"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Cetak Kartu Karyawan</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar (Prevents lag when searching through lots of employees) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, barcode ID, atau No HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Jabatan:</span>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:bg-white"
          >
            <option value="ALL">Semua Jabatan ({employees.length})</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">Belum ada data karyawan</h3>
          <p className="text-xs text-slate-400">Klik "Tambah Karyawan" untuk mendaftarkan staf/karyawan baru.</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">Tidak ada karyawan yang cocok dengan pencarian "{searchQuery}".</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setPositionFilter('ALL');
            }}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    {/* Interactive Photo Avatar: Click to pick from gallery */}
                    <div
                      onClick={() => handleTriggerQuickPhoto(emp)}
                      title="Klik untuk ganti foto dari Galeri HP / Komputer"
                      className="relative group/avatar cursor-pointer shrink-0"
                    >
                      {emp.photo_url ? (
                        <img
                          src={emp.photo_url}
                          alt={emp.name}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-blue-400 shadow-xs"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-base flex items-center justify-center border-2 border-blue-300 shadow-xs">
                          {emp.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/60 rounded-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span>Ganti</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{emp.name}</h4>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        {emp.position}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                    {emp.barcode_id}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Gaji Pokok: Rp {emp.base_salary.toLocaleString('id-ID')}</span>
                  </div>
                  {emp.hire_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mulai Kerja: {emp.hire_date}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions with ID Card and Salary Slip Print */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <button
                    onClick={() => handleTriggerQuickPhoto(emp)}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                    title="Pilih foto dari Galeri HP / Komputer"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Foto</span>
                  </button>

                  <button
                    onClick={() => openIdCardModal(emp)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                    title="Cetak Kartu Tanda Pengenal & Barcode Absensi"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>Kartu ID</span>
                  </button>

                  <button
                    onClick={() => handleOpenSlipGaji(emp)}
                    disabled={loadingSlip}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Cetak Slip Gaji Karyawan ini"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Slip Gaji</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Edit Karyawan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(emp)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Hapus Karyawan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto no-print">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingEmployee ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rahmat Hidayat"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Peran *</label>
                  <input
                    type="text"
                    required
                    placeholder="Kasir / Barista / Koki"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor HP/WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode ID Karyawan *</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-1001"
                    value={formBarcodeId}
                    onChange={(e) => setFormBarcodeId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={formBaseSalary}
                    onChange={(e) => setFormBaseSalary(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Bekerja</label>
                <input
                  type="date"
                  value={formHireDate}
                  onChange={(e) => setFormHireDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  placeholder="Alamat tempat tinggal..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Photo Upload: Direct from Gallery / Camera instead of URL */}
              <ImageUploadPicker
                label="Foto Profil Karyawan (Pilih dari Galeri / Kamera)"
                value={formPhotoUrl}
                onChange={(url) => setFormPhotoUrl(url)}
                aspectRatio="square"
                placeholderText="Pilih foto karyawan dari Galeri HP / Komputer"
                helperText="Pilih langsung dari galeri foto. Format JPG, PNG, WEBP (maks 8MB)."
              />

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-md shadow-blue-600/20"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Employee ID Card Print Modal */}
      <EmployeeIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        selectedEmployee={idCardEmployee}
        allEmployees={employees}
      />

      {/* Salary Slip Print Modal */}
      <SalarySlipPrintModal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        slipData={slipData}
      />

      {/* Confirm Delete Employee Modal */}
      <ConfirmDeleteModal
        isOpen={deleteEmployeeTarget !== null}
        title="Hapus Karyawan"
        itemName={deleteEmployeeTarget ? `${deleteEmployeeTarget.name} (${deleteEmployeeTarget.position})` : ''}
        message="Apakah Anda yakin ingin menghapus data karyawan ini? Seluruh riwayat absensi dan data slip gaji karyawan ini juga akan dihapus."
        confirmText="Ya, Hapus Karyawan"
        isDeleting={isDeleting}
        onConfirm={executeDelete}
        onClose={() => setDeleteEmployeeTarget(null)}
      />
    </div>
  );
}
