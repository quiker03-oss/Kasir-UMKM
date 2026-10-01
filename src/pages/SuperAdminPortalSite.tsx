import { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  ArrowRight,
  LogOut,
  Store,
  ExternalLink,
  Layers,
  Sparkles,
  Home,
  CheckCircle2,
  Server,
  RefreshCw,
  Key,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { AuthUser } from '../types/index.ts';
import SuperAdminView from './SuperAdminView.tsx';
import ForbiddenView from '../components/ForbiddenView.tsx';

interface SuperAdminPortalSiteProps {
  currentUser: AuthUser | null;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onLogout: () => void;
  onGoToHome: () => void;
  onOpenPublicShop: (slug?: string) => void;
}

export default function SuperAdminPortalSite({
  currentUser,
  onLoginSuccess,
  onLogout,
  onGoToHome,
  onOpenPublicShop,
}: SuperAdminPortalSiteProps) {
  // Login form state (if not logged in as SUPER_ADMIN)
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSuperAdmin =
    currentUser &&
    (currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'SUPERADMIN' ||
      (currentUser.role || '').toUpperCase() === 'SUPER_ADMIN');

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.login({ email: username.trim(), password: password.trim() });
      if (res.success && res.user && res.token) {
        const role = (res.user.role || '').toUpperCase();
        if (role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') {
          setErrorMessage(
            'Akun ini bukan Super Admin. Portal ini khusus untuk akun pengelola platform.'
          );
          return;
        }
        onLoginSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login Super Admin gagal. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCreds = () => {
    setUsername('superadmin');
    setPassword('password123');
  };

  // If a regular store user (Kasir or Admin Toko) attempts to access Super Admin
  if (currentUser && !isSuperAdmin) {
    return (
      <ForbiddenView
        currentUser={currentUser}
        attemptedArea="Portal Super Admin Platform"
        requiredRole="SUPER_ADMIN"
        onGoHome={onGoToHome}
        onGoAuthorizedArea={() => {
          window.location.hash = '';
          onGoToHome();
        }}
        onLogout={onLogout}
      />
    );
  }

  // If user is logged in as Super Admin, display the full Super Admin Console
  if (isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-purple-600 selection:text-white">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-purple-900/40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 flex items-center justify-center font-black shadow-lg shadow-purple-600/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base tracking-tight">KASIR UMKM</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Super Admin Website
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pusat Kontrol & Pengelolaan Seluruh Akun Toko UMKM
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Back to Home Landing Page */}
            <button
              onClick={onGoToHome}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Halaman Depan</span>
            </button>

            {/* Quick link to public store preview */}
            <button
              onClick={() => onOpenPublicShop('kopi-nusantara')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-purple-400" />
              <span>Pratinjau Toko</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            {/* User profile & Logout */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden md:block">
                <span className="text-xs font-bold text-white block">
                  {currentUser.name || currentUser.full_name || 'Super Administrator'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono">Platform Manager</span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Keluar dari Portal Super Admin"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Sub-header Banner */}
        <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border-b border-purple-900/30 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Lingkungan Multi-Tenant: <strong>Database Master Terisolasi</strong></span>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Role: SUPER_ADMIN</span>
            <span>Akses Penuh Pengelolaan Akun Toko</span>
          </div>
        </div>

        {/* Main Super Admin Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <SuperAdminView />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
          KASIR UMKM Platform Super Admin Website &bull; 1 Source Code, Multi-Tenant Database
        </footer>
      </div>
    );
  }

  // If not logged in as Super Admin, display dedicated Super Admin Login Page
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Bar with Home Link */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <button
          onClick={onGoToHome}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors"
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Kembali ke Website Utama</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[11px] font-mono text-purple-400 uppercase tracking-wider">
            Super Admin Secure Portal
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30 mb-3">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider border border-purple-500/40">
              Restricted Area
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Super Admin Website
            </h1>
            <p className="text-xs text-slate-400">
              Akses khusus untuk mengelola akun toko, subdomain, aktivasi toko, dan performa platform.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username Super Admin:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="superadmin"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Memverifikasi Akses...' : 'Masuk ke Konsol Super Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fill Button */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
            <button
              type="button"
              onClick={handleFillDemoCreds}
              className="inline-flex items-center space-x-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Gunakan Kredensial Bawaan (superadmin / password123)</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Hanya akun dengan hak akses Super Admin yang diizinkan mengelola toko di portal ini.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-600">
        KASIR UMKM Platform &bull; Super Admin Management Website
      </footer>
    </div>
  );
}
