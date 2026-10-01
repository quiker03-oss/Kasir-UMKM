import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { AuthUser } from '../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onOpenPublicShop?: (slug?: string) => void;
  onGoToHome?: () => void;
  onOpenDirectory?: () => void;
  onGoToSuperAdmin?: () => void;
}

export default function LoginView({
  onLoginSuccess,
  onGoToHome,
}: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const cleanUser = username.trim();
      const res = await api.login({
        username: cleanUser,
        email: cleanUser,
        password,
      });

      if (res.success && res.user && res.token) {
        onLoginSuccess(res.user, res.token);
      } else {
        setErrorMessage(res.message || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal. Periksa kembali username dan password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030d08] text-emerald-50 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Dynamic Emerald Ambient Lighting & Subtle Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top Center Emerald Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] rounded-full bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent blur-[140px]" />
        {/* Bottom Ambient Glow */}
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[150px]" />
        
        {/* Modern Cyber Grid Texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(rgba(52, 211, 153, 0.9) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Link to Home */}
        {onGoToHome && (
          <div className="mb-4">
            <button
              type="button"
              onClick={onGoToHome}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        )}

        {/* Outer Glow Halo Frame */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-emerald-500/30 via-teal-500/20 to-emerald-600/15 blur-xl opacity-80" />

          {/* Login Card */}
          <div className="relative rounded-3xl bg-[#071810]/95 border border-emerald-500/30 hover:border-emerald-500/40 p-6 sm:p-8 shadow-2xl shadow-emerald-950/90 backdrop-blur-2xl space-y-6 transition-colors">
            
            {/* Header with High-Tech Emerald Glow Icon */}
            <div className="text-center space-y-3">
              <div className="relative w-14 h-14 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-[#05130d] rounded-[14px] flex items-center justify-center">
                    <Lock className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Login
                </h1>
                <p className="text-xs text-emerald-200/70 mt-1 font-medium">
                  Masukkan username dan password Anda
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl text-rose-200 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Form: Username & Password */}
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-emerald-100 font-semibold">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Masukkan username atau email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3.5 bg-[#030d08]/90 border border-emerald-900/70 hover:border-emerald-600/50 rounded-xl text-white placeholder-emerald-700/60 focus:outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium text-xs shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-emerald-100 font-semibold">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3.5 bg-[#030d08]/90 border border-emerald-900/70 hover:border-emerald-600/50 rounded-xl text-white placeholder-emerald-700/60 focus:outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium text-xs shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400/70 hover:text-emerald-300 p-1 rounded-lg hover:bg-emerald-950/60 transition-colors cursor-pointer"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button with High-Contrast Green Glow */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50 transition-all duration-200 flex items-center justify-center space-x-2 group cursor-pointer"
              >
                <span>{loading ? 'Memverifikasi...' : 'Login'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
