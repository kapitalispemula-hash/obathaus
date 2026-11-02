'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { WarehouseStock, RawMaterialCategory } from '@/types/database';
import {
  Package,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  Filter,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function WarehouseStockPage() {
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [categories, setCategories] = useState<RawMaterialCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'safe'>('all');
  const [loading, setLoading] = useState(true);

  const loadStockData = async () => {
    try {
      setLoading(true);
      const [stk, catList] = await Promise.all([
        dbService.getWarehouseStocks(),
        dbService.getRawMaterialCategories(),
      ]);
      setStocks(stk);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to load warehouse stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const lowStockCount = stocks.filter((s) => {
    const min = s.raw_material?.minimum_stock || 0;
    return s.quantity <= min;
  }).length;

  const filteredStocks = stocks.filter((s) => {
    const m = s.raw_material;
    const matchSearch =
      m?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m?.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m?.sku && m.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCategory = selectedCategory === 'all' || m?.category_id === selectedCategory;

    const min = m?.minimum_stock || 0;
    const isLow = s.quantity <= min;
    const matchStockStatus =
      stockFilter === 'all' ||
      (stockFilter === 'low' && isLow) ||
      (stockFilter === 'safe' && !isLow);

    return matchSearch && matchCategory && matchStockStatus;
  });

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Stok Fisik Gudang Pusat</h1>
              <p className="text-xs text-mutedtext">
                Pemantauan kuantitas persediaan fisik bahan baku di Central Warehouse Makassar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/warehouse/supplier-po"
              className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Pengadaan Restock (PO)</span>
            </Link>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-borderline shadow-2xs">
            <p className="text-xs text-mutedtext font-bold uppercase tracking-wider">Total Item Bahan Terdaftar</p>
            <p className="text-2xl font-black text-heading font-mono mt-1">{stocks.length} SKU</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-borderline shadow-2xs">
            <p className="text-xs text-mutedtext font-bold uppercase tracking-wider">Stok Aman</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{stocks.length - lowStockCount} SKU</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-borderline shadow-2xs">
            <p className="text-xs text-mutedtext font-bold uppercase tracking-wider">Perlu Segera Restock</p>
            <p className="text-2xl font-black text-red-600 font-mono mt-1">{lowStockCount} SKU</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Semua ({stocks.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Perlu Restock ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('safe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'safe'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Stok Aman ({stocks.length - lowStockCount})
            </button>

            <div className="h-5 w-px bg-borderline mx-1 hidden sm:block" />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs font-medium text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            >
              <option value="all">Semua Kategori Bahan</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama bahan atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Kode & SKU</th>
                  <th className="py-3 px-4">Nama Bahan Baku</th>
                  <th className="py-3 px-4">Kategori Bahan</th>
                  <th className="py-3 px-4 text-right">Saldo Fisik Gudang</th>
                  <th className="py-3 px-4 text-right">Batas Minimum</th>
                  <th className="py-3 px-4 text-center">Status Stok</th>
                  <th className="py-3 px-4 text-center">Tindakan Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredStocks.map((s) => {
                  const m = s.raw_material;
                  const min = m?.minimum_stock || 0;
                  const isLow = s.quantity <= min;
                  const symbol = m?.standard_unit?.symbol || 'satuan';

                  return (
                    <tr key={s.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-[#FF6B00]">{m?.code}</span>
                        {m?.sku && <p className="text-[11px] text-mutedtext">{m.sku}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-heading">{m?.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F4F5] text-heading border border-borderline">
                          {m?.category?.name || 'Umum'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isLow ? 'text-red-600' : 'text-heading'}>
                          {s.quantity.toLocaleString()} {symbol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-mutedtext">
                        {min.toLocaleString()} {symbol}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isLow ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>Mendekati Habis</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Stok Aman</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isLow ? (
                          <Link
                            href="/warehouse/supplier-po"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF6B00] hover:underline"
                          >
                            <span>Buat PO</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-mutedtext text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WarehouseLayout>
  );
}
