'use client';

import React, { useEffect } from 'react';
import { CashierSidebar } from '@/components/layout/CashierSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CashierLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotes?: () => void;
}

export function CashierLayout({
  children,
  searchQuery,
  onSearchChange,
  onOpenNotes,
}: CashierLayoutProps) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (role === 'warehouse_operator') {
        router.push('/warehouse/dashboard');
      }
    }
  }, [user, role, isLoading, router]);

  if (!user && isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#A1A1AA]">Memuat OBATHAUS...</p>
        </div>
      </div>
    );
  }

  // Strict Warehouse Operator Restriction from POS Sales Interface
  if (role === 'warehouse_operator') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-4 sm:p-6 justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-[#ECEEF1] text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#18181B]">Akses Khusus Kasir Outlet</h2>
          <p className="text-xs text-[#71717A] leading-relaxed">
            Akun Anda terdaftar sebagai Operator Gudang Pusat. Operator gudang tidak memiliki wewenang untuk melakukan transaksi penjualan di POS Kasir.
          </p>
          <button
            onClick={() => router.push('/warehouse/dashboard')}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Buka Panel Gudang Logistik</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden select-none">
      {/* 1. Outlet Cashier Sidebar (with Expand/Collapse Toggle & Persisted State) */}
      <CashierSidebar />

      {/* 2. Main Work Area with Top Navigation */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onOpenNotes={onOpenNotes}
        />

        <main className="flex-1 overflow-hidden min-w-0 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
