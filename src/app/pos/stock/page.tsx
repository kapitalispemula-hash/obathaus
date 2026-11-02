'use client';

import React, { useState, useEffect } from 'react';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { dbService } from '@/lib/services/database';
import { OutletStock, Dispatch, RawMaterial, Outlet } from '@/types/database';
import { useAuth } from '@/lib/auth-context';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Send,
  Building2,
  RefreshCw,
  Search,
  Check,
  Plus,
  X,
} from 'lucide-react';

export default function PosStockPage() {
  const { user } = useAuth();
  const outletId = user?.primary_outlet_id || 'out-01';

  const [stocks, setStocks] = useState<OutletStock[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  // New Restock Request Modal
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<{ raw_material_id: string; quantity: number }[]>([]);
  const [orderNotes, setOrderNotes] = useState('Restock harian untuk menjaga batas aman');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stkList, dspList, matList, outList] = await Promise.all([
        dbService.getOutletStocks(outletId),
        dbService.getDispatches(),
        dbService.getRawMaterials(),
        dbService.getOutlets(),
      ]);

      setStocks(stkList);
      // Filter dispatches meant for this branch
      const branchDispatches = dspList.filter((d) => d.to_outlet_id === outletId);
      setDispatches(branchDispatches);
      setMaterials(matList);
      const out = outList.find((o) => o.id === outletId) || outList[0];
      setCurrentOutlet(out);
    } catch (err) {
      console.error('Failed to load POS stock data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [outletId]);

  const handleConfirmDelivery = async (dispatchId: string) => {
    try {
      setReceivingId(dispatchId);
      await dbService.confirmDispatchReceipt(
        dispatchId,
        user?.id || 'c0000000-0000-0000-0000-000000000001',
        'Diterima dalam kondisi baik & lengkap oleh kasir'
      );
      setFeedback('Kiriman barang logistik berhasil diterima! Saldo stok bahan cabang otomatis bertambah.');
      await loadData();
    } catch (err: any) {
      alert(`Gagal mengonfirmasi penerimaan: ${err.message || err}`);
    } finally {
      setReceivingId(null);
    }
  };

  const openOrderModal = () => {
    if (materials.length > 0) {
      setOrderItems([
        {
          raw_material_id: materials[0].id,
          quantity: 5000,
        },
      ]);
    }
    setIsOrderModalOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    try {
      setIsSubmittingOrder(true);
      await dbService.createOutletOrder({
        outlet_id: outletId,
        warehouse_id: 'e0000000-0000-0000-0000-000000000001',
        notes: orderNotes,
        created_by: user?.id || 'c0000000-0000-0000-0000-000000000001',
        items: orderItems.map((itm, idx) => ({
          id: `ordi-${Date.now()}-${idx}`,
          outlet_order_id: '',
          raw_material_id: itm.raw_material_id,
          quantity_requested: itm.quantity,
          unit_id: 'unit-gram',
        })),
      });

      setFeedback('Permintaan restock berhasil dikirim ke Operator Gudang Pusat!');
      setIsOrderModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Gagal mengirim permintaan: ${err.message || err}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const filteredStocks = stocks.filter((s) => {
    const mat = s.raw_material;
    return (
      (mat?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat?.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const pendingDispatches = dispatches.filter((d) => d.status === 'in_transit');

  return (
    <CashierLayout>
      <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#ECEEF1] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#18181B] tracking-tight">
                  Persediaan Bahan & Kiriman Masuk
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
                  {currentOutlet?.name || 'Cabang'}
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                Stok bahan baku cabang ini terpotong otomatis setiap kali Anda menyelesaikan transaksi di kasir POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openOrderModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Minta Bahan ke Gudang</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Stok"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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

        {/* 1. Pending Inbound Shipments Section */}
        {pendingDispatches.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Truck className="w-5 h-5 text-amber-600 animate-bounce" />
                <span>Ada {pendingDispatches.length} Kiriman Armada Logistik dalam Perjalanan</span>
              </div>
              <span className="text-xs text-amber-700 font-medium">
                Segera konfirmasi setelah barang fisik tiba di outlet
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingDispatches.map((dsp) => (
                <div
                  key={dsp.id}
                  className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-[#18181B] flex items-center gap-1.5 text-sm">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span>{dsp.dispatch_number}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Kurir: {dsp.driver_name || 'Armada Box Obat Haus'} ({dsp.vehicle_number || 'DD 4521 XA'})
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      In Transit
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="block mb-1 text-[11px] text-slate-500 uppercase tracking-wider">
                      Muatan Kiriman:
                    </strong>
                    <div className="space-y-1">
                      {dsp.items?.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>{it.raw_material?.name || 'Bahan'}:</span>
                          <span className="font-bold text-[#18181B]">
                            {it.quantity_dispatched.toLocaleString('id-ID')}{' '}
                            {it.raw_material?.standard_unit?.symbol || ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmDelivery(dsp.id)}
                    disabled={receivingId === dsp.id}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {receivingId === dsp.id
                        ? 'Memproses Penerimaan...'
                        : 'Konfirmasi Terima & Masukkan ke Stok'}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Search & Stock Table */}
        <div className="bg-white rounded-2xl border border-[#ECEEF1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#ECEEF1] flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari bahan baku cabang..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF6B00]"
              />
            </div>

            <div className="text-xs text-slate-500">
              Total <strong className="text-slate-800">{stocks.length}</strong> bahan baku terdata
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECEEF1] bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Bahan Baku</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Saldo Saat Ini</th>
                  <th className="py-3 px-4 text-right">Batas Aman</th>
                  <th className="py-3 px-5 text-right">Kondisi Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEEF1] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Memuat saldo bahan baku...
                    </td>
                  </tr>
                ) : filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada bahan baku yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((s) => {
                    const mat = s.raw_material;
                    const min = s.minimum_stock || 500;
                    const isLow = s.quantity <= min;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900">{mat?.name || 'Bahan'}</div>
                          <div className="text-[11px] text-slate-400">SKU: {mat?.sku || '-'}</div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {mat?.category?.name || 'Bahan Baku'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-sm text-slate-900">
                            {s.quantity.toLocaleString('id-ID')}
                          </span>{' '}
                          <span className="text-slate-500">
                            {mat?.standard_unit?.symbol || 'g'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-500">
                          {min.toLocaleString('id-ID')} {mat?.standard_unit?.symbol || ''}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              Menipis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Aman
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

        {/* 3. Modal Permintaan Bahan ke Gudang Pusat */}
        {isOrderModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Permintaan Restock ke Gudang</h3>
                    <p className="text-xs text-slate-500">Dari: {currentOutlet?.name || 'Cabang'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOrderModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Bahan Baku yang Diminta
                  </label>
                  <select
                    value={orderItems[0]?.raw_material_id || ''}
                    onChange={(e) =>
                      setOrderItems([{ raw_material_id: e.target.value, quantity: orderItems[0]?.quantity || 1000 }])
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF6B00]"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Jumlah Kebutuhan
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      required
                      value={orderItems[0]?.quantity || 1000}
                      onChange={(e) =>
                        setOrderItems([
                          {
                            raw_material_id: orderItems[0]?.raw_material_id || materials[0]?.id || '',
                            quantity: parseFloat(e.target.value) || 0,
                          },
                        ])
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-[#FF6B00]"
                    />
                    <span className="text-slate-500 shrink-0 font-medium">gram / ml / pcs</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Kebutuhan
                  </label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Contoh: Stok bubuk matcha dan cup 16oz menipis karena ramai pesanan siang ini..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF6B00]"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingOrder ? 'Mengirim...' : 'Kirim Permintaan'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CashierLayout>
  );
}
