'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import {
  Coffee,
  ShoppingBag,
  LayoutDashboard,
  Clock,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export function Navbar() {
  const { user, role } = useAuth();
  const { settings } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-borderline sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF6B00] flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-heading text-base leading-tight">
                {settings?.store_name || 'OBATHAUS'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF7ED] text-[#FF6B00]">
                POS V1.0
              </span>
            </div>
            <p className="text-xs text-mutedtext hidden sm:block">
              {settings?.tagline || 'Operational System Management'}
            </p>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-canvas rounded-full text-xs font-semibold text-mutedtext border border-borderline">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeStr || 'Loading...'}</span>
        </div>

        {/* Right side navigation & user tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {role === 'admin' ? (
            pathname.startsWith('/admin') ? (
              <button
                onClick={() => router.push('/pos')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FF6B00] text-white hover:bg-[#EA580C] transition-colors shadow-xs cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Buka Mesin</span> POS
              </button>
            ) : (
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-heading text-white hover:bg-black transition-colors shadow-xs cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Kembali ke</span> Dashboard
              </button>
            )
          ) : (
            <button
              onClick={() => router.push('/pos')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#FF6B00] text-white shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>POS Kasir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
