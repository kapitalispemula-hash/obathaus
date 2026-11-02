'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import {
  WarehouseStock,
  SupplierPO,
  OutletOrder,
  Dispatch,
  WarehouseReturn,
} from '@/types/database';
import {
  Package,
  FileText,
  Truck,
  Inbox,
  Send,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Building2,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function WarehouseDashboardPage() {
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [pos, setPos] = useState<SupplierPO[]>([]);
  const [orders, setOrders] = useState<OutletOrder[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [returns, setReturns] = useState<WarehouseReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [stk, poList, ordList, dspList, retList] = await Promise.all([
          dbService.getWarehouseStocks(),
          dbService.getSupplierPOs(),
          dbService.getOutletOrders(),
          dbService.getDispatches(),
          dbService.getWarehouseReturns(),
        ]);
        setStocks(stk);
        setPos(poList);
        setOrders(ordList);
        setDispatches(dspList);
        setReturns(retList);
      } catch (err) {
        console.error('Failed to load warehouse dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingPOs = pos.filter((p) => p.status === 'pending_approval');
  const approvedPOs = pos.filter((p) => p.status === 'approved');
  const incomingOrders = orders.filter((o) => o.status === 'submitted' || o.status === 'processing');
  const inTransitDispatches = dispatches.filter((d) => d.status === 'in_transit');
  const pendingReturns = returns.filter((r) => r.status === 'pending_inspection');

  // Low stock warning
  const lowStockItems = stocks.filter((s) => {
    const min = s.raw_material?.minimum_stock || 0;
    return s.quantity <= min;
  });

  return (
    <WarehouseLayout>
      <div className="space-y-7">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#F0F0F0]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
                Dashboard Gudang Pusat
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
                Central Warehouse WH-01
              </span>
            </div>
            <p className="text-xs text-mutedtext font-medium mt-1">
              Pusat komando logistik: stok bahan baku fisik, pengadaan supplier, dan distribusi ke 7 outlet cabang
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/warehouse/supplier-po"
              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Buat PO Supplier</span>
            </Link>
            <Link
              href="/warehouse/outlet-orders"
              className="px-4 py-2 bg-[#18181B] hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Inbox className="w-4 h-4" />
              <span>Permintaan Cabang</span>
            </Link>
          </div>
        </div>

        {/* 4 Logistics Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Permintaan Cabang Pending */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs flex flex-col justify-between hover:border-[#FF6B00]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                Permintaan Cabang
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-heading font-mono">
                {incomingOrders.length}
              </p>
              <p className="text-[11px] text-mutedtext mt-1 flex items-center gap-1">
                <span>Perlu disiapkan & dikirim</span>
              </p>
            </div>
            <Link
              href="/warehouse/outlet-orders"
              className="mt-4 pt-3 border-t border-borderline text-[11px] font-bold text-[#FF6B00] flex items-center justify-between hover:underline"
            >
              <span>Proses Permintaan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Pengiriman In-Transit */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs flex flex-col justify-between hover:border-[#FF6B00]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                Pengiriman In-Transit
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#F4F4F5] text-[#18181B] border border-[#E4E4E7] flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-heading font-mono">
                {inTransitDispatches.length}
              </p>
              <p className="text-[11px] text-mutedtext mt-1">
                Surat jalan dalam perjalanan
              </p>
            </div>
            <Link
              href="/warehouse/dispatch"
              className="mt-4 pt-3 border-t border-borderline text-[11px] font-bold text-[#18181B] flex items-center justify-between hover:text-[#FF6B00]"
            >
              <span>Pantau Pengiriman</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: PO Supplier Siap Diterima */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs flex flex-col justify-between hover:border-[#FF6B00]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                PO Disetujui Admin
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-heading font-mono">
                {approvedPOs.length}
              </p>
              <p className="text-[11px] text-mutedtext mt-1">
                Menunggu kedatangan fisik barang
              </p>
            </div>
            <Link
              href="/warehouse/supplier-receipts"
              className="mt-4 pt-3 border-t border-borderline text-[11px] font-bold text-[#FF6B00] flex items-center justify-between hover:underline"
            >
              <span>Catat Penerimaan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 4: Peringatan Stok Menipis */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs flex flex-col justify-between hover:border-red-400 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                Stok Menipis / Kritis
              </span>
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-heading font-mono">
                {lowStockItems.length}
              </p>
              <p className="text-[11px] text-mutedtext mt-1">
                Bahan mendekati batas minimum
              </p>
            </div>
            <Link
              href="/warehouse/stock"
              className="mt-4 pt-3 border-t border-borderline text-[11px] font-bold text-red-600 flex items-center justify-between hover:underline"
            >
              <span>Periksa Gudang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2 Grid Columns: Low Stock Alert & Incoming Branch Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Ringkasan Stok Gudang Terkini */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="font-bold text-heading text-sm">Status Persediaan Bahan Baku</h3>
              </div>
              <Link
                href="/warehouse/stock"
                className="text-xs font-bold text-[#FF6B00] hover:underline"
              >
                Lihat Semua ({stocks.length})
              </Link>
            </div>

            <div className="divide-y divide-borderline">
              {stocks.slice(0, 5).map((s) => {
                const min = s.raw_material?.minimum_stock || 100;
                const isLow = s.quantity <= min;
                const pct = Math.min(100, Math.round((s.quantity / (min * 3)) * 100));

                return (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-heading text-xs truncate">
                        {s.raw_material?.name}
                      </p>
                      <p className="text-[11px] text-mutedtext font-mono">
                        {s.raw_material?.code} • Min: {min.toLocaleString()} {s.raw_material?.standard_unit?.symbol}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-mono font-bold text-xs ${isLow ? 'text-red-600' : 'text-heading'}`}>
                        {s.quantity.toLocaleString()} {s.raw_material?.standard_unit?.symbol}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isLow
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isLow ? 'Perlu Restock' : 'Aman'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Permintaan Bahan Masuk dari Cabang */}
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-[#FF6B00]" />
                <h3 className="font-bold text-heading text-sm">Permintaan Masuk dari 7 Outlet</h3>
              </div>
              <Link
                href="/warehouse/outlet-orders"
                className="text-xs font-bold text-[#FF6B00] hover:underline"
              >
                Kelola Pesanan ({orders.length})
              </Link>
            </div>

            <div className="divide-y divide-borderline">
              {orders.length === 0 ? (
                <div className="py-8 text-center text-mutedtext text-xs">
                  Tidak ada permintaan cabang yang pending saat ini.
                </div>
              ) : (
                orders.slice(0, 4).map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#FF6B00]">
                          {ord.order_number}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-heading">
                          {ord.outlet?.name || 'Cabang'}
                        </span>
                      </div>
                      <p className="text-[11px] text-mutedtext mt-0.5">
                        {ord.items?.length || 0} varian bahan diminta • {ord.notes || 'Permintaan stok reguler'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ord.status === 'submitted'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : ord.status === 'processing'
                            ? 'bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {ord.status === 'submitted' ? 'Menunggu Proses' : ord.status === 'processing' ? 'Dipacking' : 'Selesai'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section C: Alur Logistik Cepat */}
        <div className="bg-gradient-to-r from-slate-900 to-[#18181B] text-white p-6 rounded-2xl shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-base">Alur Tertib Distribusi & Stok Opname</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Pengadaan PO ke supplier diajukan oleh Operator Gudang dan wajib disetujui Admin/Owner. Seluruh mutasi pengiriman ke cabang disertai nomor Surat Jalan resmi untuk tracking status in-transit.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/warehouse/stock-opname"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
              >
                Mulai Stok Opname
              </Link>
              <Link
                href="/warehouse/dispatch"
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Terbitkan Surat Jalan
              </Link>
            </div>
          </div>
        </div>
      </div>
    </WarehouseLayout>
  );
}
