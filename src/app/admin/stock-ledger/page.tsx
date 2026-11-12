'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { StockLedgerEntry, Outlet, RawMaterial, StockMovementType } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import {
  ClipboardList,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Truck,
  Send,
  RotateCcw,
  Equal,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import { INITIAL_STOCK_LEDGER } from '@/lib/mock-data';

export default function AdminStockLedgerPage() {
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>(INITIAL_STOCK_LEDGER);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedMaterial, setSelectedMaterial] = useState('all');
  const [selectedMovementType, setSelectedMovementType] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ledList, outList, matList] = await Promise.all([
        dbService.getStockLedger(),
        dbService.getOutlets(),
        dbService.getRawMaterials(),
      ]);
      setLedgerEntries(ledList);
      setOutlets(outList);
      setMaterials(matList);
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel('admin-stock-ledger')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_ledger' }, () => void loadData())
        .subscribe();
    }

    return () => {
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const filteredEntries = ledgerEntries.filter((entry) => {
    const matchQuery =
      entry.reference_document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.raw_material?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.location_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchLocation =
      selectedLocation === 'all' || entry.location_id === selectedLocation;

    const matchMaterial =
      selectedMaterial === 'all' || entry.raw_material_id === selectedMaterial;

    const matchType =
      selectedMovementType === 'all' || entry.movement_type === selectedMovementType;

    return matchQuery && matchLocation && matchMaterial && matchType;
  });

  // Calculate high-level summary metrics
  const totalEntries = ledgerEntries.length;
  const posConsumptionCount = ledgerEntries.filter((e) => e.movement_type === 'pos_consumption').length;
  const dispatchCount = ledgerEntries.filter((e) => e.movement_type === 'dispatch_to_transit' || e.movement_type === 'transit_to_outlet').length;
  const totalCogsMoved = ledgerEntries.reduce((acc, e) => acc + (e.total_cost || 0), 0);

  const renderMovementBadge = (type: StockMovementType) => {
    switch (type) {
      case 'pos_consumption':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-[#FF6B00] border border-orange-200">
            <ShoppingBag className="w-3 h-3" />
            Penjualan POS Kasir
          </span>
        );
      case 'supplier_receipt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Truck className="w-3 h-3" />
            Penerimaan Supplier
          </span>
        );
      case 'dispatch_to_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3" />
            Kirim ke Cabang (Transit)
          </span>
        );
      case 'transit_to_outlet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <ArrowDownLeft className="w-3 h-3" />
            Diterima di Cabang
          </span>
        );
      case 'stock_opname_adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Equal className="w-3 h-3" />
            Koreksi Opname Fisik
          </span>
        );
      case 'return_to_warehouse':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RotateCcw className="w-3 h-3" />
            Retur Barang ke Gudang
          </span>
        );
      case 'return_to_supplier':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Truck className="w-3 h-3" />
            Retur ke Supplier
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">
                Buku Besar Mutasi Stok Multi-Outlet (Stock Ledger)
              </h1>
              <p className="text-xs text-subtle mt-0.5">
                Buku besar akuntansi persediaan permanen (*immutable*) melacak setiap debit & kredit bahan baku di 7 outlet dan 1 gudang pusat
              </p>
            </div>
          </div>

          <button
            onClick={() => loadData()}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* 1. Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Total Mutasi Tercatat</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-dark">{totalEntries} Entri</div>
            <div className="text-xs text-subtle mt-1">Transaksi mutasi stok terverifikasi</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Pemotongan POS Kasir</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">{posConsumptionCount} Transaksi</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Auto-deduction resep produk menu</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Distribusi Logistik</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-700">{dispatchCount} Kiriman</div>
            <div className="text-xs text-subtle mt-1">Perpindahan gudang ke 7 cabang</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">Integritas Audit</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700">100% Immutable</div>
            <div className="text-xs text-purple-600 font-medium mt-1">Tidak dapat diubah atau dihapus</div>
          </div>
        </div>

        {/* 2. Controls & Advanced Filters */}
        <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari invoice, bahan, atau cabang..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            {/* Location Filter */}
            <div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="all">Semua Lokasi (Gudang & 7 Cabang)</option>
                <option value="e0000000-0000-0000-0000-000000000001">Gudang Pusat Makassar</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Raw Material Filter */}
            <div>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="all">Semua Bahan Baku</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Movement Type Filter */}
            <div>
              <select
                value={selectedMovementType}
                onChange={(e) => setSelectedMovementType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
              >
                <option value="all">Semua Jenis Mutasi</option>
                <option value="pos_consumption">Penjualan POS Kasir</option>
                <option value="supplier_receipt">Penerimaan Supplier</option>
                <option value="dispatch_to_transit">Kirim ke Cabang (Transit)</option>
                <option value="transit_to_outlet">Diterima di Cabang</option>
                <option value="stock_opname_adjustment">Koreksi Opname Fisik</option>
                <option value="return_to_warehouse">Retur ke Gudang</option>
                <option value="return_to_supplier">Retur ke Supplier</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-subtle pt-2 border-t border-slate-100">
            <span>
              Menampilkan <strong className="text-dark">{filteredEntries.length}</strong> catatan pergerakan stok
            </span>
            <span className="text-slate-400">
              Setiap baris ledger terikat dengan nomor dokumen sumber yang sah
            </span>
          </div>
        </div>

        {/* 3. Table of Stock Ledger */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                  <th className="py-3.5 px-5">Waktu & No. Dokumen</th>
                  <th className="py-3.5 px-4">Lokasi Mutasi</th>
                  <th className="py-3.5 px-4">Bahan Baku</th>
                  <th className="py-3.5 px-4">Tipe Mutasi</th>
                  <th className="py-3.5 px-4 text-right">Debit / Kredit</th>
                  <th className="py-3.5 px-4 text-center">Saldo Akhir</th>
                  <th className="py-3.5 px-5 text-right">Nilai Mutasi (HPP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle">
                      Memuat data buku besar mutasi stok...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle">
                      Tidak ada catatan mutasi yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => {
                    const isPositive = e.quantity_change > 0;
                    const mat = e.raw_material;

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-dark">{e.reference_document_number}</div>
                          <div className="text-xs text-subtle mt-0.5">
                            {new Date(e.transaction_time).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{e.location_name || 'Gudang Pusat'}</span>
                          </div>
                          {e.notes && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {e.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{mat?.name || 'Bahan Baku'}</div>
                          <div className="text-xs text-subtle">{mat?.sku || '-'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {renderMovementBadge(e.movement_type)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-black text-sm ${
                              isPositive ? 'text-emerald-600' : 'text-[#FF6B00]'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {e.quantity_change.toLocaleString('id-ID')}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              {e.unit_symbol || mat?.standard_unit?.symbol || 'g'}
                            </span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs">
                            <span className="text-slate-400">
                              {e.balance_before.toLocaleString('id-ID')}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-slate-900">
                              {e.balance_after.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right font-bold text-dark">
                          {formatRupiah(Math.abs(e.total_cost || 0))}
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
