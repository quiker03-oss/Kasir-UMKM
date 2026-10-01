import React, { useState, useRef } from 'react';
import {
  ImagePlus,
  Camera,
  X,
  Link2,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.ts';

// Preset culinary photos with reliable, fast Unsplash CDN images
export const CULINARY_PHOTO_PRESETS = [
  {
    name: 'Kopi Susu Gula Aren',
    category: 'Kopi',
    url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Iced Americano / Kopi Hitam',
    category: 'Kopi',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Matcha Latte / Green Tea',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Es Teh Manis Melati',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Es Jeruk / Lemon Tea',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Ayam Geprek Sambal Bawang',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Nasi Goreng Spesial',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mie Goreng Jawa / Bakmi',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bakso Sapi Urat',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Kentang Goreng (French Fries)',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Roti Bakar Cokelat Keju',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pisang Goreng Crispy',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dimsum Siomay Ayam',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Burger & Sandwich',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
];

interface ImageUploadPickerProps {
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
  aspectRatio?: 'square' | 'wide';
  placeholderText?: string;
  helperText?: string;
  showPresets?: boolean;
}

export default function ImageUploadPicker({
  label = 'Foto Produk',
  value,
  onChange,
  aspectRatio = 'square',
  placeholderText = 'Pilih foto dari Galeri HP / Kamera',
  helperText = 'Format JPG, PNG, WEBP. Maks. 8MB.',
  showPresets = true,
}: ImageUploadPickerProps) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(value || '');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Compress & resize image to max dimension 1200px client-side for fast upload
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Gagal memproses file foto.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berformat gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Ukuran foto terlalu besar (maksimal 8MB).');
      return;
    }

    try {
      setError(null);
      setUploading(true);
      const compressedDataUrl = await compressImage(file);

      // Upload to server
      const res = await api.uploadImage(compressedDataUrl, file.name);
      if (res.success && res.url) {
        onChange(res.url);
      } else {
        // Fallback to data URL if server upload had an issue
        onChange(compressedDataUrl);
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError(err.message || 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    setError(null);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setError(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700 text-xs">{label}</label>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === 'upload' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload / Kamera
          </button>
          {showPresets && (
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`px-2 py-1 rounded-md transition-colors flex items-center space-x-0.5 ${
                activeTab === 'preset' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>Preset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2 py-1 rounded-md transition-colors ${
              activeTab === 'url' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Link URL
          </button>
        </div>
      </div>

      {/* Hidden Native File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview if image is present */}
      {value ? (
        <div className="relative border border-emerald-200 bg-emerald-50/40 rounded-2xl overflow-hidden p-2.5 flex items-center space-x-3 transition-all">
          <div
            className={`relative rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs ${
              aspectRatio === 'square' ? 'w-20 h-20' : 'w-28 h-20'
            }`}
          >
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold mb-1">
              <Check className="w-3.5 h-3.5" />
              <span>Foto Aktif Terpasang</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
              {value.startsWith('/uploads/')
                ? 'Tersimpan di server internal'
                : value.startsWith('data:')
                ? 'Gambar Base64'
                : value}
            </p>

            <div className="flex items-center space-x-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-2xs"
              >
                {uploading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                ) : (
                  <ImagePlus className="w-3 h-3 text-emerald-600" />
                )}
                <span>Ganti</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="px-2.5 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 shadow-2xs"
              >
                <X className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 1: Upload from Gallery or Camera */}
      {activeTab === 'upload' && !value && (
        <div className="grid grid-cols-2 gap-2">
          {/* Gallery Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 bg-slate-50/70 rounded-2xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer text-center group"
          >
            {uploading ? (
              <div className="flex flex-col items-center py-2 space-y-1">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700">Mengunggah...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-1.5 shadow-2xs">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Buka Galeri HP</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Pilih file foto</span>
              </>
            )}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 bg-slate-50/70 rounded-2xl p-4 flex flex-col items-center justify-center transition-all cursor-pointer text-center group"
          >
            {uploading ? (
              <div className="flex flex-col items-center py-2 space-y-1">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700">Mengunggah...</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-1.5 shadow-2xs">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">Foto Kamera</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Ambil langsung</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 2: Curated Culinary Presets */}
      {activeTab === 'preset' && (
        <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Pilih Foto Siap Pakai
            </span>
            <span className="text-slate-400">Klik untuk pasang</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {CULINARY_PHOTO_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(preset.url);
                  setError(null);
                }}
                className={`group relative rounded-xl overflow-hidden border text-left transition-all ${
                  value === preset.url
                    ? 'border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                    : 'border-slate-200 hover:border-emerald-400 bg-white'
                }`}
              >
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                    loading="lazy"
                  />
                </div>
                <div className="p-1 bg-white">
                  <p className="text-[9px] font-bold text-slate-800 line-clamp-1 leading-tight">
                    {preset.name}
                  </p>
                </div>
                {value === preset.url && (
                  <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Direct URL Mode */}
      {activeTab === 'url' && (
        <div className="space-y-1.5 border border-slate-200 rounded-2xl p-3 bg-slate-50">
          <label className="block text-[11px] font-semibold text-slate-600">Alamat URL Gambar Web</label>
          <div className="flex items-center space-x-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Terapkan
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Dapat menggunakan link gambar dari Unsplash, Pexels, Google Drive, atau hosting online.
          </p>
        </div>
      )}
    </div>
  );
}
