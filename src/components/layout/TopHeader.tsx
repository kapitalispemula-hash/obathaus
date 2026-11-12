'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  ShieldCheck,
  UtensilsCrossed,
  Store,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useOutlet } from '@/lib/outlet-context';
import { NotificationPopover } from '@/components/layout/NotificationPopover';
import { getPendingOfflineSyncCount, syncOfflineQueue } from '@/lib/services/offline-sync';

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
  const { settings } = useCart();
  const { activeOutlet, availableOutlets, isAdmin, isAllOutletsSelected, setActiveOutletId } = useOutlet();

  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshSyncState = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
      setPendingSyncCount(getPendingOfflineSyncCount());
    };

    refreshSyncState();

    window.addEventListener('online', refreshSyncState);
    window.addEventListener('offline', refreshSyncState);
    window.addEventListener('obathaus_offline_queue_changed', refreshSyncState);
    window.addEventListener('obathaus_offline_queue_synced', refreshSyncState);
    window.addEventListener('storage', refreshSyncState);

    return () => {
      window.removeEventListener('online', refreshSyncState);
      window.removeEventListener('offline', refreshSyncState);
      window.removeEventListener('obathaus_offline_queue_changed', refreshSyncState);
      window.removeEventListener('obathaus_offline_queue_synced', refreshSyncState);
      window.removeEventListener('storage', refreshSyncState);
    };
  }, []);

  const handleHeaderSync = async () => {
    if (!isOnline || isSyncingNow) return;
    try {
      setIsSyncingNow(true);
      await syncOfflineQueue();
    } finally {
      setPendingSyncCount(getPendingOfflineSyncCount());
      setIsSyncingNow(false);
    }
  };

  const isCashierPanel = pathname.startsWith('/pos');
  const isAdminPanel = pathname.startsWith('/admin');

  const rawStoreName = (settings?.store_name || 'Obat Haus').trim();
  const cleanBrand = rawStoreName.replace(/-\s*operational\s*system\s*management/i, '').trim() || 'Obat Haus';

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-[#ECEEF1] px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-5 shrink-0 select-none">
      {/* 1. Left: Mobile Logo (Admin) + Search Input */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        {isAdminPanel && (
          <Link
            href="/admin/dashboard"
            className="lg:hidden flex items-center gap-2 shrink-0 min-w-0 group"
            title={cleanBrand}
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center p-0.5 shadow-2xs shrink-0 group-hover:border-[#FF6B00]/40 transition-colors">
              <img
                src={settings?.logo_url || '/logo.png'}
                alt={cleanBrand}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="hidden sm:flex flex-col min-w-0 leading-tight">
              <span className="text-xs font-black text-[#18181B] truncate tracking-tight">
                {cleanBrand}
              </span>
              <span className="text-[9px] font-extrabold text-[#FF6B00] uppercase tracking-wider">
                Admin Panel
              </span>
            </div>
          </Link>
        )}

        <div
          className={`relative flex-1 max-w-xl min-w-0 ${
            isAdminPanel && !onSearchChange ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="relative flex items-center bg-[#FAFAFA] border border-[#F0F0F0] rounded-2xl p-1 sm:p-1.5 focus-within:ring-2 focus-within:ring-[#FF6B00]/25 focus-within:border-[#FF6B00] focus-within:bg-white transition-all shadow-2xs">
            <Search className="w-4 h-4 text-[#A1A1AA] ml-2.5 sm:ml-3 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Cari menu makanan / minuman favorit..."
              className="w-full pl-2.5 sm:pl-3 pr-2 py-1 sm:py-1.5 bg-transparent text-xs sm:text-sm text-[#18181B] placeholder-[#A1A1AA] focus:outline-none min-w-0"
            />
            <button
              type="button"
              className="hidden sm:inline-flex px-4 lg:px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 2. Right: Multi-Outlet Switcher, Admin/POS Toggle, & Functional Notification Engine */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        {/* Multi-Outlet Switcher (Admin Global or Cashier Locked Badge) */}
        {isAdmin ? (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#FFF7ED] border border-[#FED7AA] px-2.5 sm:px-3 py-1.5 rounded-xl shadow-2xs max-w-[165px] sm:max-w-[230px] lg:max-w-none">
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF6B00] shrink-0" />
            <select
              value={isAllOutletsSelected ? 'all' : (activeOutlet?.id || 'all')}
              onChange={(e) => setActiveOutletId(e.target.value)}
              className="bg-transparent text-[11px] sm:text-xs font-bold text-[#18181B] focus:outline-none cursor-pointer truncate w-full"
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
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Buka POS Kasir"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buka POS</span>
            </button>
          )
        )}

        {/* Compact Offline / Pending Sync Pill */}
        {(!isOnline || pendingSyncCount > 0) && (
          <button
            type="button"
            onClick={handleHeaderSync}
            disabled={!isOnline || isSyncingNow}
            title={
              !isOnline
                ? `Mode Offline${pendingSyncCount > 0 ? ` — ${pendingSyncCount} antrean menunggu internet` : ''}`
                : `${pendingSyncCount} data offline belum tersinkron. Klik untuk sinkronkan sekarang.`
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shadow-2xs transition-colors shrink-0 ${
              !isOnline
                ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-default'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer'
            }`}
          >
            {!isOnline ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncingNow ? 'animate-spin' : ''}`} />
            )}
            <span className="hidden sm:inline">
              {!isOnline
                ? pendingSyncCount > 0
                  ? `Offline (${pendingSyncCount})`
                  : 'Offline'
                : isSyncingNow
                ? 'Menyinkron...'
                : `${pendingSyncCount} Pending Sync`}
            </span>
            <span className="sm:hidden tabular-nums">
              {pendingSyncCount > 0 ? pendingSyncCount : 'OFF'}
            </span>
          </button>
        )}

        {/* Real-time Interactive Notification Popover (Fully Functional) */}
        <NotificationPopover />
      </div>
    </header>
  );
}
