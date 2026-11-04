'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { Dispatch, Outlet, RawMaterial, OutletOrder } from '@/types/database';
import {
  Send,
  Plus,
  Search,
  CheckCircle,
  Truck,
  FileText,
  AlertCircle,
  X,
  Store,
  Navigation,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { INITIAL_DISPATCHES } from '@/lib/mock-data';

function WarehouseDispatchContent() {
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get('order_id');

  const [dispatches, setDispatches] = useState<Dispatch[]>(INITIAL_DISPATCHES);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [orders, setOrders] = useState<OutletOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [driverName, setDriverName] = useState('Pak Daeng Rapi (Kurir Logistik Obat Haus)');
  const [vehicleNumber, setVehicleNumber] = useState('DD 4521 XA (Mobil Box)');
  const [notes, setNotes] = useState('Pengiriman batch reguler aman dan rapi.');
  const [dispatchItems, setDispatchItems] = useState<{
    raw_material_id: string;
    quantity: number;
    unit_symbol: string;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail Modal
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dspList, outList, matList, ordList] = await Promise.all([
        dbService.getDispatches(),
        dbService.getOutlets(),
        dbService.getRawMaterials(),
        dbService.getOutletOrders(),
      ]);
      setDispatches(dspList);
      setOutlets(outList);
      setMaterials(matList);
      setOrders(ordList);

      if (prefillOrderId) {
        const ord = ordList.find((o) => o.id === prefillOrderId);
        if (ord) {
          openAddModalWithOrder(ord);
        }
      }
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [prefillOrderId]);

  const openAddModalWithOrder = (ord: OutletOrder) => {
    setSelectedOutletId(ord.outlet_id);
    setRelatedOrderId(ord.id);
    setDriverName('Pak Daeng Rapi (Kurir Logistik Obat Haus)');
    setVehicleNumber('DD 4521 XA (Mobil Box)');
    setNotes(`Pengiriman pesanan ${ord.order_number}`);
    setFormError(null);

    if (ord.items && ord.items.length > 0) {
      setDispatchItems(
        ord.items.map((it) => ({
          raw_material_id: it.raw_material_id,
          quantity: it.quantity_requested,
          unit_symbol: it.raw_material?.standard_unit?.symbol || 'satuan',
        }))
      );
    } else {
      setDispatchItems([]);
    }

    setIsModalOpen(true);
  };

  const openAddModalManual = () => {
    setSelectedOutletId(outlets[0]?.id || '');
    setRelatedOrderId('');
    setDriverName('Pak Daeng Rapi (Kurir Logistik Obat Haus)');
    setVehicleNumber('DD 4521 XA (Mobil Box)');
    setNotes('Pengiriman restock langsung ke cabang');
    setFormError(null);

    setDispatchItems([
      {
        raw_material_id: materials[0]?.id || '',
        quantity: 1000,
        unit_symbol: materials[0]?.standard_unit?.symbol || 'g',
      },
    ]);

    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setDispatchItems([
      ...dispatchItems,
      {
        raw_material_id: materials[0]?.id || '',
        quantity: 1000,
        unit_symbol: materials[0]?.standard_unit?.symbol || 'g',
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (dispatchItems.length === 1) return;
    setDispatchItems(dispatchItems.filter((_, i) => i !== idx));
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedOutletId) {
      setFormError('Pilih cabang tujuan pengiriman.');
      return;
    }

    if (dispatchItems.length === 0) {
      setFormError('Tambahkan minimal 1 item bahan yang dikirim.');
      return;
    }

    setIsSaving(true);
    try {
      await dbService.createDispatch({
        outlet_order_id: relatedOrderId || '',
        to_outlet_id: selectedOutletId,
        driver_name: driverName.trim() || null,
        vehicle_number: vehicleNumber.trim() || null,
        notes: notes.trim() || null,
        items: dispatchItems.map((it) => {
          const mat = materials.find((m) => m.id === it.raw_material_id);
          return {
            id: crypto.randomUUID(),
            dispatch_id: '',
            raw_material_id: it.raw_material_id,
            quantity_dispatched: Number(it.quantity),
            unit_id: mat?.standard_unit_id || '11111111-0000-0000-0000-000000000001',
          };
        }),
      });

      setIsModalOpen(false);
      await loadData();
      setFeedback('Surat Jalan resmi berhasil diterbitkan! Stok gudang telah dipotong dan berstatus In-Transit.');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menerbitkan Surat Jalan.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDispatches = dispatches.filter((d) =>
    d.dispatch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.to_outlet?.name && d.to_outlet.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.driver_name && d.driver_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Surat Jalan & Pengiriman In-Transit</h1>
              <p className="text-xs text-mutedtext">
                Penerbitan Surat Jalan resmi distribusi bahan baku dari Gudang Pusat ke 7 cabang outlet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModalManual}
            className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Surat Jalan Baru</span>
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
            Total {dispatches.length} Dokumen Surat Jalan Tercatat
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor Surat Jalan atau driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Table Dispatches */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">No. Surat Jalan</th>
                  <th className="py-3 px-4">Cabang Tujuan</th>
                  <th className="py-3 px-4">Tanggal Kirim</th>
                  <th className="py-3 px-4">Kurir & Kendaraan</th>
                  <th className="py-3 px-4 text-center">Jumlah Item</th>
                  <th className="py-3 px-4 text-center">Status Perjalanan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                      {d.dispatch_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                        <span className="font-bold text-heading">{d.to_outlet?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-mutedtext">
                      {new Date(d.dispatch_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-mutedtext">
                      <div className="space-y-0.5">
                        <p className="font-medium text-heading text-[11px]">{d.driver_name || '-'}</p>
                        <p className="text-[10px] font-mono">{d.vehicle_number || ''}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-heading font-mono">
                      {d.items?.length || 0} bahan
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'in_transit'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {d.status === 'in_transit' ? (
                          <>
                            <Navigation className="w-3 h-3 text-amber-600" />
                            <span>In-Transit (Dalam Perjalanan)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Diterima Outlet</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedDispatch(d)}
                        className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                        title="Lihat Detail Surat Jalan"
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

        {/* Modal Buat Surat Jalan */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base">Terbitkan Surat Jalan Distribusi</h3>
                  <p className="text-xs text-mutedtext">Stok gudang pusat akan dipotong otomatis dan berpindah ke status in-transit</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveDispatch} className="p-6 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Pilih Cabang Outlet Tujuan *
                    </label>
                    <select
                      value={selectedOutletId}
                      onChange={(e) => setSelectedOutletId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    >
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.code}: {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Nama Kurir / Pengemudi
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Nomor Polisi / Armada Kendaraan
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Catatan Surat Jalan
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                {/* Items to dispatch */}
                <div className="space-y-3 pt-3 border-t border-borderline">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-heading">Bahan Baku yang Dikirimkan</h4>
                      <p className="text-[11px] text-mutedtext">Tentukan kuantitas stok yang dimuat ke kurir sesuai satuannya</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="text-xs font-bold text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Item</span>
                    </button>
                  </div>

                  {/* Header Kolom Form */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-1.5 bg-[#F4F4F5] rounded-xl text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
                    <div className="col-span-8">Pilihan Bahan Baku</div>
                    <div className="col-span-4 text-center">Jumlah Kirim (Qty Fisik)</div>
                  </div>

                  <div className="space-y-2">
                    {dispatchItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-[#FAFAFA] p-2.5 rounded-xl border border-borderline">
                        <div className="sm:col-span-8">
                          <select
                            value={item.raw_material_id}
                            onChange={(e) => {
                              const up = [...dispatchItems];
                              const mat = materials.find((m) => m.id === e.target.value);
                              up[idx].raw_material_id = e.target.value;
                              up[idx].unit_symbol = mat?.standard_unit?.symbol || 'satuan';
                              setDispatchItems(up);
                            }}
                            className="w-full text-xs p-2 bg-white border border-borderline rounded-lg text-heading font-medium focus:outline-none focus:border-[#FF6B00]"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.standard_unit?.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4 flex items-center gap-2">
                          <div className="relative flex-1 flex items-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const up = [...dispatchItems];
                                up[idx].quantity = Number(e.target.value);
                                setDispatchItems(up);
                              }}
                              className="w-full text-xs py-2 pl-3 pr-12 bg-white border border-borderline rounded-lg text-heading font-mono font-bold text-right focus:outline-none focus:border-[#FF6B00]"
                            />
                            <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-black bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] pointer-events-none">
                              {item.unit_symbol}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={dispatchItems.length === 1}
                            className="p-1.5 text-mutedtext hover:text-red-600 disabled:opacity-20 cursor-pointer rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                    {isSaving ? 'Menerbitkan...' : 'Terbitkan Surat Jalan (In-Transit)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Detail Surat Jalan */}
        {selectedDispatch && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base font-mono text-[#FF6B00]">
                    {selectedDispatch.dispatch_number}
                  </h3>
                  <p className="text-xs text-mutedtext">Surat Jalan Distribusi Logistik</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDispatch(null)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA] p-3 rounded-xl border border-borderline">
                  <div>
                    <span className="text-mutedtext">Tujuan Cabang:</span>
                    <p className="font-bold text-heading mt-0.5">{selectedDispatch.to_outlet?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-mutedtext">Kurir & Nopol:</span>
                    <p className="font-bold text-heading mt-0.5">{selectedDispatch.driver_name} ({selectedDispatch.vehicle_number})</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-heading mb-2">Item Bahan Baku Dikirim:</h4>
                  <div className="divide-y divide-borderline border border-borderline rounded-xl overflow-hidden">
                    {selectedDispatch.items?.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-heading">{it.raw_material?.name || it.raw_material_id}</p>
                          <p className="text-[11px] text-mutedtext font-mono">
                            {it.raw_material?.code}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-[#18181B] text-sm">
                          {it.quantity_dispatched.toLocaleString()} {it.raw_material?.standard_unit?.symbol}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-borderline flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDispatch(null)}
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

export default function WarehouseDispatchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#A1A1AA]">Memuat Surat Jalan & Pengiriman...</p>
          </div>
        </div>
      }
    >
      <WarehouseDispatchContent />
    </React.Suspense>
  );
}
