import { useState } from 'react';
import {
  ShieldAlert,
  LogOut,
  Store,
  ExternalLink,
  Users,
  Server,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../types/index.ts';
import SuperAdminView from '../pages/SuperAdminView.tsx';

interface SuperAdminPortalProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenPublicShop: (slug?: string) => void;
}

export default function SuperAdminPortal({
  currentUser,
  onLogout,
  onOpenPublicShop,
}: SuperAdminPortalProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black shadow-lg shadow-purple-600/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white text-base tracking-tight">KASIR UMKM</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Super Admin Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Platform Pengelolaan Multi-Tenant Toko UMKM Seluruh Indonesia
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick link to public store preview */}
          <button
            onClick={() => onOpenPublicShop('kopi-nusantara')}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-purple-400" />
            <span>Pratinjau Toko Publik</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>

          {/* User profile & Logout */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">
                {currentUser.name || currentUser.full_name || 'Super Administrator'}
              </span>
              <span className="text-[10px] text-purple-400 font-mono">superadmin</span>
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
      <div className="bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-900/40 border-b border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Lingkungan Multi-Tenant Terisolasi: <strong>Database SQLite Master</strong></span>
        </div>
        <div className="hidden md:flex items-center space-x-4 text-[11px] text-slate-400">
          <span>Hak Akses: Penuh (Sistem & Kredensial Toko)</span>
          <span>Role: SUPER_ADMIN</span>
        </div>
      </div>

      {/* Main Super Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <SuperAdminView />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        KASIR UMKM Platform Super Admin &bull; 1 Source Code, Multi-Tenant Database Isolation
      </footer>
    </div>
  );
}
