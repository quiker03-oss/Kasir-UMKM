import { useState, useEffect } from 'react';
import { Store, Save, ExternalLink, RefreshCw, QrCode, CreditCard, Receipt } from 'lucide-react';
import { api } from '../lib/api.ts';
import ImageUploadPicker from '../components/ImageUploadPicker.tsx';

interface StoreSettingsViewProps {
  onOpenPublicShop: (slug: string) => void;
}

export default function StoreSettingsView({ onOpenPublicShop }: StoreSettingsViewProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [qrisImageUrl, setQrisImageUrl] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getStoreProfile();
      if (res.success && res.store) {
        const s = res.store;
        setName(s.name || '');
        setSlug(s.slug || '');
        setDescription(s.description || '');
        setLogoUrl(s.logo_url || '');
        setAddress(s.address || '');
        setPhone(s.phone || '');
        setOpeningHours(s.opening_hours || '');
        setReceiptFooter(s.receipt_footer || '');
        setBankName(s.bank_name || '');
        setBankAccountNumber(s.bank_account_number || '');
        setBankAccountHolder(s.bank_account_holder || '');
        setQrisImageUrl(s.qris_image_url || '');
      }
    } catch (err) {
      console.error('Failed to load store profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama toko wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.updateStoreProfile({
        name: name.trim(),
        description: description.trim(),
        logo_url: logoUrl.trim() || null,
        address: address.trim(),
        phone: phone.trim(),
        opening_hours: openingHours.trim(),
        receipt_footer: receiptFooter.trim(),
        bank_name: bankName.trim(),
        bank_account_number: bankAccountNumber.trim(),
        bank_account_holder: bankAccountHolder.trim(),
        qris_image_url: qrisImageUrl.trim() || null,
      });

      if (res.success) {
        alert('Pengaturan toko berhasil disimpan!');
        loadProfile();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan profil toko.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Toko & Kasir</h2>
          <p className="text-xs text-slate-500">
            Identitas usaha, jam operasional, footer struk belanja, dan rekening pembayaran pelanggan.
          </p>
        </div>

        {slug && (
          <button
            type="button"
            onClick={() => onOpenPublicShop(slug)}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-emerald-200 self-start"
          >
            <span>Buka Toko Online Pelanggan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <Store className="w-4 h-4 text-emerald-600" />
            <span>Identitas Toko / Warung / Kedai</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Usaha Toko *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slug URL Toko (Otomatis)</label>
              <input
                type="text"
                disabled
                value={slug}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat Usaha</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Kedai kopi lokal dengan racikan kopi nusantara & camilan hangat"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / HP Toko</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam Operasional Toko</label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="Setiap hari: 08:00 - 22:00 WIB"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Toko</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jalan Malioboro No. 45, Yogyakarta"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          <ImageUploadPicker
            label="Logo Toko"
            value={logoUrl}
            onChange={(url) => setLogoUrl(url)}
            aspectRatio="square"
            placeholderText="Pilih logo toko dari Galeri HP / Komputer"
            helperText="Logo akan tampil di struk belanja & katalog online"
          />
        </div>

        {/* Receipt Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Cetak Struk Kasir</span>
          </h3>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Kaki Struk (Receipt Footer Note)
            </label>
            <textarea
              rows={3}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Payment Settings: Bank & QRIS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Pembayaran Digital (Transfer Bank & QRIS)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Bank</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BCA / BRI / Mandiri / BNI"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening Bank</label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Atas Nama (Pemilik Rekening)</label>
              <input
                type="text"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Nama Pemilik Toko"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <ImageUploadPicker
            label="Foto / Gambar Barcode QRIS Toko"
            value={qrisImageUrl}
            onChange={(url) => setQrisImageUrl(url)}
            aspectRatio="square"
            placeholderText="Pilih foto QRIS dari Galeri HP / Komputer"
            helperText="Foto QRIS akan dipindai oleh pelanggan saat checkout QRIS"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs flex items-center space-x-2 shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
