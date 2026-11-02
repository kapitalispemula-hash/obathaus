'use client';

import React, { useState, useEffect } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import { OutletOrder, OutletOrderStatus } from '@/types/database';
import {
  Inbox,
  Search,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Store,
  X,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { INITIAL_OUTLET_ORDERS } from '@/lib/mock-data';

export default function WarehouseOutletOrdersPage() {
  const [orders, setOrders] = useState<OutletOrder[]>(INITIAL_OUTLET_ORDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OutletOrder | null>(null);
  const router = useRouter();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const list = await dbService.getOutletOrders();
      setOrders(list);
    } catch (err) {
      console.error('Failed to load outlet orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: OutletOrderStatus) => {
    try {
      await dbService.updateOutletOrderStatus(orderId, status);
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleProceedToDispatch = (ord: OutletOrder) => {
    // Navigate to dispatch page
    router.push(`/warehouse/dispatch?order_id=${ord.id}`);
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.outlet?.name && o.outlet.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.notes && o.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shadow-2xs">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Permintaan Bahan Baku Masuk dari Cabang</h1>
              <p className="text-xs text-mutedtext">
                Daftar pesanan restock harian dari 7 outlet cabang Obat Haus yang perlu disiapkan oleh tim gudang
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'all', label: `Semua (${orders.length})` },
              { id: 'submitted', label: 'Baru Masuk' },
              { id: 'processing', label: 'Sedang Dipacking' },
              { id: 'dispatched', label: 'Telah Dikirim' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#FF6B00] text-white shadow-2xs'
                    : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor order atau cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Table Orders */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Nomor Pesanan</th>
                  <th className="py-3 px-4">Cabang Pemohon</th>
                  <th className="py-3 px-4">Tanggal Pesanan</th>
                  <th className="py-3 px-4">Catatan Outlet</th>
                  <th className="py-3 px-4 text-center">Jumlah Varian</th>
                  <th className="py-3 px-4 text-center">Status Pemrosesan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-mutedtext">
                      Tidak ada permintaan cabang yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                        {ord.order_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                          <span className="font-bold text-heading">{ord.outlet?.name || 'Cabang'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext">
                        {new Date(ord.order_date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext max-w-xs truncate">
                        {ord.notes || 'Restock bahan baku reguler'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-heading font-mono">
                        {ord.items?.length || 0} bahan
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === 'submitted'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : ord.status === 'processing'
                              ? 'bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {ord.status === 'submitted'
                            ? 'Menunggu Picking'
                            : ord.status === 'processing'
                            ? 'Sedang Dipacking'
                            : 'Telah Dikirim'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Lihat Rincian Item"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {ord.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, 'processing')}
                              className="px-2.5 py-1 bg-[#18181B] hover:bg-black text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Mulai Packing
                            </button>
                          )}

                          {ord.status === 'processing' && (
                            <button
                              type="button"
                              onClick={() => handleProceedToDispatch(ord)}
                              className="px-2.5 py-1 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirimkan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Detail Order */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-heading text-base font-mono text-[#FF6B00]">
                    {selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-mutedtext">Permintaan Restock: {selectedOrder.outlet?.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="bg-[#FAFAFA] p-3 rounded-xl border border-borderline">
                  <p className="text-mutedtext">Catatan Pemesanan:</p>
                  <p className="font-bold text-heading mt-0.5">{selectedOrder.notes || 'Tidak ada catatan tambahan'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-heading mb-2">Item Bahan Baku yang Diminta:</h4>
                  <div className="divide-y divide-borderline border border-borderline rounded-xl overflow-hidden">
                    {selectedOrder.items?.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-heading">{it.raw_material?.name || it.raw_material_id}</p>
                          <p className="text-[11px] text-mutedtext font-mono">
                            {it.raw_material?.code}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-heading text-sm">
                          {it.quantity_requested.toLocaleString()} {it.raw_material?.standard_unit?.symbol}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-borderline flex items-center justify-between">
                <div>
                  {selectedOrder.status === 'submitted' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'processing')}
                      className="px-3.5 py-1.5 bg-[#18181B] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Mulai Siapkan / Packing
                    </button>
                  )}
                  {selectedOrder.status === 'processing' && (
                    <button
                      type="button"
                      onClick={() => handleProceedToDispatch(selectedOrder)}
                      className="px-3.5 py-1.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Buat Surat Jalan</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
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
