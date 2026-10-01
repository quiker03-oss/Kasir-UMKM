import { Trash2, AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  itemName?: string;
  confirmText?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title,
  message,
  itemName,
  confirmText = 'Ya, Hapus Sekarang',
  isDeleting = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">{title}</h3>
              <p className="text-[11px] text-rose-700 font-medium">Konfirmasi Tindakan Hapus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            {message || 'Apakah Anda yakin ingin menghapus data ini secara permanen?'}
          </p>

          {itemName && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-900 font-mono text-[11px] truncate">
                {itemName}
              </span>
            </div>
          )}

          <p className="text-[11px] text-rose-600 font-semibold bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
            ⚠️ Tindakan ini permanen dan data yang dihapus tidak dapat dipulihkan kembali.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isDeleting ? 'Menghapus...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
