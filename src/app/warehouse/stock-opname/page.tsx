'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { StockOpname, RawMaterial, WarehouseStock, StockOpnameItem } from '@/types/database';
import { useAuth } from '@/lib/auth-context';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  X,
  Eye,
  ShieldAlert,
  Clock,
  Ban,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Equal,
} from 'lucide-react';
import { INITIAL_STOCK_OPNAMES } from '@/lib/mock-data';

export default function WarehouseStockOpnamePage() {
  const { user, role } = useAuth();

  const [opnames, setOpnames] = useState<StockOpname[]>(INITIAL_STOCK_OPNAMES);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  // New Opname Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [opnameNotes, setOpnameNotes] = useState('Pemeriksaan berkala stok fisik Gudang Pusat');
  const [opnameCountItems, setOpnameCountItems] = useState<{
    raw_material_id: string;
    raw_material_name: string;
    sku: string;
    unit_symbol: string;
    unit_id: string;
    system_quantity: number;
    physical_quantity: number;
    item_notes: string;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail & Approval Modal
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [opnList, matList, stockList] = await Promise.all([
        dbService.getStockOpnames(),
        dbService.getRawMaterials(),
        dbService.getWarehouseStocks(),
      ]);
      setOpnames(opnList);
      setMaterials(matList);
      setWarehouseStocks(stockList);
    } catch (err) {
      console.error('Failed to load stock opname data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewOpnameModal = () => {
    // Populate with all active materials and their current warehouse stock
    const items = materials.map((m) => {
      const st = warehouseStocks.find((s) => s.raw_material_id === m.id);
      const sysQty = st ? st.quantity : 0;
      return {
        raw_material_id: m.id,
        raw_material_name: m.name,
        sku: m.sku || m.code || '',
        unit_symbol: m.standard_unit?.symbol || 'pcs',
        unit_id: m.standard_unit_id || 'unit-pcs',
        system_quantity: sysQty,
        physical_quantity: sysQty, // default to match
        item_notes: 'Sesuai fisik',
      };
    });

    setOpnameCountItems(items);
    setOpnameNotes(`Stok opname fisik Gudang Pusat - ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handlePhysicalQtyChange = (idx: number, val: number) => {
    const updated = [...opnameCountItems];
    const item = updated[idx];
    item.physical_quantity = val;
    const diff = val - item.system_quantity;
    if (diff === 0) {
      item.item_notes = 'Sesuai fisik';
    } else if (diff < 0) {
      item.item_notes = `Selisih kurang ${Math.abs(diff)} ${item.unit_symbol} (penyusutan/tercecer)`;
    } else {
      item.item_notes = `Selisih lebih ${diff} ${item.unit_symbol} (kelebihan fisik)`;
    }
    setOpnameCountItems(updated);
  };

  const handleItemNotesChange = (idx: number, val: string) => {
    const updated = [...opnameCountItems];
    updated[idx].item_notes = val;
    setOpnameCountItems(updated);
  };

  const handleSubmitNewOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (opnameCountItems.length === 0) {
      setFormError('Tidak ada bahan baku yang dihitung.');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsPayload: StockOpnameItem[] = opnameCountItems.map((itm, idx) => {
        const diff = itm.physical_quantity - itm.system_quantity;
        return {
          id: `opni-${Date.now()}-${idx}`,
          opname_id: '',
          raw_material_id: itm.raw_material_id,
          system_quantity: itm.system_quantity,
          physical_quantity: itm.physical_quantity,
          difference: diff,
          unit_id: itm.unit_id,
          notes: itm.item_notes,
        };
      });

      const newOpname = await dbService.createStockOpname({
        warehouse_id: 'wh-00000000-0000-0000-0000-000000000001',
        notes: opnameNotes,
        conducted_by: user?.id || 'w0000000-0000-0000-0000-000000000001',
        items: itemsPayload,
      });

      setFeedback(
        `Sesi Opname #${newOpname.opname_number} berhasil dicatat. Status: Menunggu Persetujuan Admin/Owner untuk penyesuaian stok.`
      );
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan sesi opname');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveOpname = async (opnId: string) => {
    try {
      setIsProcessingApproval(true);
      await dbService.approveStockOpname(opnId, user?.id || 'a0000000-0000-0000-0000-000000000001');
      setFeedback('Sesi opname telah disetujui Admin. Saldo stok fisik gudang telah otomatis disesuaikan.');
      setSelectedOpname(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menyetujui opname: ${err.message || err}`);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleRejectOpname = async (opnId: string) => {
    const reason = prompt('Masukkan alasan penolakan hasil opname ini:');
    if (reason === null) return;

    try {
      setIsProcessingApproval(true);
      await dbService.rejectStockOpname(opnId, user?.id || 'a0000000-0000-0000-0000-000000000001', reason || 'Data fisik meragukan');
      setFeedback('Sesi opname telah ditolak. Tidak ada saldo stok yang diubah.');
      setSelectedOpname(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menolak opname: ${err.message || err}`);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const filteredOpnames = opnames.filter((o) => {
    const matchQuery =
      o.opname_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const countPending = opnames.filter((o) => o.status === 'pending_approval').length;
  const countApproved = opnames.filter((o) => o.status === 'approved').length;
  const countRejected = opnames.filter((o) => o.status === 'rejected').length;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">Stok Opname Fisik Gudang</h1>
              <p className="text-xs text-subtle mt-0.5">
                Pencatatan hasil hitung fisik bahan baku, kalkulasi deviasi/selisih, dan pengajuan persetujuan ke Admin
              </p>
            </div>
          </div>
        </div>
        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1 rounded-md"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 1. Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sesi Opname</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                <ClipboardCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{opnames.length}</div>
            <div className="text-xs text-slate-500 mt-1">Sesi penghitungan fisik</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Menunggu Approval</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{countPending}</div>
            <div className="text-xs text-amber-600 font-medium mt-1">Verifikasi persetujuan Admin</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Disetujui & Disesuaikan</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{countApproved}</div>
            <div className="text-xs text-slate-500 mt-1">Stok sistem sinkron fisik</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sesi Ditolak</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700">{countRejected}</div>
            <div className="text-xs text-slate-500 mt-1">Dibatalkan oleh Admin</div>
          </div>
        </div>

        {/* 2. Controls & Search */}
        <div className="bg-white p-4 rounded-2xl border border-[#ECEEF1] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor opname atau keterangan..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'all' ? 'bg-[#18181B] text-white shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Semua ({opnames.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending_approval')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'pending_approval' ? 'bg-[#18181B] text-white font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Menunggu ({countPending})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'approved' ? 'bg-[#18181B] text-white font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Disetujui ({countApproved})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'rejected' ? 'bg-[#18181B] text-white font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Ditolak ({countRejected})
              </button>
            </div>
          </div>

          <button
            onClick={openNewOpnameModal}
            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-500/20 shrink-0 w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Sesi Opname Baru</span>
          </button>
        </div>

        {/* 3. Table of Stock Opnames */}
        <div className="bg-white rounded-2xl border border-[#ECEEF1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEEF1] bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Nomor & Tanggal Opname</th>
                  <th className="py-3.5 px-4">Keterangan / Sesi</th>
                  <th className="py-3.5 px-4 text-center">Bahan Dihitung</th>
                  <th className="py-3.5 px-4 text-center">Status Deviasi</th>
                  <th className="py-3.5 px-4">Status Approval</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF1] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Memuat daftar stok opname gudang...
                    </td>
                  </tr>
                ) : filteredOpnames.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data stok opname yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredOpnames.map((opn) => {
                    const isPending = opn.status === 'pending_approval';
                    const isApproved = opn.status === 'approved';
                    const isRejected = opn.status === 'rejected';

                    // Discrepancy analysis
                    const items = opn.items || [];
                    const hasDiscrepancy = items.some((it) => it.difference !== 0);
                    const countShortage = items.filter((it) => it.difference < 0).length;
                    const countSurplus = items.filter((it) => it.difference > 0).length;

                    return (
                      <tr key={opn.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-[#FF6B00]" />
                            <span>{opn.opname_number}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(opn.opname_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <div className="text-slate-800 font-medium line-clamp-1">
                            {opn.notes || 'Pemeriksaan rutin fisik'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">Lokasi: Gudang Logistik Pusat Obat Haus</div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {items.length} Bahan
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {!hasDiscrepancy ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Equal className="w-3 h-3" />
                              100% Cocok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3" />
                              {countShortage > 0 && `${countShortage} Susut`}
                              {countShortage > 0 && countSurplus > 0 && ', '}
                              {countSurplus > 0 && `${countSurplus} Lebih`}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Menunggu Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Disetujui & Disesuaikan
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" />
                              Ditolak
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setSelectedOpname(opn)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{role === 'admin' && isPending ? 'Review & Setujui' : 'Lihat Detail'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Modal Mulai Sesi Opname Baru */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Mulai Sesi Stok Opname Fisik Gudang</h3>
                    <p className="text-xs text-slate-500">
                      Input hasil hitung fisik. Deviasi stok akan dihitung otomatis & diajukan ke Admin.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form & Table */}
              <form onSubmit={handleSubmitNewOpname} className="p-6 overflow-y-auto space-y-5 flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Segregation of Duties Banner */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Ketentuan Kewenangan (Permission Matrix):</strong>
                    Operator Gudang bertugas mencatat kuantitas fisik riil. Penyesuaian saldo buku stok (Stock
                    Adjustment) hanya akan dieksekusi setelah mendapatkan persetujuan (approval) resmi dari Admin/Owner.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Keterangan Sesi Opname <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={opnameNotes}
                    onChange={(e) => setOpnameNotes(e.target.value)}
                    placeholder="Contoh: Stok opname fisik tutup buku akhir bulan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Table of items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Daftar Penghitungan Fisik ({opnameCountItems.length} Bahan Baku)
                    </label>
                    <span className="text-xs text-slate-500">
                      Satuan terkecil: gram, ml, pcs
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10 backdrop-blur-xs">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Nama Bahan Baku</th>
                          <th className="py-2.5 px-3 text-right">Stok Sistem</th>
                          <th className="py-2.5 px-3 text-right w-36">Hitung Fisik Riil</th>
                          <th className="py-2.5 px-3 text-center">Selisih</th>
                          <th className="py-2.5 px-3 text-left">Catatan Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {opnameCountItems.map((itm, idx) => {
                          const diff = itm.physical_quantity - itm.system_quantity;
                          return (
                            <tr key={itm.raw_material_id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{itm.raw_material_name}</div>
                                <div className="text-[10px] text-slate-400">{itm.sku}</div>
                              </td>

                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {itm.system_quantity.toLocaleString('id-ID')}{' '}
                                <span className="text-[10px] text-slate-400">{itm.unit_symbol}</span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={itm.physical_quantity}
                                    onChange={(e) =>
                                      handlePhysicalQtyChange(idx, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-right font-bold text-slate-900 focus:ring-1 focus:ring-[#FF6B00]"
                                  />
                                  <span className="text-[11px] text-slate-500 w-8 text-left">{itm.unit_symbol}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-center font-bold">
                                {diff === 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    0 (Cocok)
                                  </span>
                                )}
                                {diff < 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    {diff.toLocaleString('id-ID')}
                                  </span>
                                )}
                                {diff > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                                    +{diff.toLocaleString('id-ID')}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={itm.item_notes}
                                  onChange={(e) => handleItemNotesChange(idx, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#FF6B00]"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan Sesi...' : 'Ajukan Hasil Opname ke Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Modal Detail / Approval Opname Fisik */}
        {selectedOpname && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Rincian Hasil Stok Opname</h3>
                    <p className="text-xs text-slate-500">#{selectedOpname.opname_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOpname(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <strong className="capitalize text-slate-900">{selectedOpname.status.replace('_', ' ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tanggal Opname:</span>
                    <span className="text-slate-800 font-medium">
                      {new Date(selectedOpname.opname_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Gudang:</span>
                    <span className="text-slate-800 font-medium">Gudang Pusat</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Approval Admin:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedOpname.approved_at
                        ? new Date(selectedOpname.approved_at).toLocaleDateString('id-ID')
                        : 'Belum disetujui'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                    Keterangan Sesi:
                  </span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedOpname.notes || 'Tidak ada catatan.'}
                  </p>
                </div>

                {/* Items breakdown */}
                <div>
                  <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-2">
                    Hasil Perhitungan per Bahan Baku:
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10 backdrop-blur-xs">
                        <tr>
                          <th className="py-2 px-3">Bahan Baku</th>
                          <th className="py-2 px-3 text-right">Stok Sistem</th>
                          <th className="py-2 px-3 text-right">Fisik Riil</th>
                          <th className="py-2 px-3 text-center">Deviasi / Selisih</th>
                          <th className="py-2 px-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOpname.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {item.raw_material?.name || 'Bahan Baku'}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-600">
                              {item.system_quantity.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {item.physical_quantity.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {item.difference === 0 ? (
                                <span className="text-emerald-600 font-semibold">0 (Cocok)</span>
                              ) : item.difference < 0 ? (
                                <span className="text-rose-600 font-bold">{item.difference.toLocaleString('id-ID')}</span>
                              ) : (
                                <span className="text-[#18181B] font-bold">+{item.difference.toLocaleString('id-ID')}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status Notice if Operator */}
                {selectedOpname.status === 'pending_approval' && role !== 'admin' && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Sesi opname ini sedang menunggu peninjauan dan persetujuan dari Admin/Owner Obat Haus sebelum stok
                      disesuaikan.
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#ECEEF1] bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedOpname(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                >
                  Tutup
                </button>

                {/* If user is Admin and status is pending_approval, allow approve/reject */}
                {selectedOpname.status === 'pending_approval' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessingApproval}
                      onClick={() => handleRejectOpname(selectedOpname.id)}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold disabled:opacity-50"
                    >
                      Tolak Opname
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingApproval}
                      onClick={() => handleApproveOpname(selectedOpname.id)}
                      className="flex items-center gap-1.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isProcessingApproval ? 'Memproses...' : 'Setujui & Mutasikan Stok'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WarehouseLayout>
  );
}
