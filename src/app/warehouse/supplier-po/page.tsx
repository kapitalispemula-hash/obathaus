'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { SupplierPO, Supplier, RawMaterial, Unit } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import {
  FileText,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Building2,
  Calendar,
  Trash2,
  Eye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { INITIAL_SUPPLIER_POS } from '@/lib/mock-data';

export default function WarehouseSupplierPOPage() {
  const [pos, setPos] = useState<SupplierPO[]>(INITIAL_SUPPLIER_POS);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State Add PO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<{
    raw_material_id: string;
    quantity: number;
    unit_id: string;
    unit_cost: number;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail Modal
  const [selectedPO, setSelectedPO] = useState<SupplierPO | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [poList, supList, matList, unitList] = await Promise.all([
        dbService.getSupplierPOs(),
        dbService.getSuppliers(),
        dbService.getRawMaterials(),
        dbService.getUnits(),
      ]);
      setPos(poList);
      setSuppliers(supList);
      setMaterials(matList);
      setUnits(unitList);
    } catch (err) {
      console.error('Failed to load supplier POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setExpectedDate('');
    setNotes('');
    setPoItems([
      {
        raw_material_id: materials[0]?.id || '',
        quantity: 1000,
        unit_id: materials[0]?.standard_unit_id || 'unit-gram',
        unit_cost: materials[0]?.estimated_unit_cost || 100,
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setPoItems([
      ...poItems,
      {
        raw_material_id: materials[0]?.id || '',
        quantity: 1000,
        unit_id: materials[0]?.standard_unit_id || 'unit-gram',
        unit_cost: materials[0]?.estimated_unit_cost || 100,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...poItems];
    if (field === 'raw_material_id') {
      const mat = materials.find((m) => m.id === value);
      updated[idx].raw_material_id = value;
      if (mat) {
        updated[idx].unit_id = mat.standard_unit_id;
        updated[idx].unit_cost = mat.estimated_unit_cost;
      }
    } else {
      (updated[idx] as any)[field] = value;
    }
    setPoItems(updated);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSupplierId) {
      setFormError('Pilih mitra supplier tujuan.');
      return;
    }

    if (poItems.length === 0) {
      setFormError('Tambahkan minimal 1 item bahan baku.');
      return;
    }

    for (const item of poItems) {
      if (item.quantity <= 0) {
        setFormError('Kuantitas pesanan harus lebih besar dari 0.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await dbService.createSupplierPO({
        supplier_id: selectedSupplierId,
        expected_delivery_date: expectedDate || null,
        notes: notes.trim() || null,
        items: poItems.map((item, idx) => ({
          id: `poi-${Date.now()}-${idx}`,
          supplier_po_id: '',
          raw_material_id: item.raw_material_id,
          quantity_ordered: Number(item.quantity),
          unit_id: item.unit_id,
          unit_cost: Number(item.unit_cost),
          quantity_received: 0,
          subtotal: Number(item.quantity) * Number(item.unit_cost),
        })),
      });

      setIsModalOpen(false);
      setFeedback('Permohonan PO berhasil diajukan! Notifikasi real-time telah diteruskan ke Admin untuk persetujuan.');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengajukan Purchase Order.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPOs = pos.filter((p) =>
    p.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.supplier?.name && p.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Pengadaan Bahan Baku Supplier (PO)</h1>
              <p className="text-xs text-mutedtext">
                Buat permohonan pengadaan PO ke supplier. Persetujuan dilakukan secara terpusat oleh Admin/Owner.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Draft PO Baru</span>
          </button>
        </div>

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

        {/* Info Banner: Segregation of Duties */}
        <div className="bg-[#FFF7ED] border border-[#FED7AA] p-4 rounded-2xl text-xs text-[#18181B] flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#FF6B00] shrink-0" />
          <p>
            <strong>Prinsip Pemisahan Tugas (Segregation of Duties):</strong> Operator Gudang membuat permohonan pengadaan PO. Dokumen akan diteruskan dengan status <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Menunggu Persetujuan Admin/Owner</span> sebelum diterbitkan ke pihak supplier.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-heading">
            Total {pos.length} Dokumen PO Terdata
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor PO atau supplier..."
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
                  <th className="py-3 px-4">Tanggal Pesanan</th>
                  <th className="py-3 px-4">Estimasi Tiba</th>
                  <th className="py-3 px-4 text-right">Total Nilai Pesanan</th>
                  <th className="py-3 px-4 text-center">Status Dokumen</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredPOs.map((p) => {
                  const totalCost = p.items?.reduce((acc, it) => acc + it.subtotal, 0) || 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                        {p.po_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-heading">{p.supplier?.name || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext">
                        {new Date(p.order_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext">
                        {p.expected_delivery_date
                          ? new Date(p.expected_delivery_date).toLocaleDateString('id-ID')
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-heading">
                        {formatRupiah(totalCost)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'pending_approval'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : p.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : p.status === 'received'
                              ? 'bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {p.status === 'pending_approval'
                            ? 'Menunggu Approval Admin'
                            : p.status === 'approved'
                            ? 'Disetujui Admin'
                            : p.status === 'received'
                            ? 'Barang Telah Diterima'
                            : 'Ditolak'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedPO(p)}
                          className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                          title="Lihat Detail PO"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Buat PO */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base">Buat Permohonan PO Supplier</h3>
                  <p className="text-xs text-mutedtext">Permohonan akan otomatis diteruskan ke Admin untuk persetujuan</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePO} className="p-6 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Pilih Mitra Supplier *
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.payment_terms || 'Tempo'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Estimasi Tanggal Tiba (Delivery Date)
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Catatan Pengadaan
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Restock persiapan lonjakan pesanan akhir pekan"
                    className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Items Section */}
                <div className="space-y-3 pt-3 border-t border-borderline">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-heading">Daftar Bahan Baku yang Dipesan</h4>
                      <p className="text-[11px] text-mutedtext">Tentukan kuantitas pesanan sesuai satuan fisik (gr, ml, pcs, dll)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>

                  {/* Header Kolom Tabel */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-[#F4F4F5] rounded-xl text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                    <div className="col-span-5">Pilihan Bahan Baku</div>
                    <div className="col-span-3 text-center">Jumlah Pesanan (Qty)</div>
                    <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
                    <div className="col-span-2 text-right">Subtotal Estimasi</div>
                  </div>

                  <div className="space-y-2">
                    {poItems.map((item, idx) => {
                      const mat = materials.find((m) => m.id === item.raw_material_id);
                      const unitSymbol = mat?.standard_unit?.symbol || 'satuan';
                      const subtotal = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);

                      return (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#FAFAFA] p-2.5 rounded-xl border border-borderline">
                          {/* 1. Bahan Baku Selector */}
                          <div className="sm:col-span-5">
                            <span className="block sm:hidden text-[10px] font-bold text-mutedtext mb-1 uppercase">Bahan Baku</span>
                            <select
                              value={item.raw_material_id}
                              onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                              className="w-full text-xs p-2 bg-white border border-borderline rounded-lg text-heading font-medium focus:outline-none focus:border-[#FF6B00]"
                            >
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.standard_unit?.symbol})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 2. Jumlah Fisik dengan Suffix Satuan Dinamis */}
                          <div className="sm:col-span-3">
                            <span className="block sm:hidden text-[10px] font-bold text-mutedtext mb-1 uppercase">Jumlah Pesanan (Qty)</span>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                placeholder="0"
                                className="w-full text-xs py-2 pl-3 pr-12 bg-white border border-borderline rounded-lg text-heading font-mono font-bold text-right focus:outline-none focus:border-[#FF6B00]"
                              />
                              <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] pointer-events-none">
                                {unitSymbol}
                              </span>
                            </div>
                          </div>

                          {/* 3. Estimasi Harga Satuan dengan Prefix Rp */}
                          <div className="sm:col-span-2">
                            <span className="block sm:hidden text-[10px] font-bold text-mutedtext mb-1 uppercase">Harga Satuan (Rp)</span>
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-[10px] font-bold text-mutedtext pointer-events-none">
                                Rp
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={item.unit_cost}
                                onChange={(e) => handleItemChange(idx, 'unit_cost', Number(e.target.value))}
                                placeholder="0"
                                className="w-full text-xs py-2 pl-8 pr-2 bg-white border border-borderline rounded-lg text-heading font-mono text-right focus:outline-none focus:border-[#FF6B00]"
                              />
                            </div>
                          </div>

                          {/* 4. Subtotal & Delete Action */}
                          <div className="sm:col-span-2 flex items-center justify-between gap-1 pl-1">
                            <div className="text-right flex-1">
                              <span className="block sm:hidden text-[10px] font-bold text-mutedtext uppercase">Subtotal:</span>
                              <span className="font-mono font-bold text-xs text-heading truncate">
                                {formatRupiah(subtotal)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={poItems.length === 1}
                              className="p-1.5 text-mutedtext hover:text-red-600 disabled:opacity-20 cursor-pointer rounded-lg hover:bg-red-50 transition-colors shrink-0"
                              title="Hapus Baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between p-3.5 bg-[#FFF7ED] rounded-xl border border-[#FED7AA] text-xs mt-3">
                    <span className="font-bold text-[#18181B]">Total Estimasi Pembelian PO:</span>
                    <span className="text-sm font-black font-mono text-[#FF6B00]">
                      {formatRupiah(poItems.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSaving ? 'Mengajukan...' : 'Ajukan PO ke Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Detail PO */}
        {selectedPO && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base font-mono text-[#FF6B00]">
                    {selectedPO.po_number}
                  </h3>
                  <p className="text-xs text-mutedtext">Detail Permohonan Pengadaan Supplier</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA] p-3 rounded-xl border border-borderline">
                  <div>
                    <span className="text-mutedtext">Supplier:</span>
                    <p className="font-bold text-heading mt-0.5">{selectedPO.supplier?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-mutedtext">Status Persetujuan:</span>
                    <p className="font-bold text-[#FF6B00] mt-0.5 uppercase tracking-wide">
                      {selectedPO.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-heading mb-2">Item Bahan Dipesan:</h4>
                  <div className="divide-y divide-borderline border border-borderline rounded-xl overflow-hidden">
                    {selectedPO.items?.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-heading">{it.raw_material?.name || it.raw_material_id}</p>
                          <p className="text-[11px] text-mutedtext font-mono">
                            {it.quantity_ordered.toLocaleString()} {it.unit?.symbol || 'satuan'} @ {formatRupiah(it.unit_cost)}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-heading">
                          {formatRupiah(it.subtotal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-borderline flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPO(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-heading rounded-xl text-xs font-bold"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WarehouseLayout>
  );
}
