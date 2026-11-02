'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Outlet, OutletStock, RawMaterial, RawMaterialCategory } from '@/types/database';
import {
  Store,
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  Building2,
  RefreshCw,
  TrendingDown,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { INITIAL_OUTLETS, INITIAL_OUTLET_STOCKS } from '@/lib/mock-data';

export default function AdminOutletStocksPage() {
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(INITIAL_OUTLETS[0]?.id || 'out-01');
  const [stocks, setStocks] = useState<OutletStock[]>(INITIAL_OUTLET_STOCKS);
  const [categories, setCategories] = useState<RawMaterialCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'safe'>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outList, stkList, catList] = await Promise.all([
        dbService.getOutlets(),
        dbService.getOutletStocks(),
        dbService.getRawMaterialCategories(),
      ]);
      setOutlets(outList);
      setStocks(stkList);
      setCategories(catList);
      if (!selectedOutletId && outList.length > 0) {
        setSelectedOutletId(outList[0].id);
      }
    } catch (err) {
      console.error('Failed to load outlet stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const outletStocks = stocks.filter((s) => s.outlet_id === selectedOutletId);

  const filteredStocks = outletStocks.filter((s) => {
    const mat = s.raw_material;
    const matchSearch =
      (mat?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat?.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat?.code || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory =
      selectedCategory === 'all' || mat?.category_id === selectedCategory;

    const min = s.minimum_stock || mat?.minimum_stock || 0;
    const isLow = s.quantity <= min;
    const matchStatus =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && isLow) ||
      (stockStatusFilter === 'safe' && !isLow);

    return matchSearch && matchCategory && matchStatus;
  });

  const lowStockCount = outletStocks.filter((s) => {
    const min = s.minimum_stock || s.raw_material?.minimum_stock || 0;
    return s.quantity <= min;
  }).length;

  const safeStockCount = outletStocks.length - lowStockCount;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">
                Persediaan Bahan Baku Multi-Outlet
              </h1>
              <p className="text-xs text-subtle mt-0.5">
                Monitoring saldo bahan baku independen di 7 cabang Obat Haus yang terpotong otomatis oleh POS kasir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/stock-ledger"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-dark text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Buka Buku Besar Mutasi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 1. Outlet Switcher Tabs */}
        <div className="bg-white p-3 rounded-2xl border border-borderline shadow-xs overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {outlets.map((outlet) => {
              const isSelected = outlet.id === selectedOutletId;
              const outletItems = stocks.filter((s) => s.outlet_id === outlet.id);
              const branchLowCount = outletItems.filter((s) => s.quantity <= (s.minimum_stock || 500)).length;

              return (
                <button
                  key={outlet.id}
                  onClick={() => setSelectedOutletId(outlet.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{outlet.name}</span>
                  {branchLowCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected
                          ? 'bg-white text-[#FF6B00]'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {branchLowCount} Kritis
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Metric Cards for Selected Outlet */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Cabang Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg font-bold text-dark truncate">{currentOutlet?.name || 'Cabang'}</div>
            <div className="text-xs text-subtle mt-1">{currentOutlet?.address || 'Makassar'}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Total Bahan Baku</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-dark">{outletStocks.length} Item</div>
            <div className="text-xs text-subtle mt-1">Bahan aktif di cabang ini</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Stok Kritis / Rendah</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700">{lowStockCount} Bahan</div>
            <div className="text-xs text-rose-600 font-medium mt-1">Perlu restock dari Gudang Pusat</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Stok Aman</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">{safeStockCount} Bahan</div>
            <div className="text-xs text-slate-500 mt-1">Di atas ambang batas minimum</div>
          </div>
        </div>

        {/* 3. Controls & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bahan baku atau SKU..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                stockStatusFilter === 'all'
                  ? 'bg-white text-dark shadow-xs font-semibold'
                  : 'hover:text-dark'
              }`}
            >
              Semua ({outletStocks.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                stockStatusFilter === 'low'
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'hover:text-dark'
              }`}
            >
              Kritis ({lowStockCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('safe')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                stockStatusFilter === 'safe'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'hover:text-dark'
              }`}
            >
              Aman ({safeStockCount})
            </button>
          </div>
        </div>

        {/* 4. Table of Outlet Stocks */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                  <th className="py-3.5 px-5">Bahan Baku & SKU</th>
                  <th className="py-3.5 px-4">Kategori Bahan</th>
                  <th className="py-3.5 px-4 text-right">Saldo Stok Fisik</th>
                  <th className="py-3.5 px-4 text-right">Batas Minimum</th>
                  <th className="py-3.5 px-4 text-center">Indikator Saldo</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-subtle">
                      Memuat data persediaan cabang...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-subtle">
                      Tidak ada bahan baku yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stk) => {
                    const mat = stk.raw_material;
                    const min = stk.minimum_stock || mat?.minimum_stock || 0;
                    const isLow = stk.quantity <= min;
                    const percentage = min > 0 ? Math.min(Math.round((stk.quantity / (min * 3)) * 100), 100) : 50;

                    return (
                      <tr key={stk.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-dark">{mat?.name || 'Bahan'}</div>
                          <div className="text-xs text-subtle">
                            SKU: {mat?.sku || '-'} • Kode: {mat?.code || '-'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {mat?.category?.name || 'Kategori'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-black text-dark text-base">
                          {stk.quantity.toLocaleString('id-ID')}{' '}
                          <span className="text-xs font-normal text-subtle">
                            {mat?.standard_unit?.symbol || 'pcs'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right text-xs text-subtle font-medium">
                          {min.toLocaleString('id-ID')} {mat?.standard_unit?.symbol || ''}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="w-36 mx-auto">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isLow ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-subtle mt-1">
                              {stk.quantity > min
                                ? `+${(stk.quantity - min).toLocaleString('id-ID')} dari batas aman`
                                : `Kurang ${(min - stk.quantity).toLocaleString('id-ID')} unit`}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              Stok Kritis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Stok Aman
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
