import React, { useState } from 'react';
import { X, Camera, Save, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import ImageUploadPicker from './ImageUploadPicker.tsx';
import { api } from '../lib/api.ts';

interface ProductPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    image_url?: string | null;
  } | null;
  onPhotoUpdated: (productId: string, newImageUrl: string) => void;
}

export default function ProductPhotoModal({
  isOpen,
  onClose,
  product,
  onPhotoUpdated,
}: ProductPhotoModalProps) {
  const [imageUrl, setImageUrl] = useState<string>(product?.image_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when product changes
  React.useEffect(() => {
    if (product) {
      setImageUrl(product.image_url || '');
      setError(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await api.updateProductImage(product.id, imageUrl || null);
      if (res.success) {
        onPhotoUpdated(product.id, imageUrl);
        onClose();
      } else {
        setError(res.message || 'Gagal menyimpan foto produk.');
      }
    } catch (err: any) {
      console.error('Failed to save product image:', err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan foto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Foto Produk Depan</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          <ImageUploadPicker
            label="Pilih / Ganti Foto Depan"
            value={imageUrl}
            onChange={(url) => setImageUrl(url)}
            placeholderText="Upload foto dari Galeri HP / Kamera"
            helperText="Foto ini akan tampil di kasir POS dan menu pemesanan pelanggan."
            showPresets={true}
          />

          {/* Footer Actions */}
          <div className="pt-2 flex space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Foto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
