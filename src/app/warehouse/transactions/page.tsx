'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WarehouseLayout } from '@/components/layout/WarehouseLayout';
import { dbService } from '@/lib/services/database';
import {
  Dispatch,
  OutletOrder,
  SupplierReceipt,
  SupplierPO,
  WarehouseReturn,
  Outlet,
  Supplier,
} from '@/types/database';
import {
  History,
  Truck,
  Inbox,
  Send,
  RotateCcw,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Factory,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

type TransactionCategory = 'all' | 'outlet' | 'supplier';

interface UnifiedTransaction {
  id: string;
  docNumber: string;
  docType: 'dispatch' | 'outlet_order' | 'outlet_return' | 'supplier_receipt' | 'supplier_po';
  category: 'outlet' | 'supplier';
  date: string;
  partnerName: string;
  partnerType: 'outlet' | 'supplier';
  partnerId: string;
  status: string;
  statusBadge: {
    label: string;
    bg: string;
    text: string;
    border: string;
  };
  itemCount: number;
  itemsSummary: string;
  driverInfo?: string | null;
  notes?: string | null;
  rawPayload: any;
}

export default function WarehouseTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TransactionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Raw data from repositories
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [outletOrders, setOutletOrders] = useState<OutletOrder[]>([]);
  const [returns, setReturns] = useState<WarehouseReturn[]>([]);
  const [supplierReceipts, setSupplierReceipts] = useState<SupplierReceipt[]>([]);
  const [supplierPOs, setSupplierPOs] = useState<SupplierPO[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modal Detail state
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        dspList,
        ordList,
        retList,
        rcpList,
        poList,
        outList,
        supList,
      ] = await Promise.all([
        dbService.getDispatches(),
        dbService.getOutletOrders(),
        dbService.getWarehouseReturns(),
        dbService.getSupplierReceipts(),
        dbService.getSupplierPOs(),
        dbService.getOutlets(),
        dbService.getSuppliers(),
      ]);

      setDispatches(dspList || []);
      setOutletOrders(ordList || []);
      setReturns(retList || []);
      setSupplierReceipts(rcpList || []);
      setSupplierPOs(poList || []);
      setOutlets(outList || []);
      setSuppliers(supList || []);
    } catch (err) {
      console.error('Failed to load warehouse transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Normalize all streams into a single unified list
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const list: UnifiedTransaction[] = [];

    // 1. Dispatches (Kirim ke Cabang)
    for (const d of dispatches) {
      const outlet = outlets.find((o) => o.id === d.to_outlet_id);
      const itemsList = d.items || [];
      const isDelivered = d.status === 'delivered';
      list.push({
        id: `dsp-${d.id}`,
        docNumber: d.dispatch_number,
        docType: 'dispatch',
        category: 'outlet',
        date: d.dispatch_date || d.created_at,
        partnerName: outlet ? outlet.name.replace('Obat Haus - ', '') : 'Cabang Outlet',
        partnerType: 'outlet',
        partnerId: d.to_outlet_id,
        status: d.status,
        statusBadge: isDelivered
          ? { label: 'Tiba di Cabang', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
          : { label: 'Dalam Perjalanan', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        itemCount: itemsList.length,
        itemsSummary: itemsList.map((i) => `${i.raw_material?.name || 'Bahan'} (${i.quantity_dispatched})`).join(', ') || 'Item logistik',
        driverInfo: d.driver_name ? `${d.driver_name} ${d.vehicle_number ? `(${d.vehicle_number})` : ''}` : null,
        notes: d.notes,
        rawPayload: d,
      });
    }

    // 2. Outlet Orders (Permintaan Bahan Masuk dari Cabang)
    for (const o of outletOrders) {
      const outlet = outlets.find((ot) => ot.id === o.outlet_id);
      const itemsList = o.items || [];
      const statusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
        submitted: { label: 'Menunggu Disiapkan', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        processing: { label: 'Sedang Disiapkan', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        dispatched: { label: 'Sudah Dikirim', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
        delivered: { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      };
      const badge = statusMap[o.status] || {
        label: o.status,
        bg: 'bg-zinc-50',
        text: 'text-zinc-700',
        border: 'border-zinc-200',
      };
      list.push({
        id: `ord-${o.id}`,
        docNumber: o.order_number,
        docType: 'outlet_order',
        category: 'outlet',
        date: o.order_date || o.created_at,
        partnerName: outlet ? outlet.name.replace('Obat Haus - ', '') : 'Cabang Outlet',
        partnerType: 'outlet',
        partnerId: o.outlet_id,
        status: o.status,
        statusBadge: badge,
        itemCount: itemsList.length,
        itemsSummary: itemsList.map((i) => `${i.raw_material?.name || 'Bahan'} (${i.quantity_requested})`).join(', ') || 'Permintaan bahan',
        notes: o.notes,
        rawPayload: o,
      });
    }

    // 3. Returns (Retur Masuk dari Cabang)
    for (const r of returns) {
      const outlet = outlets.find((ot) => ot.id === r.from_outlet_id);
      const itemsList = r.items || [];
      const isAccepted = r.status === 'accepted';
      const isRejected = r.status === 'rejected';
      list.push({
        id: `ret-${r.id}`,
        docNumber: r.return_number,
        docType: 'outlet_return',
        category: 'outlet',
        date: r.return_date || r.created_at,
        partnerName: outlet ? outlet.name.replace('Obat Haus - ', '') : 'Cabang Outlet',
        partnerType: 'outlet',
        partnerId: r.from_outlet_id,
        status: r.status,
        statusBadge: isAccepted
          ? { label: 'Retur Diterima', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
          : isRejected
          ? { label: 'Retur Ditolak', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
          : { label: 'Perlu Pemeriksaan', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        itemCount: itemsList.length,
        itemsSummary: itemsList.map((i) => `${i.raw_material?.name || 'Bahan'} (${i.quantity_returned})`).join(', ') || 'Retur bahan',
        notes: r.notes,
        rawPayload: r,
      });
    }

    // 4. Supplier Receipts (GRN - Barang Masuk dari Vendor)
    for (const s of supplierReceipts) {
      const parentPO = supplierPOs.find((p) => p.id === s.supplier_po_id);
      const supplierId = parentPO?.supplier_id || s.supplier_po?.supplier_id || '';
      const supplier = suppliers.find((sp) => sp.id === supplierId);
      const itemsList = s.items || [];
      list.push({
        id: `rcp-${s.id}`,
        docNumber: s.receipt_number,
        docType: 'supplier_receipt',
        category: 'supplier',
        date: s.received_date || s.created_at,
        partnerName: supplier ? supplier.name : (parentPO?.supplier?.name || 'Supplier Vendor'),
        partnerType: 'supplier',
        partnerId: supplierId,
        status: 'received',
        statusBadge: {
          label: 'Barang Diterima',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
        },
        itemCount: itemsList.length,
        itemsSummary: itemsList.map((i) => `${i.raw_material?.name || 'Bahan'} (${i.quantity_received})`).join(', ') || 'Penerimaan supplier',
        driverInfo: s.delivery_order_number ? `Surat Jalan Vendor: ${s.delivery_order_number}` : null,
        notes: s.notes,
        rawPayload: s,
      });
    }

    // 5. Supplier POs (Pengadaan ke Vendor)
    for (const p of supplierPOs) {
      const supplier = suppliers.find((sp) => sp.id === p.supplier_id);
      const itemsList = p.items || [];
      const poBadgeMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
        draft: { label: 'Draft Pengajuan', bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' },
        approved: { label: 'Disetujui Admin', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        received: { label: 'Tuntas Diterima', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
        cancelled: { label: 'Dibatalkan', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
      };
      const badge = poBadgeMap[p.status] || {
        label: p.status,
        bg: 'bg-zinc-50',
        text: 'text-zinc-700',
        border: 'border-zinc-200',
      };
      list.push({
        id: `po-${p.id}`,
        docNumber: p.po_number,
        docType: 'supplier_po',
        category: 'supplier',
        date: p.order_date || p.created_at,
        partnerName: supplier ? supplier.name : 'Supplier Vendor',
        partnerType: 'supplier',
        partnerId: p.supplier_id,
        status: p.status,
        statusBadge: badge,
        itemCount: itemsList.length,
        itemsSummary: itemsList.map((i) => `${i.raw_material?.name || 'Bahan'} (${i.quantity_ordered})`).join(', ') || 'PO Bahan Baku',
        notes: p.notes,
        rawPayload: p,
      });
    }

    // Sort descending by date (newest first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dispatches, outletOrders, returns, supplierReceipts, supplierPOs, outlets, suppliers]);

  // Aggregate stats
  const totalOutletTransactions = unifiedTransactions.filter((t) => t.category === 'outlet').length;
  const totalSupplierTransactions = unifiedTransactions.filter((t) => t.category === 'supplier').length;
  const totalInTransitDispatches = dispatches.filter((d) => d.status === 'in_transit').length;
  const totalItemsHandled = unifiedTransactions.reduce((acc, t) => acc + t.itemCount, 0);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((t) => {
      // 1. Category Tab
      if (activeCategory !== 'all' && t.category !== activeCategory) {
        return false;
      }

      // 2. Doc Type Filter
      if (selectedDocType !== 'all' && t.docType !== selectedDocType) {
        return false;
      }

      // 3. Partner Filter
      if (selectedPartnerId !== 'all' && t.partnerId !== selectedPartnerId) {
        return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDoc = t.docNumber.toLowerCase().includes(q);
        const matchPartner = t.partnerName.toLowerCase().includes(q);
        const matchSummary = t.itemsSummary.toLowerCase().includes(q);
        const matchDriver = t.driverInfo?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        if (!matchDoc && !matchPartner && !matchSummary && !matchDriver && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedTransactions, activeCategory, selectedDocType, selectedPartnerId, selectedStatus, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getDocTypeBadge = (docType: UnifiedTransaction['docType']) => {
    switch (docType) {
      case 'dispatch':
        return {
          label: 'Surat Jalan (Dispatch)',
          icon: Send,
          bg: 'bg-[#FFF7ED] text-[#FF6B00] border-[#FED7AA]',
        };
      case 'outlet_order':
        return {
          label: 'Permintaan Cabang (PO)',
          icon: Inbox,
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'outlet_return':
        return {
          label: 'Retur dari Cabang',
          icon: RotateCcw,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      case 'supplier_receipt':
        return {
          label: 'Penerimaan Supplier (GRN)',
          icon: Truck,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'supplier_po':
        return {
          label: 'PO ke Supplier',
          icon: FileText,
          bg: 'bg-[#F4F4F5] text-[#18181B] border-[#E4E4E7]',
        };
    }
  };

  return (
    <WarehouseLayout>
      <div className="space-y-6 select-none pb-12">
        {/* Top Header Card */}
        <div className="bg-white border border-[#ECEEF1] p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#FF6B00] flex items-center justify-center shrink-0 shadow-md shadow-orange-500/10">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#18181B] tracking-tight">
                  Riwayat Transaksi Logistik
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                  Gudang Logistik Pusat
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-0.5">
                Rekapitulasi terpadu pergerakan logistik dengan 7 Cabang Outlet & Pengadaan Supplier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2.5 bg-[#FAFAFA] hover:bg-[#F4F4F5] border border-[#ECEEF1] rounded-2xl text-xs font-bold text-[#18181B] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#71717A] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#ECEEF1] p-4 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#71717A]">Transaksi Outlet</span>
              <Building2 className="w-4 h-4 text-[#FF6B00]" />
            </div>
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {totalOutletTransactions}
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 font-medium">
              Surat Jalan, Permintaan & Retur
            </div>
          </div>

          <div className="bg-white border border-[#ECEEF1] p-4 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#71717A]">Transaksi Supplier</span>
              <Factory className="w-4 h-4 text-[#18181B]" />
            </div>
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {totalSupplierTransactions}
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 font-medium">
              Penerimaan Fisik GRN & PO
            </div>
          </div>

          <div className="bg-white border border-[#ECEEF1] p-4 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#71717A]">Kiriman In-Transit</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 tracking-tight">
              {totalInTransitDispatches}
            </div>
            <div className="text-[10px] text-amber-600 mt-1 font-medium">
              Sedang dalam perjalanan ke cabang
            </div>
          </div>

          <div className="bg-white border border-[#ECEEF1] p-4 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#71717A]">Bahan Baku Dikelola</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {totalItemsHandled} Baris
            </div>
            <div className="text-[10px] text-[#A1A1AA] mt-1 font-medium">
              Total riwayat pergerakan stok
            </div>
          </div>
        </div>

        {/* Primary Tab Navigation & Filter Controls */}
        <div className="bg-white border border-[#ECEEF1] p-4 rounded-3xl shadow-xs space-y-4">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] pb-3">
            <div className="flex items-center gap-1.5 p-1 bg-[#F4F4F5] rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setSelectedPartnerId('all');
                  setSelectedDocType('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeCategory === 'all'
                    ? 'bg-white text-[#18181B] shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Semua Riwayat</span>
                <span className="px-1.5 py-0.2 rounded-md bg-[#F0F0F0] text-[10px] text-[#71717A]">
                  {unifiedTransactions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('outlet');
                  setSelectedPartnerId('all');
                  setSelectedDocType('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeCategory === 'outlet'
                    ? 'bg-[#FF6B00] text-white shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Transaksi dengan Outlet</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  activeCategory === 'outlet' ? 'bg-[#EA580C] text-white' : 'bg-[#F0F0F0] text-[#71717A]'
                }`}>
                  {totalOutletTransactions}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCategory('supplier');
                  setSelectedPartnerId('all');
                  setSelectedDocType('all');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeCategory === 'supplier'
                    ? 'bg-[#18181B] text-white shadow-2xs'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Factory className="w-3.5 h-3.5" />
                <span>Transaksi dengan Supplier</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  activeCategory === 'supplier' ? 'bg-zinc-800 text-white' : 'bg-[#F0F0F0] text-[#71717A]'
                }`}>
                  {totalSupplierTransactions}
                </span>
              </button>
            </div>

            <div className="text-xs font-bold text-[#A1A1AA]">
              Menampilkan {filteredTransactions.length} dari {unifiedTransactions.length} transaksi
            </div>
          </div>

          {/* Sub Filter Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Dokumen / Bahan / Supir..."
                className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:border-[#FF6B00] transition-colors"
              />
            </div>

            {/* Doc Type Selector */}
            <div className="relative">
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-xs font-semibold text-[#18181B] focus:outline-none focus:border-[#FF6B00] cursor-pointer"
              >
                <option value="all">📑 Semua Jenis Dokumen</option>
                {activeCategory !== 'supplier' && (
                  <>
                    <option value="dispatch">🚚 Surat Jalan Pengiriman (Dispatch)</option>
                    <option value="outlet_order">📥 Permintaan Cabang (PO Outlet)</option>
                    <option value="outlet_return">🔄 Retur dari Cabang</option>
                  </>
                )}
                {activeCategory !== 'outlet' && (
                  <>
                    <option value="supplier_receipt">📦 Penerimaan Barang (GRN)</option>
                    <option value="supplier_po">📝 PO ke Supplier</option>
                  </>
                )}
              </select>
            </div>

            {/* Partner Selector (Outlet or Supplier based on Category) */}
            <div className="relative">
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-xs font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00] cursor-pointer"
              >
                {activeCategory === 'supplier' ? (
                  <>
                    <option value="all">🏭 Semua Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </>
                ) : activeCategory === 'outlet' ? (
                  <>
                    <option value="all">🏢 Semua Cabang Outlet</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option value="all">🌐 Semua Mitra (Outlet & Supplier)</option>
                    <optgroup label="Cabang Outlet">
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Supplier Vendor">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          🏭 {s.name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-xs font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00] cursor-pointer"
              >
                <option value="all">⚡ Semua Status</option>
                <option value="delivered">Tiba di Cabang / Selesai</option>
                <option value="in_transit">Dalam Perjalanan (In-Transit)</option>
                <option value="received">Diterima Lengkap (GRN)</option>
                <option value="submitted">Menunggu Disiapkan</option>
                <option value="approved">Disetujui Admin</option>
                <option value="draft">Draft Pengajuan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-[#ECEEF1] rounded-3xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-[#A1A1AA]">Memuat riwayat transaksi logistik...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAFAFA] border border-[#ECEEF1] flex items-center justify-center text-[#A1A1AA]">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#18181B]">Tidak ada data transaksi ditemukan</h3>
              <p className="text-xs text-[#71717A] max-w-sm">
                Coba sesuaikan kata kunci pencarian atau ganti filter kategori/status di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-[#ECEEF1] text-[11px] font-bold text-[#71717A] tracking-wider uppercase">
                    <th className="py-3.5 px-4">No. Dokumen & Tanggal</th>
                    <th className="py-3.5 px-4">Jenis Transaksi</th>
                    <th className="py-3.5 px-4">Mitra Relasi</th>
                    <th className="py-3.5 px-4">Ringkasan Bahan Baku</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEEF1] text-xs">
                  {filteredTransactions.map((tx) => {
                    const docBadge = getDocTypeBadge(tx.docType);
                    const DocIcon = docBadge.icon;

                    return (
                      <tr key={tx.id} className="hover:bg-[#FBFBFC] transition-colors group">
                        {/* Dokumen & Tanggal */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-black text-[#18181B] group-hover:text-[#FF6B00] transition-colors">
                            {tx.docNumber}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-[#A1A1AA] mt-0.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{formatDate(tx.date)}</span>
                          </div>
                        </td>

                        {/* Jenis Transaksi */}
                        <td className="py-3.5 px-4 align-top">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${docBadge.bg}`}>
                            <DocIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{docBadge.label}</span>
                          </div>
                          {tx.driverInfo && (
                            <div className="text-[10px] text-[#71717A] mt-1 flex items-center gap-1 truncate max-w-[200px]">
                              <Truck className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                              <span className="truncate">{tx.driverInfo}</span>
                            </div>
                          )}
                        </td>

                        {/* Mitra Relasi */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5 font-bold text-[#18181B]">
                            {tx.partnerType === 'outlet' ? (
                              <Building2 className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                            ) : (
                              <Factory className="w-3.5 h-3.5 text-[#18181B] shrink-0" />
                            )}
                            <span className="truncate max-w-[180px]">{tx.partnerName}</span>
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] mt-0.5">
                            {tx.partnerType === 'outlet' ? 'Cabang Obat Haus' : 'Vendor Supplier'}
                          </div>
                        </td>

                        {/* Ringkasan Bahan */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-[#18181B] font-semibold truncate max-w-xs" title={tx.itemsSummary}>
                            {tx.itemsSummary}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA] mt-0.5 font-medium">
                            Total {tx.itemCount} jenis bahan baku
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 align-top text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-xl text-[11px] font-bold border ${tx.statusBadge.bg} ${tx.statusBadge.text} ${tx.statusBadge.border}`}>
                            {tx.statusBadge.label}
                          </span>
                        </td>

                        {/* Aksi Detail */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(tx)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#FFF7ED] text-[#71717A] hover:text-[#FF6B00] border border-[#ECEEF1] hover:border-[#FED7AA] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Detail Transaksi */}
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#ECEEF1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-[#ECEEF1] flex items-center justify-between gap-4 bg-[#FAFAFA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#FF6B00] flex items-center justify-center shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-[#18181B]">
                        {selectedTransaction.docNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${selectedTransaction.statusBadge.bg} ${selectedTransaction.statusBadge.text} ${selectedTransaction.statusBadge.border}`}>
                        {selectedTransaction.statusBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      {getDocTypeBadge(selectedTransaction.docType).label} — {formatDate(selectedTransaction.date)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 rounded-xl text-[#A1A1AA] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-4 bg-[#FBFBFC] p-4 rounded-2xl border border-[#ECEEF1] text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">Mitra Transaksi</span>
                    <p className="font-bold text-[#18181B] text-sm mt-0.5">{selectedTransaction.partnerName}</p>
                    <p className="text-[11px] text-[#71717A]">
                      {selectedTransaction.partnerType === 'outlet' ? 'Cabang Operasional Obat Haus' : 'Vendor Rekanan'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">Waktu Pencatatan</span>
                    <p className="font-bold text-[#18181B] text-sm mt-0.5">{formatDate(selectedTransaction.date)}</p>
                    <p className="text-[11px] text-[#71717A]">Zona Waktu WITA (Makassar)</p>
                  </div>

                  {selectedTransaction.driverInfo && (
                    <div className="col-span-2 pt-2 border-t border-[#ECEEF1]">
                      <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">Armada & Pengemudi</span>
                      <p className="font-bold text-[#18181B] mt-0.5">{selectedTransaction.driverInfo}</p>
                    </div>
                  )}

                  {selectedTransaction.notes && (
                    <div className="col-span-2 pt-2 border-t border-[#ECEEF1]">
                      <span className="text-[10px] font-bold text-[#A1A1AA] uppercase">Catatan Dokumen</span>
                      <p className="text-[#18181B] mt-0.5 italic">{selectedTransaction.notes}</p>
                    </div>
                  )}
                </div>

                {/* Items Detail Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-[#18181B] uppercase tracking-wider">
                    Rincian Bahan Baku ({selectedTransaction.itemCount} Item)
                  </h4>
                  <div className="border border-[#ECEEF1] rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#ECEEF1] text-[10px] font-bold text-[#71717A] uppercase">
                          <th className="py-2.5 px-3">Bahan Baku</th>
                          <th className="py-2.5 px-3 text-right">Kuantitas</th>
                          <th className="py-2.5 px-3 text-center">Status Item</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECEEF1]">
                        {selectedTransaction.rawPayload.items && selectedTransaction.rawPayload.items.length > 0 ? (
                          selectedTransaction.rawPayload.items.map((it: any, idx: number) => {
                            const name = it.raw_material?.name || it.material_name || `Bahan Baku #${idx + 1}`;
                            const code = it.raw_material?.code || it.sku || '';
                            const unit = it.raw_material?.standard_unit?.symbol || it.unit || 'satuan';
                            const qty = it.quantity_dispatched ?? it.quantity_received ?? it.quantity_ordered ?? it.quantity_requested ?? it.quantity_returned ?? 0;

                            return (
                              <tr key={idx} className="hover:bg-[#FBFBFC]">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-[#18181B]">{name}</div>
                                  {code && <div className="text-[10px] font-mono text-[#A1A1AA]">{code}</div>}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#18181B]">
                                  {qty.toLocaleString('id-ID')} <span className="font-normal text-[#71717A] text-[11px]">{unit}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    Terverifikasi
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-[#A1A1AA]">
                              Tidak ada rincian item tercatat
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[#FAFAFA] border-t border-[#ECEEF1] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
