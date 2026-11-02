'use client';

import React, { useEffect } from 'react';
import { WarehouseSidebar } from '@/components/layout/WarehouseSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user && isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#A1A1AA]">Memuat Panel Gudang Logistik...</p>
        </div>
      </div>
    );
  }

  // Accessible by warehouse_operator AND admin
  if (role !== 'warehouse_operator' && role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-4 sm:p-6 justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-[#ECEEF1] text-center space-y-4">
          <div className="w-14 h-14 bg-[#FFF7ED] text-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto border border-[#FED7AA]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[#18181B]">Akses Khusus Logistik Gudang</h2>
          <p className="text-xs text-[#71717A] leading-relaxed">
            Halaman ini dikhususkan bagi Operator Gudang Pusat dan Administrator. Kasir outlet tidak memiliki wewenang untuk mengelola pengadaan dan stok gudang pusat.
          </p>
          <button
            onClick={() => router.push('/pos')}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke POS Kasir</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* 1. Left Icon Sidebar for Warehouse */}
      <WarehouseSidebar />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <TopHeader />

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
