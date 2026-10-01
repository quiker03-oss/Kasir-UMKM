import React from 'react';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { AuthUser } from '../types/index.ts';

interface ForbiddenViewProps {
  currentUser: AuthUser | null;
  attemptedArea: string;
  requiredRole?: string;
  onGoHome: () => void;
  onGoAuthorizedArea: () => void;
  onLogout: () => void;
}

export default function ForbiddenView({
  currentUser,
  attemptedArea,
  requiredRole = 'Tingkat akses lebih tinggi',
  onGoHome,
  onGoAuthorizedArea,
  onLogout,
}: ForbiddenViewProps) {
  const currentRole = (currentUser?.role || 'Pengunjung').toUpperCase();

  let destinationLabel = 'Kembali ke Area Anda';
  if (currentRole === 'KASIR' || currentRole === 'CASHIER') {
    destinationLabel = 'Kembali ke Halaman Kasir (POS)';
  } else if (currentRole === 'ADMIN_TOKO' || currentRole === 'ADMIN' || currentRole === 'OWNER') {
    destinationLabel = 'Kembali ke Dashboard Admin Toko';
  } else if (currentRole === 'SUPER_ADMIN' || currentRole === 'SUPERADMIN') {
    destinationLabel = 'Kembali ke Portal Super Admin';
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl mx-auto flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            HTTP 403 • Akses Ditolak
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-3">
            Tidak Memiliki Hak Akses
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            Anda mencoba mengakses halaman <span className="font-bold text-slate-200">{attemptedArea}</span>.
            Halaman ini membutuhkan hak akses <span className="font-bold text-amber-400">{requiredRole}</span>.
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-left text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Role Anda Saat Ini:</span>
            <span className="font-bold text-emerald-400">{currentRole}</span>
          </div>
          {currentUser?.store_name && (
            <div className="flex justify-between text-slate-400">
              <span>Toko Terdaftar:</span>
              <span className="font-bold text-slate-200 truncate max-w-[200px]">{currentUser.store_name}</span>
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={onGoAuthorizedArea}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{destinationLabel}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onGoHome}
              className="py-2.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border border-slate-600"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Halaman Depan</span>
            </button>

            <button
              onClick={onLogout}
              className="py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border border-rose-800/40"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
