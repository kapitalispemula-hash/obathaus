'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { WarehouseReturn, Outlet, RawMaterial, WarehouseReturnItem } from '@/types/database';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  FileText,
  X,
  Store,
  Eye,
  Trash2,
  Package,
  ShieldCheck,
  Ban,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { INITIAL_WAREHOUSE_RETURNS } from '@/lib/mock-data';

export default function WarehouseReturnsPage() {
  const [returns, setReturns] = useState<WarehouseReturn[]>(INITIAL_WAREHOUSE_RETURNS);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_inspection' | 'accepted' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  // Inspection Modal
  const [inspectingReturn, setInspectingReturn] = useState<WarehouseReturn | null>(null);
  const [inspectAction, setInspectAction] = useState<'return_to_stock' | 'discard' | 'claim_supplier'>('return_to_stock');
  const [inspectStatus, setInspectStatus] = useState<'accepted' | 'rejected'>('accepted');
  const [inspectNotes, setInspectNotes] = useState('Kemasan luar sedikit penyok namun segel alumunium dalam utuh & steril.');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  // New Return Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fromOutletId, setFromOutletId] = useState('');
  const [returnReason, setReturnReason] = useState('Kemasan rusak saat pengantaran / cacat segel');
  const [returnNotes, setReturnNotes] = useState('Dikirim kembali via armada pengiriman logistik.');
  const [returnItems, setReturnItems] = useState<{
    raw_material_id: string;
    quantity_returned: number;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail Modal (Read Only)
  const [selectedReturn, setSelectedReturn] = useState<WarehouseReturn | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [retList, outList, matList] = await Promise.all([
        dbService.getWarehouseReturns(),
        dbService.getOutlets(),
        dbService.getRawMaterials(),
      ]);
      setReturns(retList);
      setOutlets(outList);
      setMaterials(matList);
    } catch (err) {
      console.error('Failed to load returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openInspection = (ret: WarehouseReturn) => {
    setInspectingReturn(ret);
    setInspectAction('return_to_stock');
    setInspectStatus('accepted');
    setInspectNotes(`Pemeriksaan fisik oleh Operator Gudang pada ${new Date().toLocaleDateString('id-ID')}.`);
  };

  const handleExecuteInspection = async () => {
    if (!inspectingReturn) return;
    try {
      setIsSubmittingInspection(true);
      await dbService.inspectWarehouseReturn(
        inspectingReturn.id,
        'b0000000-0000-0000-0000-000000000001', // Warehouse Operator ID
        inspectAction,
        inspectStatus,
        inspectNotes
      );
      setFeedback(`Hasil pemeriksaan retur #${inspectingReturn.return_number} berhasil disimpan.`);
      setInspectingReturn(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan pemeriksaan: ${err.message || err}`);
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  const handleAddItemRow = () => {
    if (materials.length === 0) return;
    setReturnItems([
      ...returnItems,
      {
        raw_material_id: materials[0].id,
        quantity_returned: 1,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...returnItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setReturnItems(updated);
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fromOutletId) {
      setFormError('Pilih cabang asal retur terlebih dahulu.');
      return;
    }
    if (returnItems.length === 0) {
      setFormError('Tambahkan minimal 1 jenis bahan baku yang diretur.');
      return;
    }
    for (const itm of returnItems) {
      if (itm.quantity_returned <= 0) {
        setFormError('Jumlah barang retur harus lebih besar dari 0.');
        return;
      }
    }

    try {
      setIsSaving(true);
      const itemsPayload: WarehouseReturnItem[] = returnItems.map((itm, idx) => ({
        id: `reti-${Date.now()}-${idx}`,
        return_id: '',
        raw_material_id: itm.raw_material_id,
        quantity_returned: itm.quantity_returned,
        quantity_accepted: 0,
        action: 'discard',
      }));

      await dbService.createWarehouseReturn({
        from_outlet_id: fromOutletId,
        to_warehouse_id: 'e0000000-0000-0000-0000-000000000001',
        reason: returnReason,
        notes: returnNotes,
        items: itemsPayload,
      });

      setFeedback('Dokumen retur fisik cabang berhasil didaftarkan dan menunggu pemeriksaan.');
      setIsCreateModalOpen(false);
      setReturnItems([]);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat dokumen retur');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReturns = returns.filter((r) => {
    const matchQuery =
      r.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.from_outlet?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const countPending = returns.filter((r) => r.status === 'pending_inspection').length;
  const countAccepted = returns.filter((r) => r.status === 'accepted').length;
  const countRejected = returns.filter((r) => r.status === 'rejected').length;

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">Pemeriksaan Retur Barang Cabang</h1>
              <p className="text-xs text-subtle mt-0.5">
                Inspeksi kualitas fisik barang retur dari 7 outlet Obat Haus dan penetapan disposisi stok
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
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Retur Masuk</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{returns.length}</div>
            <div className="text-xs text-slate-500 mt-1">Seluruh berkas retur tercatat</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Perlu Inspeksi</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-600">{countPending}</div>
            <div className="text-xs text-amber-600 font-medium mt-1">Menunggu pemeriksaan fisik</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Retur Diterima</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{countAccepted}</div>
            <div className="text-xs text-slate-500 mt-1">Sudah diperiksa & ditetapkan</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#ECEEF1] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Retur Ditolak</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700">{countRejected}</div>
            <div className="text-xs text-slate-500 mt-1">Dikembalikan ke cabang</div>
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
                placeholder="Cari nomor retur, cabang, atau alasan..."
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
                Semua ({returns.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending_inspection')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'pending_inspection' ? 'bg-[#18181B] text-white font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Menunggu ({countPending})
              </button>
              <button
                onClick={() => setStatusFilter('accepted')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'accepted' ? 'bg-[#18181B] text-white font-semibold shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Diterima ({countAccepted})
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
            onClick={() => {
              setFromOutletId(outlets[0]?.id || '');
              setReturnReason('Kemasan penyok/rusak saat handling kurir');
              setReturnNotes('');
              setReturnItems([
                {
                  raw_material_id: materials[0]?.id || '',
                  quantity_returned: 1,
                },
              ]);
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-orange-500/20 shrink-0 w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Retur Fisik Baru</span>
          </button>
        </div>

        {/* 3. Table of Returns */}
        <div className="bg-white rounded-2xl border border-[#ECEEF1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEEF1] bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Nomor & Tanggal Retur</th>
                  <th className="py-3.5 px-4">Cabang Pengirim</th>
                  <th className="py-3.5 px-4">Alasan Retur</th>
                  <th className="py-3.5 px-4 text-center">Bahan Diretur</th>
                  <th className="py-3.5 px-4">Status & Hasil</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF1] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Memuat daftar pemeriksaan retur...
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada dokumen retur yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => {
                    const isPending = ret.status === 'pending_inspection';
                    const isAccepted = ret.status === 'accepted';

                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-[#FF6B00]" />
                            <span>{ret.return_number}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {new Date(ret.return_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ret.from_outlet?.name || 'Outlet Cabang'}</span>
                          </div>
                          <div className="text-xs text-slate-500">{ret.from_outlet?.address || 'Makassar'}</div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <div className="text-slate-800 font-medium line-clamp-1">{ret.reason}</div>
                          {ret.notes && <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{ret.notes}</div>}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {ret.items?.length || 0} Material
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Menunggu Inspeksi
                            </span>
                          )}
                          {isAccepted && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" />
                                Diterima & Diproses
                              </span>
                              {ret.items && ret.items[0]?.action && (
                                <div className="text-[10px] text-slate-500">
                                  Disposisi:{' '}
                                  <strong className="text-slate-700">
                                    {ret.items[0].action === 'return_to_stock'
                                      ? 'Masuk Stok'
                                      : ret.items[0].action === 'discard'
                                      ? 'Pemusnahan'
                                      : 'Klaim Vendor'}
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                          {ret.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <Ban className="w-3 h-3" />
                              Ditolak (Kembali ke Cabang)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
                              <button
                                onClick={() => openInspection(ret)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#e05e00] text-white text-xs font-medium transition-colors shadow-xs"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Periksa Fisik</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedReturn(ret)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail Hasil</span>
                              </button>
                            )}
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

        {/* 4. Modal Pemeriksaan Fisik Barang Retur */}
        {inspectingReturn && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Pemeriksaan Fisik Retur</h3>
                    <p className="text-xs text-slate-500">
                      Dokumen #{inspectingReturn.return_number} dari {inspectingReturn.from_outlet?.name || 'Cabang'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingReturn(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Info Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Asal Cabang:</span>
                    <strong className="text-slate-900 text-sm">{inspectingReturn.from_outlet?.name || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Alasan Retur Cabang:</span>
                    <strong className="text-slate-900">{inspectingReturn.reason}</strong>
                  </div>
                </div>

                {/* Items to Inspect */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Daftar Bahan yang Diperiksa
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Nama Bahan Baku</th>
                          <th className="py-2.5 px-3 text-right">Jumlah Retur</th>
                          <th className="py-2.5 px-3 text-center">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectingReturn.items?.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-800">
                              {item.raw_material?.name || 'Bahan Baku'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {item.quantity_returned.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">
                              {item.raw_material?.standard_unit?.symbol || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Keputusan / Disposisi Fisik */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Keputusan Hasil Inspeksi Fisik
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setInspectStatus('accepted');
                        setInspectAction('return_to_stock');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        inspectStatus === 'accepted' && inspectAction === 'return_to_stock'
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Layak Pakai (Kembalikan ke Stok)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Segel utuh & baik. Stok fisik gudang otomatis bertambah kembali.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInspectStatus('accepted');
                        setInspectAction('discard');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        inspectStatus === 'accepted' && inspectAction === 'discard'
                          ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Musnahkan / Afkir (Rusak Berat)</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Terkontaminasi / basi. Tidak menambah stok gudang, dicatat sebagai kerugian.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInspectStatus('accepted');
                        setInspectAction('claim_supplier');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        inspectStatus === 'accepted' && inspectAction === 'claim_supplier'
                          ? 'border-[#FF6B00] bg-[#FFF7ED] ring-2 ring-[#FF6B00]/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Klaim ke Pabrik / Vendor</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Cacat produksi awal. Masuk karantina untuk penggantian stok supplier.
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInspectStatus('rejected');
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        inspectStatus === 'rejected'
                          ? 'border-slate-700 bg-slate-100 ring-2 ring-slate-400'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Ban className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">Tolak Permintaan Retur</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Kerusakan kelalaian cabang. Barang dikirim balik ke outlet.
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Catatan Inspeksi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Catatan Fisik Petugas Pemeriksa
                  </label>
                  <textarea
                    rows={2}
                    value={inspectNotes}
                    onChange={(e) => setInspectNotes(e.target.value)}
                    placeholder="Tuliskan temuan fisik (misal: segel sobek, bau menyimpang, exp date terhapus)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#ECEEF1] bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInspectingReturn(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteInspection}
                  disabled={isSubmittingInspection}
                  className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSubmittingInspection ? 'Menyimpan...' : 'Simpan & Tetapkan Disposisi'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Modal Catat Retur Baru */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Catat Dokumen Retur Fisik</h3>
                    <p className="text-xs text-slate-500">Pendaftaran bahan baku rusak/kembali dari outlet cabang</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateReturn} className="p-6 overflow-y-auto space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Outlet Cabang Pengirim <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fromOutletId}
                    onChange={(e) => setFromOutletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {outlets.map((out) => (
                      <option key={out.id} value={out.id}>
                        {out.name} ({out.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alasan Pengembalian / Retur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Contoh: Susu UHT kemasan bocor saat handling kurir"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Tambahan
                  </label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="Keterangan kondisi kemasan atau informasi ekspedisi..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Return Items List */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Item Bahan Baku Diretur
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="text-xs text-[#FF6B00] hover:text-[#e05e00] font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {returnItems.map((itm, idx) => {
                      const selectedMat = materials.find((m) => m.id === itm.raw_material_id);
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <select
                            value={itm.raw_material_id}
                            onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#FF6B00]"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.sku})
                              </option>
                            ))}
                          </select>

                          <div className="w-24 flex items-center">
                            <input
                              type="number"
                              min={0.1}
                              step="any"
                              value={itm.quantity_returned}
                              onChange={(e) => handleItemChange(idx, 'quantity_returned', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right focus:ring-1 focus:ring-[#FF6B00]"
                            />
                            <span className="text-[11px] text-slate-500 ml-1.5">
                              {selectedMat?.standard_unit?.symbol || ''}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
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
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e05e00] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Daftarkan Retur'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Modal Detail Retur (Read Only) */}
        {selectedReturn && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Detail Hasil Pemeriksaan Retur</h3>
                    <p className="text-xs text-slate-500">#{selectedReturn.return_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Cabang Pengirim:</span>
                    <strong className="text-slate-800">{selectedReturn.from_outlet?.name || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status Dokumen:</span>
                    <strong className="capitalize text-slate-800">{selectedReturn.status.replace('_', ' ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tanggal Retur:</span>
                    <span className="text-slate-700">
                      {new Date(selectedReturn.return_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tanggal Diperiksa:</span>
                    <span className="text-slate-700">
                      {selectedReturn.inspected_at
                        ? new Date(selectedReturn.inspected_at).toLocaleDateString('id-ID')
                        : 'Belum diperiksa'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">Alasan Retur:</span>
                  <p className="text-slate-800 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
                    {selectedReturn.reason}
                  </p>
                </div>

                {selectedReturn.notes && (
                  <div>
                    <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-1">Catatan Inspeksi:</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {selectedReturn.notes}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 font-semibold uppercase tracking-wider block mb-2">Item Retur & Tindakan:</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Bahan</th>
                          <th className="py-2 px-3 text-right">Diretur</th>
                          <th className="py-2 px-3 text-right">Diterima</th>
                          <th className="py-2 px-3">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReturn.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {item.raw_material?.name || 'Bahan Baku'}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold">
                              {item.quantity_returned}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                              {item.quantity_accepted}
                            </td>
                            <td className="py-2 px-3 capitalize text-slate-600">
                              {item.action === 'return_to_stock'
                                ? 'Masuk Stok'
                                : item.action === 'discard'
                                ? 'Dimusnahkan'
                                : 'Klaim Vendor'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedReturn(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WarehouseLayout>
  );
}
