'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UtensilsCrossed,
  Clock,
  Package,
  ReceiptText,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useOutlet } from '@/lib/outlet-context';
import { useShift } from '@/lib/shift-context';
import { TargetLogo } from '@/components/common/TargetLogo';

export function CashierSidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { settings } = useCart();
  const { activeOutlet } = useOutlet();
  const { activeShift, openShiftModal } = useShift();

  // State to toggle between expanded (w-60 with labels) and collapsed (w-20 icons only)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('pos_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('pos_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    {
      id: 'pos-menu',
      name: 'POS Menu Kasir',
      href: '/pos',
      icon: UtensilsCrossed,
      isActive: pathname === '/pos',
    },
    {
      id: 'pos-history',
      name: 'Riwayat Transaksi',
      href: '/pos/history',
      icon: Clock,
      isActive: pathname.startsWith('/pos/history'),
    },
    {
      id: 'pos-stock',
      name: 'Stok & Kiriman Cabang',
      href: '/pos/stock',
      icon: Package,
      isActive: pathname.startsWith('/pos/stock'),
    },
    {
      id: 'pos-expenses',
      name: 'Biaya Operasional',
      href: '/pos/expenses',
      icon: ReceiptText,
      isActive: pathname.startsWith('/pos/expenses'),
    },
  ];

  const rawStoreName = (settings?.store_name || 'Obat Haus').trim();
  const cleanBrand = rawStoreName.replace(/-\s*operational\s*system\s*management/i, '').trim() || 'Obat Haus';
  const outletLabel = activeOutlet ? activeOutlet.name.replace('Obat Haus - ', '') : 'Cabang POS';

  return (
    <aside
      className={`bg-white border-r border-[#ECEEF1] flex flex-col justify-between py-5 shrink-0 h-full select-none shadow-xs transition-all duration-200 z-20 ${
        isCollapsed ? 'w-20 items-center' : 'w-60'
      }`}
    >
      {/* 1. Top Header: Brand Mark & Collapse/Expand Toggle */}
      <div className="flex flex-col w-full">
        <div
          className={`flex pb-4 border-b border-[#ECEEF1] transition-all ${
            isCollapsed
              ? 'flex-col items-center gap-2 px-2'
              : 'flex-row items-center justify-between px-4'
          }`}
        >
          <Link
            href="/pos"
            className={`flex items-center gap-3 group cursor-pointer min-w-0 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={`${cleanBrand} - ${outletLabel}`}
          >
            {settings?.logo_url ? (
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center p-1 shadow-md shadow-orange-500/10 shrink-0">
                <img src={settings.logo_url} alt={cleanBrand} className="w-full h-full object-contain rounded-xl" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center p-1.5 shadow-md shadow-orange-500/10 shrink-0">
                <TargetLogo className="w-full h-full" />
              </div>
            )}

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-black text-[#18181B] truncate tracking-tight">{cleanBrand}</h2>
                <div className="flex items-center gap-1 text-[10px] text-[#FF6B00] font-bold truncate">
                  <Store className="w-3 h-3 shrink-0" />
                  <span className="truncate">{outletLabel}</span>
                </div>
              </div>
            )}
          </Link>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            title={isCollapsed ? 'Tampilkan Label Menu (Lebarkan)' : 'Sembunyikan Label Menu (Kecilkan)'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Outlet POS Navigation Stack */}
        <nav
          className={`flex flex-col gap-1 w-full overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar py-3 ${
            isCollapsed ? 'px-2 items-center' : 'px-3'
          }`}
        >
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-black tracking-wider text-[#A1A1AA] uppercase">
              PANEL OPERASIONAL OUTLET
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative group rounded-xl transition-all cursor-pointer flex items-center ${
                  isCollapsed
                    ? 'p-3 justify-center'
                    : 'px-3.5 py-2.5 gap-3 w-full'
                } ${
                  item.isActive
                    ? 'bg-[#FFF7ED] text-[#FF6B00] font-bold shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F8F9FA]'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    item.isActive ? 'text-[#FF6B00]' : 'text-[#71717A] group-hover:text-[#18181B]'
                  }`}
                />

                {!isCollapsed && (
                  <span className="text-xs truncate font-semibold leading-tight">
                    {item.name}
                  </span>
                )}

                {item.isActive && (
                  <span
                    className={`bg-[#FF6B00] rounded-full shrink-0 ${
                      isCollapsed
                        ? 'absolute -left-2 w-1.5 h-6 rounded-r-full'
                        : 'ml-auto w-1.5 h-4'
                    }`}
                  />
                )}

                {/* Tooltip on Hover when collapsed */}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Shift Control Button */}
          <div className={`pt-3 mt-2 border-t border-[#F0F0F0] w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
            {activeShift ? (
              <button
                type="button"
                onClick={() => openShiftModal('movement')}
                className={`rounded-xl transition-all cursor-pointer flex items-center border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ${
                  isCollapsed
                    ? 'p-3 justify-center relative group'
                    : 'px-3.5 py-2.5 gap-2.5 w-full text-xs font-bold'
                }`}
                title={`Shift Aktif (#${activeShift.shift_number}) — Kelola Kas`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {!isCollapsed && (
                  <div className="text-left min-w-0">
                    <div className="truncate font-black">Shift #{activeShift.shift_number} Aktif</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Kelola Kas & Tutup</div>
                  </div>
                )}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Shift #{activeShift.shift_number} Aktif
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openShiftModal('open')}
                className={`rounded-xl transition-all cursor-pointer flex items-center border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 animate-pulse ${
                  isCollapsed
                    ? 'p-3 justify-center relative group'
                    : 'px-3.5 py-2.5 gap-2.5 w-full text-xs font-bold'
                }`}
                title="Shift Kasir Belum Dibuka — Buka Shift"
              >
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                {!isCollapsed && (
                  <div className="text-left min-w-0">
                    <div className="truncate font-black">Buka Shift Kasir</div>
                    <div className="text-[10px] text-amber-700 font-medium">Modal Awal Kas</div>
                  </div>
                )}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Buka Shift Kasir
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Quick Switch to Admin Panel (For Admin/Owner only) */}
          {role === 'admin' && (
            <div className={`pt-2 w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
              <Link
                href="/admin/dashboard"
                className={`rounded-xl transition-all cursor-pointer flex items-center ${
                  isCollapsed
                    ? 'p-3 text-[#A1A1AA] hover:text-[#18181B] hover:bg-[#F4F4F5] justify-center relative group'
                    : 'px-3.5 py-2.5 gap-3 bg-[#18181B] text-white hover:bg-black font-bold text-xs shadow-2xs'
                }`}
                title="Beralih ke Admin & Owner Panel"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#FF6B00]" />
                {!isCollapsed && <span className="truncate">Admin Owner Panel</span>}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Admin Owner Panel
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* 3. Bottom User Profile & Logout */}
      <div className={`w-full pt-3 border-t border-[#ECEEF1] ${isCollapsed ? 'px-2 flex flex-col items-center' : 'px-3'}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] rounded-2xl border border-[#ECEEF1]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs font-black shrink-0 uppercase">
                {user?.full_name?.charAt(0) || 'K'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18181B] truncate">{user?.full_name || 'Kasir Outlet'}</p>
                <p className="text-[10px] text-[#A1A1AA] truncate font-medium">
                  {role === 'admin' ? 'Administrator' : role === 'warehouse_operator' ? 'Operator Gudang' : 'Kasir Cabang'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            className="group relative p-3 rounded-2xl text-[#A1A1AA] hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer flex items-center justify-center"
            title="Keluar (Logout)"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Keluar ({user?.full_name || 'Kasir'})
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
