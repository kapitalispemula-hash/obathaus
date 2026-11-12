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
  Edit2,
  X,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { INITIAL_OUTLETS, INITIAL_OUTLET_STOCKS } from '@/lib/mock-data';

export default function AdminOutletStocksPage() {
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(INITIAL_OUTLETS[0]?.id || 'out-01');
  const [stocks, setStocks] = useState<OutletStock[]>(INITIAL_OUTLET_STOCKS);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [categories, setCategories] = useState<RawMaterialCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'safe'>('all');
  const [loading, setLoading] = useState(true);

  // Edit Batas Aman Modal State
  const [editingStock, setEditingStock] = useState<OutletStock | null>(null);
  const [editMinValue, setEditMinValue] = useState<number>(0);
  const [isSavingMin, setIsSavingMin] = useState(false);
  const [editMinError, setEditMinError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outList, stkList, catList, matList] = await Promise.all([
        dbService.getOutlets(),
        dbService.getOutletStocks(),
        dbService.getRawMaterialCategories(),
        dbService.getRawMaterials(),
      ]);
      setOutlets(outList);
      setStocks(stkList);
      setCategories(catList);
      setMaterials(matList);
      if (outList.length > 0 && !outList.some((o) => o.id === selectedOutletId)) {
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

  const buildStocksForOutlet = (targetOutletId: string): OutletStock[] => {
    const rawOutletRows = stocks.filter((s) => s.outlet_id === targetOutletId);
    if (materials.length === 0) return rawOutletRows;

    const targetOutlet = outlets.find((o) => o.id === targetOutletId);
    const merged: OutletStock[] = materials.map((mat) => {
      const existing = rawOutletRows.find((s) => s.raw_material_id === mat.id);
      return {
        id: existing?.id || `ostk-${targetOutletId}-${mat.id}`,
        outlet_id: targetOutletId,
        raw_material_id: mat.id,
        quantity: existing ? Number(existing.quantity) : 0,
        minimum_stock: existing ? Number(existing.minimum_stock ?? mat.minimum_stock ?? 0) : Number(mat.minimum_stock ?? 0),
        updated_at: existing?.updated_at || new Date().toISOString(),
        outlet: existing?.outlet || targetOutlet,
        raw_material: {
          ...mat,
          ...(existing?.raw_material || {}),
          category: mat.category || existing?.raw_material?.category,
          standard_unit: mat.standard_unit || existing?.raw_material?.standard_unit,
        },
      };
    });

    // Include any orphan stock row not in active materials list
    for (const row of rawOutletRows) {
      if (!merged.some((m) => m.raw_material_id === row.raw_material_id)) {
        merged.push(row);
      }
    }
    return merged;
  };

  const currentOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];
  const outletStocks = buildStocksForOutlet(selectedOutletId);

  const openEditMinModal = (stk: OutletStock) => {
    const currentMin = Number(stk.minimum_stock ?? stk.raw_material?.minimum_stock ?? 0);
    setEditingStock(stk);
    setEditMinValue(currentMin);
    setEditMinError(null);
  };

  const handleSaveMinStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStock) return;
    if (Number.isNaN(editMinValue) || editMinValue < 0) {
      setEditMinError('Batas minimum tidak boleh bernilai negatif.');
      return;
    }

    setIsSavingMin(true);
    setEditMinError(null);
    try {
      await dbService.updateOutletStockMinimum(
        editingStock.outlet_id,
        editingStock.raw_material_id,
        Number(editMinValue)
      );
      setEditingStock(null);
      await loadData();
    } catch (err: any) {
      setEditMinError(err.message || 'Gagal menyimpan batas minimum cabang.');
    } finally {
      setIsSavingMin(false);
    }
  };

  const filteredStocks = outletStocks.filter((s) => {
    const mat = s.raw_material;
    const matchSearch =
      (mat?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat?.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat?.code || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory =
      selectedCategory === 'all' || mat?.category_id === selectedCategory;

    const min = Number(s.minimum_stock ?? mat?.minimum_stock ?? 0);
    const isLow = s.quantity <= min;
    const matchStatus =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && isLow) ||
      (stockStatusFilter === 'safe' && !isLow);

    return matchSearch && matchCategory && matchStatus;
  });

  const lowStockCount = outletStocks.filter((s) => {
    const min = Number(s.minimum_stock ?? s.raw_material?.minimum_stock ?? 0);
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
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-borderline shadow-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {outlets.map((outlet) => {
              const isSelected = outlet.id === selectedOutletId;
              const outletItems = buildStocksForOutlet(outlet.id);
              const branchLowCount = outletItems.filter(
                (s) => s.quantity <= Number(s.minimum_stock ?? s.raw_material?.minimum_stock ?? 0)
              ).length;

              return (
                <button
                  key={outlet.id}
                  onClick={() => setSelectedOutletId(outlet.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Cabang Aktif</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shrink-0">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-sm sm:text-lg font-bold text-dark truncate">{currentOutlet?.name || 'Cabang'}</div>
            <div className="text-[10px] sm:text-xs text-subtle mt-0.5 truncate">{currentOutlet?.address || 'Makassar'}</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Total Bahan</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-dark">{outletStocks.length} Item</div>
            <div className="text-[10px] sm:text-xs text-subtle mt-0.5 truncate">Bahan aktif cabang</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Stok Kritis</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-rose-700">{lowStockCount} Bahan</div>
            <div className="text-[10px] sm:text-xs text-rose-600 font-medium mt-0.5 truncate">Perlu restock</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Stok Aman</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-700">{safeStockCount} Bahan</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">Di atas batas min</div>
          </div>
        </div>

        {/* 3. Controls & Filter Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
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
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 overflow-x-auto no-scrollbar w-full md:w-auto">
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
                    const min = Number(stk.minimum_stock ?? mat?.minimum_stock ?? 0);
                    const masterMin = materials.find((m) => m.id === stk.raw_material_id)?.minimum_stock;
                    const isCustomMin = masterMin !== undefined && Number(masterMin) !== min;
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
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <div className="text-right">
                              <div className="font-bold text-dark">
                                {min.toLocaleString('id-ID')} {mat?.standard_unit?.symbol || ''}
                              </div>
                              {isCustomMin && (
                                <span className="text-[10px] text-[#FF6B00] font-semibold">
                                  Khusus cabang
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => openEditMinModal(stk)}
                              title="Atur batas aman khusus cabang ini"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Modal Atur Batas Aman Cabang */}
      {editingStock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
              <div>
                <h3 className="font-bold text-dark text-sm sm:text-base">
                  Atur Batas Aman Cabang
                </h3>
                <p className="text-[11px] text-subtle">
                  {currentOutlet?.name || 'Cabang'} • {editingStock.raw_material?.name || 'Bahan Baku'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStock(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-dark rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMinStock} className="p-6 space-y-4">
              {editMinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {editMinError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-subtle">Saldo Saat Ini di Cabang:</span>
                  <span className="font-bold text-dark">
                    {editingStock.quantity.toLocaleString('id-ID')}{' '}
                    {editingStock.raw_material?.standard_unit?.symbol || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Standar Master Bahan Baku:</span>
                  <span className="font-bold text-[#FF6B00]">
                    {Number(
                      materials.find((m) => m.id === editingStock.raw_material_id)?.minimum_stock ??
                        editingStock.raw_material?.minimum_stock ??
                        0
                    ).toLocaleString('id-ID')}{' '}
                    {editingStock.raw_material?.standard_unit?.symbol || ''}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark mb-1">
                  Batas Minimum Stok Cabang ({editingStock.raw_material?.standard_unit?.symbol || 'unit'})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={editMinValue}
                  onChange={(e) => setEditMinValue(Number(e.target.value))}
                  className="w-full text-sm p-2.5 bg-white border border-borderline rounded-xl text-dark font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                />
                <p className="text-[11px] text-subtle mt-1.5">
                  Jika saldo cabang &le; angka ini, status berubah menjadi <strong>Stok Kritis / Menipis</strong> di Admin &amp; Kasir POS.
                </p>
              </div>

              {(() => {
                const masterVal = Number(
                  materials.find((m) => m.id === editingStock.raw_material_id)?.minimum_stock ??
                    editingStock.raw_material?.minimum_stock ??
                    0
                );
                if (editMinValue !== masterVal) {
                  return (
                    <button
                      type="button"
                      onClick={() => setEditMinValue(masterVal)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ikuti nilai Master ({masterVal.toLocaleString('id-ID')})</span>
                    </button>
                  );
                }
                return null;
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderline">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2 border border-borderline text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMin}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingMin ? 'Menyimpan...' : 'Simpan Batas Aman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
