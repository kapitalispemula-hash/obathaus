'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  ShoppingBag,
  Layers,
  Tags,
  Package,
  Scale,
  Truck,
  FileCheck,
  Receipt,
  Wallet,
  Tag,
  Users,
  Settings,
  UtensilsCrossed,
  LogOut,
  BookOpen,
  Store,
  ClipboardList,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarCheck,
  X,
  Download,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { TargetLogo } from '@/components/common/TargetLogo';

interface AdminSidebarProps {
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ isMobileDrawer = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { settings } = useCart();

  // State to toggle between expanded (w-64 with labels) and collapsed (w-20 icons only)
  // Default to false (expanded) as requested by the user
  const [isCollapsedState, setIsCollapsedState] = useState<boolean>(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsedState(saved === 'true');
    }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandaloneMode(standalone);
  }, []);

  const isCollapsed = isMobileDrawer ? false : isCollapsedState;

  const toggleCollapse = () => {
    setIsCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navSections = [
    {
      title: 'UTAMA',
      items: [
        {
          id: 'dashboard',
          name: 'Dashboard Overview',
          href: '/admin/dashboard',
          icon: LayoutGrid,
          isActive: pathname === '/admin/dashboard',
        },
      ],
    },
    {
      title: 'CABANG & RESEP',
      items: [
        {
          id: 'outlets',
          name: 'Cabang & Gudang',
          href: '/admin/outlets',
          icon: Building2,
          isActive: pathname.startsWith('/admin/outlets'),
        },
        {
          id: 'outlet-menus',
          name: 'Menu & Harga Cabang',
          href: '/admin/outlet-menus',
          icon: Tags,
          isActive: pathname.startsWith('/admin/outlet-menus'),
        },
        {
          id: 'recipes',
          name: 'Resep Menu & HPP (BOM)',
          href: '/admin/recipes',
          icon: BookOpen,
          isActive: pathname.startsWith('/admin/recipes'),
        },
        {
          id: 'products',
          name: 'Kelola Produk Menu',
          href: '/admin/products',
          icon: ShoppingBag,
          isActive: pathname === '/admin/products',
        },
        {
          id: 'categories',
          name: 'Kelola Kategori',
          href: '/admin/categories',
          icon: Layers,
          isActive: pathname.startsWith('/admin/categories'),
        },
      ],
    },
    {
      title: 'PERSEDIAAN & STOK',
      items: [
        {
          id: 'raw-materials',
          name: 'Master Bahan Baku',
          href: '/admin/raw-materials',
          icon: Package,
          isActive: pathname.startsWith('/admin/raw-materials'),
        },
        {
          id: 'outlet-stocks',
          name: 'Stok Bahan 7 Cabang',
          href: '/admin/outlet-stocks',
          icon: Store,
          isActive: pathname.startsWith('/admin/outlet-stocks'),
        },
        {
          id: 'stock-ledger',
          name: 'Buku Besar Stok (Ledger)',
          href: '/admin/stock-ledger',
          icon: ClipboardList,
          isActive: pathname.startsWith('/admin/stock-ledger'),
        },
        {
          id: 'units',
          name: 'Satuan & Konversi',
          href: '/admin/units',
          icon: Scale,
          isActive: pathname.startsWith('/admin/units'),
        },
        {
          id: 'suppliers',
          name: 'Data Supplier',
          href: '/admin/suppliers',
          icon: Truck,
          isActive: pathname === '/admin/suppliers',
        },
        {
          id: 'supplier-pos',
          name: 'Persetujuan PO Supplier',
          href: '/admin/supplier-pos',
          icon: FileCheck,
          isActive: pathname.startsWith('/admin/supplier-pos'),
        },
      ],
    },
    {
      title: 'KEUANGAN & SHIFT',
      items: [
        {
          id: 'transactions',
          name: 'Semua Transaksi Toko',
          href: '/admin/transactions',
          icon: Receipt,
          isActive: pathname.startsWith('/admin/transactions'),
        },
        {
          id: 'shifts',
          name: 'Shift Kasir & Kas',
          href: '/admin/shifts',
          icon: Clock,
          isActive: pathname.startsWith('/admin/shifts'),
        },
        {
          id: 'reports',
          name: 'Laporan Finansial & HPP',
          href: '/admin/reports',
          icon: Wallet,
          isActive: pathname.startsWith('/admin/reports'),
        },
        {
          id: 'expenses',
          name: 'Biaya Operasional',
          href: '/admin/expenses',
          icon: Tag,
          isActive: pathname.startsWith('/admin/expenses'),
        },
      ],
    },
    {
      title: 'SISTEM & PENGGUNA',
      items: [
        {
          id: 'attendance',
          name: 'Absensi & Kehadiran',
          href: '/admin/attendance',
          icon: CalendarCheck,
          isActive: pathname.startsWith('/admin/attendance'),
        },
        {
          id: 'audit-logs',
          name: 'Audit Trail Sistem',
          href: '/admin/audit-logs',
          icon: ShieldAlert,
          isActive: pathname.startsWith('/admin/audit-logs'),
        },
        {
          id: 'users',
          name: 'Kasir & Pengguna',
          href: '/admin/users',
          icon: Users,
          isActive: pathname.startsWith('/admin/users'),
        },
        {
          id: 'settings',
          name: 'Pengaturan Toko',
          href: '/admin/settings',
          icon: Settings,
          isActive: pathname.startsWith('/admin/settings'),
        },
      ],
    },
  ];

  const rawStoreName = (settings?.store_name || 'Obat Haus').trim();
  const cleanBrand = rawStoreName.replace(/-\s*operational\s*system\s*management/i, '').trim() || 'Obat Haus';

  return (
    <aside
      className={`bg-white border-r border-[#ECEEF1] flex flex-col justify-between py-4 sm:py-5 shrink-0 h-full select-none shadow-xs transition-all duration-200 z-20 ${
        isMobileDrawer ? 'w-72 max-w-[85vw]' : isCollapsed ? 'w-20 items-center' : 'w-64'
      }`}
    >
      {/* 1. Top Header: Brand Mark & Expand/Collapse Toggle (or Mobile Close) */}
      <div className="flex flex-col w-full min-h-0 flex-1">
        <div
          className={`flex pb-4 border-b border-[#ECEEF1] transition-all shrink-0 ${
            isCollapsed
              ? 'flex-col items-center gap-2 px-2'
              : 'flex-row items-center justify-between px-5'
          }`}
        >
          <Link
            href="/admin/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 group cursor-pointer min-w-0 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={cleanBrand}
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center p-0.5 shadow-md shadow-orange-500/10 shrink-0">
              <img src={settings?.logo_url || '/logo.png'} alt={cleanBrand} className="w-full h-full object-contain rounded-xl" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-black text-[#18181B] truncate tracking-tight">{cleanBrand}</h2>
                <p className="text-[10px] text-[#FF6B00] font-bold">Operational System Management</p>
              </div>
            )}
          </Link>

          {/* Toggle or Mobile Drawer Close Button */}
          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-2 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
              title="Tutup Menu"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
              title={isCollapsed ? 'Tampilkan Nama Menu (Lebarkan)' : 'Sembunyikan Label Menu (Kecilkan)'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* 2. Admin Navigation Stack */}
        <nav
          className={`flex flex-col gap-1 w-full flex-1 min-h-0 overflow-y-auto no-scrollbar py-3 ${
            isCollapsed ? 'px-2 items-center' : 'px-3'
          }`}
        >
          {navSections.map((section, sIdx) => (
            <div key={section.title} className="w-full">
              {/* Section Divider & Header (Visible when expanded) */}
              {!isCollapsed ? (
                <div className={`px-3 pb-1 text-[10px] font-black tracking-wider text-[#A1A1AA] uppercase ${sIdx > 0 ? 'pt-3' : 'pt-1'}`}>
                  {section.title}
                </div>
              ) : sIdx > 0 ? (
                <div className="w-6 h-[1px] bg-[#F0F0F0] my-2" />
              ) : null}

              {/* Section Menu Items */}
              <div className="flex flex-col gap-1 w-full">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onCloseMobile}
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

                      {/* Text Label (when expanded) */}
                      {!isCollapsed && (
                        <span className="text-xs truncate font-semibold leading-tight">
                          {item.name}
                        </span>
                      )}

                      {/* Active Indicator Bar */}
                      {item.isActive && (
                        <span
                          className={`bg-[#FF6B00] rounded-full shrink-0 ${
                            isCollapsed
                              ? 'absolute -left-2 w-1.5 h-6 rounded-r-full'
                              : 'ml-auto w-1.5 h-4'
                          }`}
                        />
                      )}

                      {/* Tooltip on Hover (when collapsed) */}
                      {isCollapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Switch to POS Cashier */}
          <div className={`pt-3 mt-2 border-t border-[#F0F0F0] w-full ${isCollapsed ? 'flex justify-center' : ''}`}>
            <Link
              href="/pos"
              onClick={onCloseMobile}
              className={`rounded-xl transition-all cursor-pointer flex items-center ${
                isCollapsed
                  ? 'p-3 text-[#A1A1AA] hover:text-[#FF6B00] hover:bg-[#FFF7ED] justify-center relative group'
                  : 'px-3.5 py-2.5 gap-3 bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFEDD5] font-bold text-xs shadow-2xs'
              }`}
              title="Buka Mesin Kasir (POS)"
            >
              <UtensilsCrossed className="w-4 h-4 shrink-0 text-[#FF6B00]" />
              {!isCollapsed && <span className="truncate">Buka POS Kasir</span>}
              {isCollapsed && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-xl bg-[#FF6B00] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Buka POS Kasir
                </span>
              )}
            </Link>

            {isMobileDrawer && !isStandaloneMode && (
              <button
                type="button"
                onClick={() => {
                  onCloseMobile?.();
                  window.dispatchEvent(new CustomEvent('open-admin-install-modal'));
                }}
                className="mt-2 w-full rounded-xl px-3.5 py-2.5 gap-3 bg-[#18181B] hover:bg-black text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center"
              >
                <Download className="w-4 h-4 shrink-0 text-[#FF6B00]" />
                <span className="truncate">Install Aplikasi Admin</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* 3. Bottom User Profile & Logout */}
      <div className={`w-full pt-3 border-t border-[#ECEEF1] shrink-0 ${isCollapsed ? 'px-2 flex flex-col items-center' : 'px-3'}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 bg-[#FAFAFA] rounded-2xl border border-[#ECEEF1]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#18181B] text-white flex items-center justify-center text-xs font-black shrink-0 uppercase">
                {user?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#18181B] truncate">{user?.full_name || 'Admin Owner'}</p>
                <p className="text-[10px] text-[#A1A1AA] truncate font-medium">Administrator</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onCloseMobile?.();
                logout();
              }}
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
              Keluar ({user?.full_name || 'Admin'})
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
