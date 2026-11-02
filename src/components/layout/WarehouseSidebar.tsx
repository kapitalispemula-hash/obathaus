'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Package,
  FileText,
  Truck,
  Inbox,
  Send,
  RotateCcw,
  ClipboardCheck,
  History,
  ShieldCheck,
  LogOut,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { TargetLogo } from '@/components/common/TargetLogo';

export function WarehouseSidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { settings } = useCart();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('warehouse_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('warehouse_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    {
      id: 'dashboard',
      name: 'Dashboard Gudang',
      href: '/warehouse/dashboard',
      icon: LayoutGrid,
      isActive: pathname === '/warehouse/dashboard' || pathname === '/warehouse',
    },
    {
      id: 'stock',
      name: 'Stok Fisik Bahan',
      href: '/warehouse/stock',
      icon: Package,
      isActive: pathname.startsWith('/warehouse/stock') && !pathname.includes('stock-opname'),
    },
    {
      id: 'supplier-po',
      name: 'Pengadaan PO Supplier',
      href: '/warehouse/supplier-po',
      icon: FileText,
      isActive: pathname.startsWith('/warehouse/supplier-po'),
    },
    {
      id: 'supplier-receipts',
      name: 'Penerimaan Barang (GRN)',
      href: '/warehouse/supplier-receipts',
      icon: Truck,
      isActive: pathname.startsWith('/warehouse/supplier-receipts'),
    },
    {
      id: 'outlet-orders',
      name: 'Permintaan Cabang (PO)',
      href: '/warehouse/outlet-orders',
      icon: Inbox,
      isActive: pathname.startsWith('/warehouse/outlet-orders'),
    },
    {
      id: 'dispatch',
      name: 'Surat Jalan / Dispatch',
      href: '/warehouse/dispatch',
      icon: Send,
      isActive: pathname.startsWith('/warehouse/dispatch'),
    },
    {
      id: 'returns',
      name: 'Pemeriksaan Retur',
      href: '/warehouse/returns',
      icon: RotateCcw,
      isActive: pathname.startsWith('/warehouse/returns'),
    },
    {
      id: 'stock-opname',
      name: 'Stock Opname Fisik',
      href: '/warehouse/stock-opname',
      icon: ClipboardCheck,
      isActive: pathname.startsWith('/warehouse/stock-opname'),
    },
    {
      id: 'transactions',
      name: 'Riwayat Transaksi',
      href: '/warehouse/transactions',
      icon: History,
      isActive: pathname.startsWith('/warehouse/transactions'),
    },
  ];

  const storeName = (settings?.store_name || 'Obat Haus').trim();

  return (
    <aside
      className={`bg-white border-r border-[#ECEEF1] flex flex-col justify-between py-5 shrink-0 h-full select-none shadow-xs transition-all duration-200 z-20 ${
        isCollapsed ? 'w-20 items-center' : 'w-64'
      }`}
    >
      {/* 1. Top Brand Mark & Toggle */}
      <div className="flex flex-col w-full">
        <div
          className={`flex pb-4 border-b border-[#ECEEF1] transition-all ${
            isCollapsed
              ? 'flex-col items-center gap-2 px-2'
              : 'flex-row items-center justify-between px-4'
          }`}
        >
          <Link
            href="/warehouse/dashboard"
            className={`flex items-center gap-3 group cursor-pointer min-w-0 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={`${storeName} - Gudang Logistik Pusat`}
          >
            {settings?.logo_url ? (
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center p-1 shadow-md shadow-orange-500/10 shrink-0">
                <img src={settings.logo_url} alt={storeName} className="w-full h-full object-contain rounded-xl" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center p-1.5 shadow-md shadow-orange-500/10 shrink-0">
                <TargetLogo className="w-full h-full" />
              </div>
            )}

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-black text-[#18181B] truncate tracking-tight">{storeName}</h2>
                <div className="flex items-center gap-1 text-[10px] text-[#FF6B00] font-bold truncate">
                  <Store className="w-3 h-3 shrink-0" />
                  <span className="truncate">Gudang Logistik Pusat</span>
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            title={isCollapsed ? 'Tampilkan Label Menu (Lebarkan)' : 'Sembunyikan Label Menu (Kecilkan)'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* 2. Warehouse Navigation Stack */}
        <nav
          className={`flex flex-col gap-1 w-full overflow-y-auto max-h-[calc(100vh-210px)] no-scrollbar py-3 ${
            isCollapsed ? 'px-2 items-center' : 'px-3'
          }`}
        >
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-black tracking-wider text-[#A1A1AA] uppercase">
              OPERASIONAL LOGISTIK
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

                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Quick Switch to Admin Panel if User is Admin */}
          {role === 'admin' && (
            <div className={`pt-2 mt-2 border-t border-[#F0F0F0] w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
              <Link
                href="/admin/dashboard"
                className={`rounded-xl transition-all cursor-pointer flex items-center ${
                  isCollapsed
                    ? 'p-3 text-[#A1A1AA] hover:text-[#18181B] hover:bg-[#F4F4F5] justify-center relative group'
                    : 'px-3.5 py-2.5 gap-3 bg-[#F4F4F5] text-[#18181B] hover:bg-[#E4E4E7] font-bold text-xs shadow-2xs'
                }`}
                title="Buka Admin Panel (Owner)"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#18181B]" />
                {!isCollapsed && <span className="truncate">Admin Panel (Owner)</span>}
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Admin Panel
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
              <div className="w-8 h-8 rounded-full bg-[#18181B] text-white flex items-center justify-center text-xs font-black shrink-0 uppercase">
                {user?.full_name?.charAt(0) || 'G'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18181B] truncate">{user?.full_name || 'Operator Gudang'}</p>
                <p className="text-[10px] text-[#A1A1AA] truncate font-medium">Operator Gudang Pusat</p>
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
              Keluar ({user?.full_name || 'Operator Gudang'})
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
