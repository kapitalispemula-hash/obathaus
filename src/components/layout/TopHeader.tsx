'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  UtensilsCrossed,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { NotificationPopover } from '@/components/layout/NotificationPopover';

interface TopHeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotes?: () => void;
}

export function TopHeader({
  searchQuery = '',
  onSearchChange,
}: TopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  const { activeOutlet, availableOutlets, isAdmin, isAllOutletsSelected, setActiveOutletId } = useOutlet();

  const isCashierPanel = pathname.startsWith('/pos');

  return (
    <header className="h-20 bg-white border-b border-[#ECEEF1] px-6 sm:px-8 flex items-center justify-between gap-6 shrink-0 select-none">
      {/* 1. Left: Search Input with Orange "Search" Button (Logo removed as requested) */}
      <div className="relative flex-1 max-w-xl">
        <div className="relative flex items-center bg-[#FAFAFA] border border-[#F0F0F0] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#FF6B00]/25 focus-within:border-[#FF6B00] focus-within:bg-white transition-all shadow-2xs">
          <Search className="w-4 h-4 text-[#A1A1AA] ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Cari menu makanan / minuman favorit..."
            className="w-full pl-3 pr-2 py-1.5 bg-transparent text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:outline-none"
          />
          <button
            type="button"
            className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            Search
          </button>
        </div>
      </div>

      {/* 2. Right: Multi-Outlet Switcher, Admin/POS Toggle, & Functional Notification Engine */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Multi-Outlet Switcher (Admin Global or Cashier Locked Badge) */}
        {isAdmin ? (
          <div className="hidden lg:flex items-center gap-2 bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1.5 rounded-xl shadow-2xs">
            <Store className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <select
              value={isAllOutletsSelected ? 'all' : (activeOutlet?.id || 'all')}
              onChange={(e) => setActiveOutletId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#18181B] focus:outline-none cursor-pointer"
            >
              <option value="all">🌐 Semua Cabang (Konsolidasi)</option>
              {availableOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                </option>
              ))}
            </select>
          </div>
        ) : role === 'warehouse_operator' ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1.5 rounded-xl text-xs font-bold text-[#18181B] shadow-2xs">
            <Store className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="truncate max-w-[180px]">Gudang Logistik Pusat</span>
          </div>
        ) : activeOutlet ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#F4F4F5] border border-[#E4E4E7] px-3 py-1.5 rounded-xl text-xs font-bold text-[#18181B]">
            <Store className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span className="truncate max-w-[140px]">{activeOutlet.name}</span>
          </div>
        ) : null}

        {/* Switch to Admin / POS button */}
        {role === 'admin' && (
          isCashierPanel ? (
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#18181B] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Admin Panel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/pos')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Buka POS</span>
            </button>
          )
        )}

        {/* Real-time Interactive Notification Popover (Fully Functional) */}
        <NotificationPopover />
      </div>
    </header>
  );
}
