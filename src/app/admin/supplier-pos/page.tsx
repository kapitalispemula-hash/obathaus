'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { SupplierPO, Supplier } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Truck,
  Eye,
  AlertTriangle,
  X,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Ban,
  Package,
} from 'lucide-react';

export default function AdminSupplierPOsPage() {
  const { user } = useAuth();
  const [pos, setPos] = useState<SupplierPO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected'>('all');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal Detail & Approval
  const [selectedPO, setSelectedPO] = useState<SupplierPO | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [poToReject, setPoToReject] = useState<SupplierPO | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [poList, supList] = await Promise.all([
        dbService.getSupplierPOs(),
        dbService.getSuppliers(),
      ]);
      setPos(poList);
      setSuppliers(supList);
    } catch (err) {
      console.error('Failed to load supplier POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_notifications_updated', handleUpdate);
    }

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel('admin-supplier-pos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_pos' }, () => void loadData())
        .subscribe();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_notifications_updated', handleUpdate);
      }
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleApprove = async (po: SupplierPO) => {
    try {
      setIsProcessing(true);
      const adminId = user?.id || 'a0000000-0000-0000-0000-000000000001';
      await dbService.approveSupplierPO(po.id, adminId);
      setFeedback(`Permohonan ${po.po_number} berhasil disetujui! Notifikasi otomatis dikirimkan ke Gudang Pusat.`);
      if (selectedPO?.id === po.id) {
        setSelectedPO(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyetujui PO.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (po: SupplierPO) => {
    setPoToReject(po);
    setRejectionReason('');
    setRejectReasonModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!poToReject) return;
    try {
      setIsProcessing(true);
      const adminId = user?.id || 'a0000000-0000-0000-0000-000000000001';
      const reason = rejectionReason.trim() || 'Ditolak oleh Admin/Owner';
      await dbService.rejectSupplierPO(poToReject.id, adminId, reason);
      setFeedback(`Permohonan ${poToReject.po_number} telah ditolak. Alasan diteruskan ke Gudang.`);
      setRejectReasonModalOpen(false);
      setPoToReject(null);
      if (selectedPO?.id === poToReject.id) {
        setSelectedPO(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menolak PO.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered List
  const filteredPOs = pos.filter((p) => {
    // 1. Status Filter
    if (statusFilter === 'approved') {
      if (p.status !== 'approved' && p.status !== 'received' && p.status !== 'completed') return false;
    } else if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }

    // 2. Supplier Filter
    if (selectedSupplierFilter !== 'all' && p.supplier_id !== selectedSupplierFilter) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = p.po_number.toLowerCase().includes(q);
      const matchSupplier = p.supplier?.name?.toLowerCase().includes(q);
      const matchNotes = p.notes?.toLowerCase().includes(q);
      const matchItems = p.items?.some((it) => it.raw_material?.name?.toLowerCase().includes(q));
      if (!matchNumber && !matchSupplier && !matchNotes && !matchItems) return false;
    }

    return true;
  });

  // KPI calculations
  const countPending = pos.filter((p) => p.status === 'pending_approval').length;
  const countApproved = pos.filter(
    (p) => p.status === 'approved' || p.status === 'received' || p.status === 'completed'
  ).length;
  const totalValue = pos.reduce((acc, p) => {
    const pCost = p.items?.reduce((c, it) => c + (it.subtotal || (it.quantity_ordered * it.unit_cost)), 0) || 0;
    return acc + pCost;
  }, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-heading">Persetujuan PO Supplier</h1>
                {countPending > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                    {countPending} Perlu Approval
                  </span>
                )}
              </div>
              <p className="text-xs text-mutedtext mt-0.5">
                Review dan otorisasi permohonan pengadaan bahan baku yang diajukan oleh Operator Gudang Pusat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/suppliers"
              className="px-4 py-2 border border-borderline hover:bg-[#FAFAFA] text-mutedtext hover:text-heading rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Data Mitra Supplier</span>
            </Link>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs">
            <span className="text-[10px] font-bold text-mutedtext uppercase tracking-wider">Total Permohonan PO</span>
            <div className="text-2xl font-black text-heading font-mono mt-1">{pos.length}</div>
            <p className="text-[11px] text-mutedtext mt-0.5">Seluruh PO tercatat sistem</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Menunggu Persetujuan</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 font-mono mt-1">{countPending}</div>
            <p className="text-[11px] text-amber-700 mt-0.5">Memerlukan otorisasi Admin</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-mutedtext uppercase tracking-wider">Disetujui / Selesai</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-heading font-mono mt-1">{countApproved}</div>
            <p className="text-[11px] text-mutedtext mt-0.5">Telah diotorisasi & diterima</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs">
            <span className="text-[10px] font-bold text-mutedtext uppercase tracking-wider">Estimasi Nilai PO</span>
            <div className="text-xl font-black text-[#FF6B00] font-mono mt-1 truncate">
              {formatRupiah(totalValue)}
            </div>
            <p className="text-[11px] text-mutedtext mt-0.5">Nilai pengadaan logistik</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Semua ({pos.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending_approval')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'pending_approval'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-amber-700 hover:text-amber-800 border border-amber-200'
              }`}
            >
              Menunggu Approval ({countPending})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Disetujui ({countApproved})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-[#18181B] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Ditolak ({pos.filter((p) => p.status === 'rejected').length})
            </button>

            <div className="h-5 w-px bg-borderline mx-1 hidden sm:block" />

            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs font-medium text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            >
              <option value="all">Semua Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. PO atau supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* PO Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Nomor PO</th>
                  <th className="py-3 px-4">Mitra Supplier</th>
                  <th className="py-3 px-4">Tanggal Pengajuan</th>
                  <th className="py-3 px-4">Daftar Bahan Diminta</th>
                  <th className="py-3 px-4 text-right">Total Estimasi (Rp)</th>
                  <th className="py-3 px-4 text-center">Status Dokumen</th>
                  <th className="py-3 px-4 text-center">Aksi Otorisasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                        <span>Memuat daftar permohonan PO...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileCheck className="w-8 h-8 text-mutedtext/40" />
                        <span className="font-bold">Tidak ada permohonan PO yang cocok dengan filter</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((p) => {
                    const totalCost = p.items?.reduce(
                      (acc, it) => acc + (it.subtotal || (it.quantity_ordered * it.unit_cost)),
                      0
                    ) || 0;
                    const isPending = p.status === 'pending_approval';

                    return (
                      <tr key={p.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        {/* No PO */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                          {p.po_number}
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-heading block">
                            {p.supplier?.name || 'Mitra Supplier'}
                          </span>
                          <span className="text-[10px] text-mutedtext">
                            {p.supplier?.payment_terms || 'Tempo'}
                          </span>
                        </td>

                        {/* Tanggal */}
                        <td className="py-3.5 px-4 text-mutedtext">
                          <span className="block font-medium text-heading">
                            {new Date(p.order_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-mutedtext">
                            Est. Tiba: {p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                          </span>
                        </td>

                        {/* Items preview */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {p.items?.slice(0, 2).map((it, idx) => (
                              <div key={idx} className="text-[11px] font-medium text-heading flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                                <span>{it.raw_material?.name || 'Bahan'}</span>
                                <span className="text-mutedtext font-mono font-bold">
                                  ({it.quantity_ordered.toLocaleString()} {it.unit?.symbol || it.raw_material?.standard_unit?.symbol || 'satuan'})
                                </span>
                              </div>
                            ))}
                            {(p.items?.length || 0) > 2 && (
                              <span className="text-[10px] text-mutedtext italic block pl-2.5">
                                +{(p.items?.length || 0) - 2} bahan lainnya...
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Cost */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-heading">
                          {formatRupiah(totalCost)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'pending_approval'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : p.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : p.status === 'received' || p.status === 'completed'
                                ? 'bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {p.status === 'pending_approval'
                              ? 'Menunggu Approval Admin'
                              : p.status === 'approved'
                              ? 'Disetujui Admin'
                              : p.status === 'received' || p.status === 'completed'
                              ? 'Barang Diterima Gudang'
                              : 'Ditolak'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(p)}
                                  disabled={isProcessing}
                                  className="px-2.5 py-1 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Setujui PO ini"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectModal(p)}
                                  disabled={isProcessing}
                                  className="px-2 py-1 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Tolak PO ini"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => setSelectedPO(p)}
                              className="p-1.5 text-mutedtext hover:text-heading rounded-lg hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                              title="Lihat Detail Permohonan PO"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Detail PO */}
        {selectedPO && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base font-mono text-[#FF6B00]">
                    {selectedPO.po_number}
                  </h3>
                  <p className="text-xs text-mutedtext">Detail Permohonan Pengadaan Bahan Baku Supplier</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                {/* Info Card */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FAFAFA] p-4 rounded-2xl border border-borderline">
                  <div>
                    <span className="text-mutedtext block text-[11px]">Mitra Supplier:</span>
                    <strong className="text-heading text-xs mt-0.5 block">{selectedPO.supplier?.name || '-'}</strong>
                    <span className="text-[10px] text-mutedtext">{selectedPO.supplier?.payment_terms || 'Tempo'}</span>
                  </div>
                  <div>
                    <span className="text-mutedtext block text-[11px]">Tgl Pengajuan:</span>
                    <strong className="text-heading text-xs mt-0.5 block">
                      {new Date(selectedPO.order_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </strong>
                    <span className="text-[10px] text-mutedtext">Oleh: Operator Gudang Pusat</span>
                  </div>
                  <div>
                    <span className="text-mutedtext block text-[11px]">Status Dokumen:</span>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPO.status === 'pending_approval'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : selectedPO.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : selectedPO.status === 'received'
                          ? 'bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {selectedPO.status === 'pending_approval'
                        ? 'Menunggu Approval Admin'
                        : selectedPO.status === 'approved'
                        ? 'Disetujui Admin'
                        : selectedPO.status === 'received'
                        ? 'Barang Diterima'
                        : 'Ditolak'}
                    </span>
                  </div>
                </div>

                {selectedPO.notes && (
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs">
                    <span className="font-bold text-amber-900 block mb-0.5">Catatan Operator Gudang:</span>
                    <p className="text-amber-800">{selectedPO.notes}</p>
                  </div>
                )}

                {/* Items Table */}
                <div className="space-y-2">
                  <h4 className="font-bold text-heading text-xs">Rincian Bahan Baku yang Diajukan:</h4>
                  <div className="border border-borderline rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F4F4F5] text-mutedtext text-[10px] uppercase font-bold border-b border-borderline">
                          <th className="py-2.5 px-3">Bahan Baku</th>
                          <th className="py-2.5 px-3 text-center">Jumlah Pesanan</th>
                          <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderline">
                        {selectedPO.items?.map((it, idx) => {
                          const unitSymbol = it.unit?.symbol || it.raw_material?.standard_unit?.symbol || 'satuan';
                          const subtotal = it.subtotal || (it.quantity_ordered * it.unit_cost);

                          return (
                            <tr key={idx} className="hover:bg-[#FAFAFA]">
                              <td className="py-2.5 px-3 font-bold text-heading">
                                {it.raw_material?.name || 'Bahan Baku'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-heading">
                                {it.quantity_ordered.toLocaleString()} {unitSymbol}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-mutedtext">
                                {formatRupiah(it.unit_cost)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-heading">
                                {formatRupiah(subtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="flex items-center justify-between p-3.5 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] text-xs">
                  <span className="font-bold text-[#18181B]">Total Estimasi Nilai PO:</span>
                  <span className="text-base font-black font-mono text-[#FF6B00]">
                    {formatRupiah(
                      selectedPO.items?.reduce(
                        (acc, it) => acc + (it.subtotal || (it.quantity_ordered * it.unit_cost)),
                        0
                      ) || 0
                    )}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-borderline bg-[#FAFAFA] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Tutup
                </button>

                {selectedPO.status === 'pending_approval' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openRejectModal(selectedPO)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Permohonan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedPO)}
                      disabled={isProcessing}
                      className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isProcessing ? 'Memproses...' : 'Setujui (Approve) PO'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Alasan Penolakan */}
        {rejectReasonModalOpen && poToReject && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-sm">Tolak Permohonan PO</h3>
                  <p className="text-xs text-mutedtext">{poToReject.po_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectReasonModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                <p className="text-xs text-mutedtext leading-relaxed">
                  Tuliskan alasan penolakan agar Operator Gudang Pusat dapat merevisi kuantitas atau pemilihan vendor:
                </p>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Stok di gudang masih mencukupi, atau harga satuan melebihi anggaran bulanan..."
                  className="w-full text-xs p-3 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                />
              </div>

              <div className="px-6 py-4 border-t border-borderline bg-[#FAFAFA] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectReasonModalOpen(false)}
                  className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Menolak...' : 'Konfirmasi Tolak PO'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
