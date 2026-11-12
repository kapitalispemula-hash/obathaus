'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { AdminInstallPromptModal } from '@/components/admin/AdminInstallPromptModal';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldAlert,
  ArrowLeft,
  LayoutGrid,
  Receipt,
  Wallet,
  CalendarCheck,
  Menu,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const MOBILE_BOTTOM_TABS = [
  {
    id: 'dashboard',
    label: 'Overview',
    href: '/admin/dashboard',
    icon: LayoutGrid,
    match: (p: string) => p === '/admin/dashboard',
  },
  {
    id: 'transactions',
    label: 'Transaksi',
    href: '/admin/transactions',
    icon: Receipt,
    match: (p: string) => p.startsWith('/admin/transactions'),
  },
  {
    id: 'reports',
    label: 'Laporan',
    href: '/admin/reports',
    icon: Wallet,
    match: (p: string) => p.startsWith('/admin/reports'),
  },
  {
    id: 'attendance',
    label: 'Absensi',
    href: '/admin/attendance',
    icon: CalendarCheck,
    match: (p: string) => p.startsWith('/admin/attendance'),
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user && isLoading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#A1A1AA]">Memuat Panel Administrator...</p>
        </div>
      </div>
    );
  }

  // Strict Cashier Restriction per PRD Section 2.2
  if (role !== 'admin') {
    return (
      <div className="min-h-dvh bg-white flex flex-col p-4 sm:p-6 justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-[#ECEEF1] text-center space-y-4">
          <div className="w-14 h-14 bg-[#FFF7ED] text-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#18181B]">Akses Dibatasi</h2>
          <p className="text-xs text-[#71717A] leading-relaxed">
            Halaman ini dikhususkan bagi Administrator. Kasir tidak memiliki wewenang untuk melihat HPP, margin laba, dan data manajerial toko.
          </p>
          <button
            onClick={() => router.push('/pos')}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Buka Panel Kasir (POS)</span>
          </button>
        </div>
      </div>
    );
  }

  const isAnyBottomDirectTabActive = MOBILE_BOTTOM_TABS.some((tab) => tab.match(pathname));
  const isMoreMenuActive = isMobileMenuOpen || !isAnyBottomDirectTabActive;

  return (
    <div className="flex h-dvh min-h-dvh w-full bg-white overflow-hidden select-none">
      {/* Desktop Administrator Sidebar */}
      <div className="hidden lg:flex h-full shrink-0">
        <AdminSidebar />
      </div>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Admin"
        >
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full flex shadow-2xl animate-in slide-in-from-left duration-200">
            <AdminSidebar
              isMobileDrawer
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        <TopHeader />
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 pb-24 lg:pb-8 overflow-y-auto min-w-0 bg-[#FBFBFC]">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile PWA Install Modal (Android & iOS) */}
      <AdminInstallPromptModal />

      {/* Static Mobile & Tablet Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Cepat Admin"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#ECEEF1] shadow-[0_-6px_24px_rgba(24,24,27,0.06)] pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <div className="grid grid-cols-5 h-16 px-1.5 max-w-lg mx-auto">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.match(pathname) && !isMobileMenuOpen;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl my-1 transition-all cursor-pointer ${
                  active
                    ? 'text-[#FF6B00]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                    active ? 'bg-[#FFF7ED]' : ''
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${active ? 'text-[#FF6B00]' : ''}`} />
                </span>
                <span
                  className={`text-[10px] leading-none tracking-tight ${
                    active ? 'font-extrabold text-[#FF6B00]' : 'font-semibold'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-1 rounded-2xl my-1 transition-all cursor-pointer ${
              isMoreMenuActive
                ? 'text-[#FF6B00]'
                : 'text-[#71717A] hover:text-[#18181B]'
            }`}
            aria-expanded={isMobileMenuOpen}
          >
            <span
              className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-colors ${
                isMoreMenuActive ? 'bg-[#FFF7ED]' : ''
              }`}
            >
              <Menu className={`w-4.5 h-4.5 ${isMoreMenuActive ? 'text-[#FF6B00]' : ''}`} />
              {!isAnyBottomDirectTabActive && !isMobileMenuOpen && (
                <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
              )}
            </span>
            <span
              className={`text-[10px] leading-none tracking-tight ${
                isMoreMenuActive ? 'font-extrabold text-[#FF6B00]' : 'font-semibold'
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
