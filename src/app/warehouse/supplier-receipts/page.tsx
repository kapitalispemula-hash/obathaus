'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { SupplierReceipt, SupplierPO, RawMaterial } from '@/types/database';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  FileText,
  AlertCircle,
  X,
  Package,
  Calendar,
  Hash,
  Eye,
  Sparkles,
} from 'lucide-react';
import { INITIAL_SUPPLIER_RECEIPTS } from '@/lib/mock-data';

export default function WarehouseSupplierReceiptsPage() {
  const [receipts, setReceipts] = useState<SupplierReceipt[]>(INITIAL_SUPPLIER_RECEIPTS);
  const [approvedPOs, setApprovedPOs] = useState<SupplierPO[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [deliveryOrderNum, setDeliveryOrderNum] = useState('');
  const [notes, setNotes] = useState('Kondisi fisik barang utuh, segel aman.');
  const [receiptItems, setReceiptItems] = useState<{
    po_item_id: string;
    raw_material_id: string;
    raw_material_name: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_symbol: string;
    batch_number: string;
    expiry_date: string;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail Modal
  const [selectedReceipt, setSelectedReceipt] = useState<SupplierReceipt | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, poList, matList] = await Promise.all([
        dbService.getSupplierReceipts(),
        dbService.getSupplierPOs(),
        dbService.getRawMaterials(),
      ]);
      setReceipts(recList);
      setApprovedPOs(poList.filter((p) => p.status === 'approved'));
      setMaterials(matList);
    } catch (err) {
      console.error('Failed to load supplier receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    const defaultPO = approvedPOs[0];
    setSelectedPoId(defaultPO?.id || '');
    setDeliveryOrderNum('');
    setNotes('Kondisi fisik barang utuh dan segel aman.');
    setFormError(null);

    if (defaultPO && defaultPO.items) {
      setReceiptItems(
        defaultPO.items.map((it) => ({
          po_item_id: it.id,
          raw_material_id: it.raw_material_id,
          raw_material_name: it.raw_material?.name || 'Bahan',
          quantity_ordered: it.quantity_ordered,
          quantity_received: it.quantity_ordered,
          unit_symbol: it.unit?.symbol || 'satuan',
          batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
          expiry_date: '',
        }))
      );
    } else {
      setReceiptItems([]);
    }

    setIsModalOpen(true);
  };

  const handlePOSelect = (poId: string) => {
    setSelectedPoId(poId);
    const target = approvedPOs.find((p) => p.id === poId);
    if (target && target.items) {
      setReceiptItems(
        target.items.map((it) => ({
          po_item_id: it.id,
          raw_material_id: it.raw_material_id,
          raw_material_name: it.raw_material?.name || 'Bahan',
          quantity_ordered: it.quantity_ordered,
          quantity_received: it.quantity_ordered,
          unit_symbol: it.unit?.symbol || 'satuan',
          batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
          expiry_date: '',
        }))
      );
    }
  };

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPoId) {
      setFormError('Pilih nomor PO yang telah disetujui Admin.');
      return;
    }

    if (!deliveryOrderNum.trim()) {
      setFormError('Nomor Surat Jalan (DO) dari supplier wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      await dbService.createSupplierReceipt({
        supplier_po_id: selectedPoId,
        delivery_order_number: deliveryOrderNum.trim(),
        notes: notes.trim() || null,
        items: receiptItems.map((it, idx) => ({
          id: `reci-${Date.now()}-${idx}`,
          receipt_id: '',
          po_item_id: it.po_item_id,
          raw_material_id: it.raw_material_id,
          quantity_received: Number(it.quantity_received),
          unit_id: 'unit-gram',
          batch_number: it.batch_number || null,
          expiry_date: it.expiry_date || null,
        })),
      });

      setIsModalOpen(false);
      await loadData();
      setFeedback('Barang fisik berhasil diterima! Saldo stok gudang telah bertambah otomatis.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal mencatat penerimaan barang.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReceipts = receipts.filter((r) =>
    r.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.delivery_order_number && r.delivery_order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.supplier_po?.po_number && r.supplier_po.po_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Penerimaan Barang Fisik Supplier</h1>
              <p className="text-xs text-mutedtext">
                Pencatatan barang masuk dari supplier ke Gudang Pusat berdasarkan nomor PO yang telah disetujui Admin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            disabled={approvedPOs.length === 0}
            className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terima Barang Baru</span>
          </button>
        </div>

        {feedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{feedback}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-heading">
            Total {receipts.length} Bukti Penerimaan Barang Masuk
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor tanda terima atau DO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Table Receipts */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">No. Penerimaan</th>
                  <th className="py-3 px-4">Referensi PO</th>
                  <th className="py-3 px-4">No. Surat Jalan (DO)</th>
                  <th className="py-3 px-4">Tanggal Tiba</th>
                  <th className="py-3 px-4 text-center">Jumlah Item</th>
                  <th className="py-3 px-4 text-center">Status Gudang</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                      {r.receipt_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-heading">
                      {r.supplier_po?.po_number || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-mutedtext">
                      {r.delivery_order_number || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-mutedtext">
                      {new Date(r.received_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-heading">
                      {r.items?.length || 0} bahan
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>Stok Bertambah</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(r)}
                        className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                        title="Lihat Detail Penerimaan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Penerimaan Barang */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base">Catat Penerimaan Barang Masuk</h3>
                  <p className="text-xs text-mutedtext">Verifikasi fisik barang yang tiba dari supplier</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveReceipt} className="p-6 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Pilih PO Supplier yang Disetujui *
                    </label>
                    <select
                      value={selectedPoId}
                      onChange={(e) => handlePOSelect(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    >
                      {approvedPOs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.po_number} ({p.supplier?.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Nomor Surat Jalan (DO) Supplier *
                    </label>
                    <input
                      type="text"
                      value={deliveryOrderNum}
                      onChange={(e) => setDeliveryOrderNum(e.target.value)}
                      placeholder="Contoh: SJ-SUP-99120"
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Catatan Kondisi Fisik Barang
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Received items list */}
                <div className="space-y-3 pt-3 border-t border-borderline">
                  <h4 className="text-xs font-bold text-heading">Kuantitas Aktual yang Diterima</h4>

                  <div className="space-y-2">
                    {receiptItems.map((item, idx) => (
                      <div key={idx} className="bg-[#FAFAFA] p-3 rounded-xl border border-borderline space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-heading text-xs">{item.raw_material_name}</p>
                          <span className="text-[11px] text-mutedtext font-mono">
                            Dipesan: {item.quantity_ordered.toLocaleString()} {item.unit_symbol}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-mutedtext font-bold mb-0.5">Jumlah Tiba Fisik</label>
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity_received}
                                onChange={(e) => {
                                  const up = [...receiptItems];
                                  up[idx].quantity_received = Number(e.target.value);
                                  setReceiptItems(up);
                                }}
                                className="w-full text-xs p-1.5 pr-9 bg-white border border-borderline rounded-lg font-mono font-bold text-center focus:outline-none focus:border-[#FF6B00]"
                              />
                              <span className="absolute right-2 text-[10px] font-black text-[#FF6B00] bg-[#FFF7ED] px-1 py-0.5 rounded border border-[#FED7AA] pointer-events-none">
                                {item.unit_symbol}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-mutedtext font-bold mb-0.5">Nomor Batch (Opsional)</label>
                            <input
                              type="text"
                              value={item.batch_number}
                              onChange={(e) => {
                                const up = [...receiptItems];
                                up[idx].batch_number = e.target.value;
                                setReceiptItems(up);
                              }}
                              className="w-full text-xs p-1.5 bg-white border border-borderline rounded-lg font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-mutedtext font-bold mb-0.5">Tgl Kedaluwarsa</label>
                            <input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => {
                                const up = [...receiptItems];
                                up[idx].expiry_date = e.target.value;
                                setReceiptItems(up);
                              }}
                              className="w-full text-xs p-1.5 bg-white border border-borderline rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
                    {isSaving ? 'Menyimpan & Menambah Stok...' : 'Konfirmasi Penerimaan Fisik'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Detail Receipt */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base font-mono text-[#FF6B00]">
                    {selectedReceipt.receipt_number}
                  </h3>
                  <p className="text-xs text-mutedtext">Bukti Penerimaan Barang Supplier</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA] p-3 rounded-xl border border-borderline">
                  <div>
                    <span className="text-mutedtext">No. DO Supplier:</span>
                    <p className="font-bold text-heading mt-0.5">{selectedReceipt.delivery_order_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-mutedtext">Referensi PO:</span>
                    <p className="font-mono font-bold text-heading mt-0.5">{selectedReceipt.supplier_po?.po_number || '-'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-heading mb-2">Item Bahan Diterima:</h4>
                  <div className="divide-y divide-borderline border border-borderline rounded-xl overflow-hidden">
                    {selectedReceipt.items?.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-heading">{it.raw_material?.name || it.raw_material_id}</p>
                          {it.batch_number && (
                            <p className="text-[11px] text-mutedtext font-mono">
                              Batch: {it.batch_number} {it.expiry_date ? `• Exp: ${it.expiry_date}` : ''}
                            </p>
                          )}
                        </div>
                        <p className="font-mono font-bold text-emerald-600">
                          +{it.quantity_received.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-borderline flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
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
