'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { TargetLogo } from '@/components/common/TargetLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { settings } = useCart();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawStoreName = (settings?.store_name || 'OBAT HAUS').trim();
  const cleanBrand = rawStoreName.replace(/-\s*operational\s*system\s*management/i, '').trim() || 'OBAT HAUS';
  let firstWord = 'OBAT';
  let secondWord = 'HAUS';
  if (cleanBrand.toUpperCase() === 'OBATHAUS') {
    firstWord = 'OBAT';
    secondWord = 'HAUS';
  } else {
    const parts = cleanBrand.split(/\s+/);
    firstWord = parts[0] || 'OBAT';
    secondWord = parts.slice(1).join(' ') || 'HAUS';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Harap isi username dan kata sandi.');
      return;
    }

    setLoading(true);
    const res = await login(username.trim(), password);
    setLoading(false);

    if (res.success) {
      if (res.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (res.role === 'warehouse_operator') {
        router.push('/warehouse/dashboard');
      } else {
        router.push('/pos');
      }
    } else {
      setErrorMessage(res.error || 'Login gagal.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-3xl bg-white shadow-md border border-[#ECEEF1]">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center p-1 shadow-2xs">
              <img src={settings?.logo_url || '/logo.png'} alt={cleanBrand} className="w-full h-full object-contain rounded-xl" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center tracking-tight font-black text-2xl text-[#18181B] uppercase">
              <span>{firstWord}</span>
              <span className="text-[#FF6B00] ml-1.5">{secondWord}</span>
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] ml-1 self-start mt-1.5" />
            </div>

            {/* Compact & Elegant Subtitle Badge */}
            <div className="flex items-center justify-center mt-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] bg-[#FFF7ED] border border-[#FED7AA] px-2.5 py-0.5 rounded-full">
                Operational System Management
              </span>
            </div>

            <p className="text-xs text-[#71717A] font-medium mt-2">
              {settings?.tagline || 'Authentic Coffee & Refreshing Drinks - Sulawesi Barat'}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="mt-7 bg-white py-8 px-6 sm:px-8 shadow-xl rounded-3xl border border-[#ECEEF1] space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin & Kasir"
                  required
                  autoFocus
                  autoComplete="username"
                  className="block w-full pl-10 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#18181B] uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl text-[#18181B] placeholder-[#A1A1AA] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A1A1AA] hover:text-[#18181B] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Vibrant Orange & Jet Black Shadow) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#FF6B00] hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 disabled:opacity-50 shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info: Labide Attribution */}
        <p className="mt-6 text-center text-xs text-[#71717A]">
          Dikembangkan Oleh <strong className="font-bold text-[#18181B]">LABIDE</strong> - Digital Creative Hub.
        </p>
      </div>
    </div>
  );
}
