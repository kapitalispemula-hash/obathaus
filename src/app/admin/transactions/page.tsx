'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { getOfflineQueue, syncOfflineQueue } from '@/lib/services/offline-sync';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { Transaction, StoreSettings } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { DateRangeCalendarPicker } from '@/components/common/DateRangeCalendarPicker';
import {
  Receipt,
  Search,
  Eye,
  Ban,
  RotateCcw,
  Printer,
  AlertTriangle,
  X,
  CreditCard,
  User,
  Calendar,
  Trash2,
  Store,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export default function AdminTransactionsPage() {
  const { user } = useAuth();
  const { availableOutlets, activeOutlet, isAllOutletsSelected } = useOutlet();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // Filters
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Detail & Action Modals
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);

  // Void Modal
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Refund Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // Delete Single Transaction Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trxToDelete, setTrxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear All Transactions Modal
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    if (!isAllOutletsSelected && activeOutlet) {
      setSelectedOutlet(activeOutlet.id);
    } else {
      setSelectedOutlet('all');
    }
  }, [activeOutlet, isAllOutletsSelected]);

  const loadData = async () => {
    try {
      setLoading(true);
      const pending = getOfflineQueue().length;
      setOfflinePendingCount(pending);
      const [trxs, s] = await Promise.all([
        dbService.getTransactions({
          outletId: selectedOutlet !== 'all' ? selectedOutlet : undefined,
        }),
        dbService.getStoreSettings(),
      ]);
      setTransactions(trxs);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSyncAndRefresh = async () => {
    try {
      setIsSyncingOffline(true);
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await syncOfflineQueue();
      }
      await loadData();
    } finally {
      setIsSyncingOffline(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSynced = () => {
      void loadData();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_offline_queue_synced', handleSynced);
    }

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel(`admin-transactions-${selectedOutlet}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_refunds' }, () => void loadData())
        .subscribe();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_offline_queue_synced', handleSynced);
      }
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [selectedOutlet]);

  const handleOpenVoid = (trx: Transaction) => {
    setSelectedTrx(trx);
    setVoidReason('');
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!selectedTrx || !user) return;
    if (!voidReason.trim()) {
      alert('Alasan pembatalan transaksi wajib diisi.');
      return;
    }

    setIsVoiding(true);
    try {
      await dbService.voidTransaction(selectedTrx.id, user.id, voidReason.trim());
      setIsVoidModalOpen(false);
      setSelectedTrx(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membatalkan transaksi.');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenRefund = (trx: Transaction) => {
    setSelectedTrx(trx);
    setRefundReason('');
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = async () => {
    if (!selectedTrx || !user) return;
    if (!refundReason.trim()) {
      alert('Alasan refund wajib diisi.');
      return;
    }

    setIsRefunding(true);
    try {
      await dbService.processRefund(selectedTrx.id, user.id, 'full', refundReason.trim());
      setIsRefundModalOpen(false);
      setSelectedTrx(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses refund.');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleReprintReceipt = (trx: Transaction) => {
    setReceiptTrx(trx);
    setIsReceiptOpen(true);
  };

  const handleOpenDelete = (trx: Transaction) => {
    setTrxToDelete(trx);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!trxToDelete || !user) return;
    setIsDeleting(true);
    try {
      await dbService.deleteTransaction(trxToDelete.id, user.id);
      setIsDeleteModalOpen(false);
      setTrxToDelete(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenClearAll = () => {
    setClearConfirmText('');
    setIsClearAllModalOpen(true);
  };

  const handleConfirmClearAll = async () => {
    if (!user || clearConfirmText.trim().toUpperCase() !== 'HAPUS') return;
    setIsClearingAll(true);
    try {
      await dbService.clearAllTransactions(user.id);
      setIsClearAllModalOpen(false);
      setClearConfirmText('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus seluruh riwayat transaksi.');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Filtered List & Summary
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.invoice_number.toLowerCase().includes(q) ||
        (t.cashier && t.cashier.full_name.toLowerCase().includes(q)) ||
        (t.outlet && t.outlet.name.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || t.payment_method === paymentFilter;

      let matchesPeriod = true;
      if (startDate) {
        const tDateStr = new Date(t.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
        const start = startDate;
        const end = endDate || startDate;
        matchesPeriod = tDateStr >= start && tDateStr <= end;
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesPeriod;
    });
  }, [transactions, search, statusFilter, paymentFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const completedTrxs = filtered.filter((t) => t.status === 'completed');
    const totalRevenue = completedTrxs.reduce((acc, t) => acc + t.grand_total, 0);
    const totalCount = filtered.length;
    const totalCompleted = completedTrxs.length;
    const totalVoided = filtered.filter((t) => t.status === 'voided').length;
    return { totalRevenue, totalCount, totalCompleted, totalVoided };
  }, [filtered]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Riwayat Transaksi Penjualan Multi-Outlet
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Daftar seluruh pesanan kasir, filter per cabang outlet, nomor invoice unik, cetak ulang struk, dan void.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {offlinePendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5" />
                {offlinePendingCount} Antrean Offline
              </span>
            )}
            <button
              onClick={handleManualSyncAndRefresh}
              disabled={isSyncingOffline || loading}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-borderline rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffline || loading ? 'animate-spin' : ''}`} />
              <span>Sinkronkan / Refresh</span>
            </button>
            <button
              onClick={handleOpenClearAll}
              disabled={transactions.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed border border-red-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              title="Hapus seluruh riwayat transaksi (Khusus Admin)"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Hapus Semua Riwayat</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards for Selected Outlet Filter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-borderline shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider truncate">
                Omzet Terfilter
              </p>
              <h3 className="text-base sm:text-xl font-black text-heading mt-1 truncate">
                {formatRupiah(stats.totalRevenue)}
              </h3>
              <p className="text-[10px] text-mutedtext mt-0.5 truncate">
                {selectedOutlet === 'all' ? 'Seluruh 7 Outlet' : availableOutlets.find(o => o.id === selectedOutlet)?.name || 'Outlet Terpilih'}
              </p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-borderline shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider truncate">
                Total Transaksi
              </p>
              <h3 className="text-base sm:text-xl font-black text-heading mt-1">
                {stats.totalCount} <span className="text-[11px] sm:text-xs font-medium text-mutedtext">pesanan</span>
              </h3>
              <p className="text-[10px] text-mutedtext mt-0.5 truncate">Volume kasir</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-borderline shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider truncate">
                Sukses
              </p>
              <h3 className="text-base sm:text-xl font-black text-emerald-600 mt-1">
                {stats.totalCompleted} <span className="text-[11px] sm:text-xs font-medium text-mutedtext">selesai</span>
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5 truncate">Completed</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-borderline shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider truncate">
                Dibatalkan
              </p>
              <h3 className="text-base sm:text-xl font-black text-red-600 mt-1">
                {stats.totalVoided} <span className="text-[11px] sm:text-xs font-medium text-mutedtext">void</span>
              </h3>
              <p className="text-[10px] text-red-600 font-bold mt-0.5 truncate">Koreksi kasir</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row md:flex-wrap md:items-center gap-2.5 sm:gap-3">
          {/* Outlet Switcher Dropdown */}
          <div className="flex items-center gap-2 bg-[#FAFAFA] border border-borderline rounded-xl px-3 py-2 text-xs font-bold text-heading w-full md:w-auto shrink-0">
            <Store className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer w-full truncate"
            >
              <option value="all">🌐 Semua Outlet (7 Cabang)</option>
              {availableOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Calendar Date Range Picker */}
          <DateRangeCalendarPicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            align="left"
            className="w-full md:w-auto [&>button]:w-full [&>button]:justify-between"
          />

          {/* Search Box */}
          <div className="relative w-full md:flex-1 md:min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice (INV-...), kasir, atau cabang..."
              className="w-full pl-10 pr-4 py-2 bg-canvas border border-borderline rounded-xl text-xs sm:text-sm text-heading placeholder:text-mutedtext focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
            >
              <option value="all">Semua Status</option>
              <option value="completed">Completed (Selesai)</option>
              <option value="voided">Voided (Dibatalkan)</option>
              <option value="refunded">Refunded (Dikembalikan)</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full sm:w-auto bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="debit">Debit</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        {/* Transactions List: Mobile Cards + Desktop Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-borderline">
            {loading ? (
              <div className="py-10 text-center text-xs text-mutedtext">Memuat transaksi...</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-mutedtext">Tidak ada transaksi yang cocok dengan filter.</div>
            ) : (
              filtered.map((trx) => (
                <div key={trx.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-black text-xs text-heading truncate">{trx.invoice_number}</p>
                      <p className="text-[11px] text-mutedtext mt-0.5 truncate">
                        {trx.outlet?.name ? trx.outlet.name.replace('Obat Haus - ', '') : 'Cabang'} &bull; {trx.cashier?.full_name || 'Kasir'}
                      </p>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        trx.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : trx.status === 'voided'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {trx.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      <p className="text-[10px] text-mutedtext">
                        {formatDateTime(trx.created_at, true)} &bull;{' '}
                        <span className="uppercase font-bold text-heading">{trx.payment_method}</span>
                      </p>
                      <p className="text-sm font-black text-[#FF6B00] tabular-nums mt-0.5">
                        {formatRupiah(trx.grand_total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedTrx(trx)}
                        className="p-2 text-mutedtext hover:text-heading bg-canvas rounded-xl transition-colors"
                        title="Lihat Rincian Transaksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReprintReceipt(trx)}
                        className="p-2 text-mutedtext hover:text-coral-500 bg-canvas rounded-xl transition-colors"
                        title="Cetak Ulang Struk"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {trx.status === 'completed' && (
                        <>
                          <button
                            onClick={() => handleOpenVoid(trx)}
                            className="p-2 text-mutedtext hover:text-red-600 bg-canvas rounded-xl transition-colors"
                            title="Batalkan (Void)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenRefund(trx)}
                            className="p-2 text-mutedtext hover:text-amber-600 bg-canvas rounded-xl transition-colors"
                            title="Refund Transaksi"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenDelete(trx)}
                        className="p-2 text-mutedtext hover:text-red-600 bg-canvas rounded-xl transition-colors"
                        title="Hapus Transaksi (Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">No. Invoice</th>
                  <th className="py-3.5 px-4">Cabang Outlet</th>
                  <th className="py-3.5 px-4">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Kasir</th>
                  <th className="py-3.5 px-4">Metode</th>
                  <th className="py-3.5 px-4 text-right">Subtotal</th>
                  <th className="py-3.5 px-4 text-right">Diskon</th>
                  <th className="py-3.5 px-4 text-right">Total Akhir</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-mutedtext">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-mutedtext">
                      Tidak ada transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((trx) => (
                    <tr key={trx.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-heading">
                        {trx.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                          <div>
                            <p className="font-bold text-heading leading-tight truncate max-w-[140px]">
                              {trx.outlet?.name ? trx.outlet.name.replace('Obat Haus - ', '') : 'Cabang'}
                            </p>
                            <span className="text-[10px] font-mono text-[#FF6B00]">
                              {trx.outlet?.code || trx.outlet_id || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-mutedtext text-xs">
                        {formatDateTime(trx.created_at, true)}
                      </td>
                      <td className="py-3 px-4 text-heading font-semibold">
                        {trx.cashier?.full_name || 'Kasir'}
                      </td>
                      <td className="py-3 px-4 uppercase font-bold text-xs text-mutedtext">
                        {trx.payment_method}
                      </td>
                      <td className="py-3 px-4 text-right text-mutedtext tabular-nums">
                        {formatRupiah(trx.subtotal)}
                      </td>
                      <td className="py-3 px-4 text-right text-coral-500 font-semibold tabular-nums">
                        {trx.discount_total > 0 ? `-${formatRupiah(trx.discount_total)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-coral-500 tabular-nums">
                        {formatRupiah(trx.grand_total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            trx.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : trx.status === 'voided'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {trx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedTrx(trx)}
                            className="p-1.5 text-mutedtext hover:text-heading rounded-lg hover:bg-canvas transition-colors"
                            title="Lihat Rincian Transaksi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReprintReceipt(trx)}
                            className="p-1.5 text-mutedtext hover:text-coral-500 rounded-lg hover:bg-coral-50 transition-colors"
                            title="Cetak Ulang Struk"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {trx.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleOpenVoid(trx)}
                                className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Batalkan (Void)"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenRefund(trx)}
                                className="p-1.5 text-mutedtext hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                                title="Refund Transaksi"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenDelete(trx)}
                            className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus Transaksi (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTrx && !isVoidModalOpen && !isRefundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-heading text-base">Detail Transaksi</h3>
                <p className="font-mono text-xs text-mutedtext">{selectedTrx.invoice_number}</p>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm bg-white">
              {/* Status Warning if Voided */}
              {selectedTrx.status === 'voided' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Transaksi ini telah dibatalkan (VOID)</span>
                  </div>
                  <p>Alasan: {selectedTrx.void_reason || 'Tidak ada keterangan.'}</p>
                  <p className="text-[10px] text-red-600">
                    Waktu: {formatDateTime(selectedTrx.voided_at || '')}
                  </p>
                </div>
              )}

              {/* Items Table with HPP Snapshot (Admin View) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-mutedtext uppercase tracking-wider">
                  Item Terjual & Snapshot Biaya
                </span>
                <div className="bg-canvas rounded-xl border border-borderline divide-y divide-borderline overflow-hidden">
                  {(selectedTrx.items || []).map((item) => (
                    <div key={item.id} className="p-3 space-y-1">
                      <div className="flex justify-between font-bold text-heading">
                        <span>{item.product_name}</span>
                        <span className="tabular-nums">{formatRupiah(item.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-mutedtext">
                        <span>
                          {item.quantity} x {formatRupiah(item.unit_price)}
                        </span>
                        <span className="text-emerald-700 font-semibold tabular-nums">
                          HPP Snapshot: {formatRupiah(item.unit_hpp)}/unit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="p-4 bg-canvas rounded-xl border border-borderline space-y-1.5 text-xs">
                <div className="flex justify-between text-mutedtext">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-heading tabular-nums">{formatRupiah(selectedTrx.subtotal)}</span>
                </div>
                {selectedTrx.discount_total > 0 && (
                  <div className="flex justify-between text-coral-500 font-semibold">
                    <span>Diskon:</span>
                    <span className="tabular-nums">-{formatRupiah(selectedTrx.discount_total)}</span>
                  </div>
                )}
                {selectedTrx.tax_total > 0 && (
                  <div className="flex justify-between text-mutedtext">
                    <span>Pajak (PPN):</span>
                    <span className="font-semibold text-heading tabular-nums">{formatRupiah(selectedTrx.tax_total)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-borderline flex justify-between font-black text-sm text-heading">
                  <span>Grand Total:</span>
                  <span className="text-coral-500 tabular-nums">{formatRupiah(selectedTrx.grand_total)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-borderline bg-white flex items-center justify-between">
              <button
                onClick={() => {
                  const t = selectedTrx;
                  setSelectedTrx(null);
                  handleOpenDelete(t);
                }}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Hapus transaksi ini (Khusus Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Transaksi</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTrx(null)}
                  className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading rounded-xl"
                >
                  Tutup
                </button>
                <button
                  onClick={() => handleReprintReceipt(selectedTrx)}
                  className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold rounded-xl shadow-md shadow-coral-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {isVoidModalOpen && selectedTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-heading text-base">Batalkan Transaksi (Void)</h3>
              <p className="text-xs text-mutedtext mt-1">
                Invoice <strong className="text-heading font-mono">{selectedTrx.invoice_number}</strong> senilai {formatRupiah(selectedTrx.grand_total)} akan ditandai void dan omzet akan dikurangi.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Alasan Pembatalan *
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
                placeholder="Contoh: Salah input pesanan kasir / Pelanggan batalkan pesanan..."
                required
                className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsVoidModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl border border-borderline"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {isVoiding ? 'Memproses...' : 'Konfirmasi Void'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {isRefundModalOpen && selectedTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-heading text-base">Refund Transaksi</h3>
              <p className="text-xs text-mutedtext mt-1">
                Pengembalian dana untuk invoice <strong className="text-heading font-mono">{selectedTrx.invoice_number}</strong> sebesar {formatRupiah(selectedTrx.grand_total)}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Alasan Pengembalian Dana (Refund) *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                placeholder="Contoh: Kualitas minuman tidak sesuai / Produk habis..."
                required
                className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl border border-borderline"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {isRefunding ? 'Memproses...' : 'Konfirmasi Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Transaction Modal */}
      {isDeleteModalOpen && trxToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-heading text-base">Hapus Transaksi</h3>
                <p className="font-mono text-xs text-mutedtext">{trxToDelete.invoice_number}</p>
              </div>
            </div>

            <div className="p-3.5 bg-canvas/70 rounded-xl border border-borderline space-y-1.5 text-xs text-heading">
              <div className="flex justify-between">
                <span className="text-mutedtext">Kasir:</span>
                <span className="font-semibold">{trxToDelete.cashier?.full_name || 'Kasir'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mutedtext">Waktu:</span>
                <span className="font-semibold">{formatDateTime(trxToDelete.created_at, true)}</span>
              </div>
              <div className="flex justify-between border-t border-borderline pt-1.5">
                <span className="text-mutedtext">Total Transaksi:</span>
                <span className="font-black text-coral-500">{formatRupiah(trxToDelete.grand_total)}</span>
              </div>
            </div>

            <p className="text-xs text-mutedtext">
              Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini permanen dan data transaksi beserta rincian item akan dihapus dari sistem.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTrxToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-70"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Transactions Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-heading text-base">Hapus Seluruh Riwayat</h3>
                <p className="text-xs text-mutedtext">Akses Khusus Administrator</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <p className="font-bold mb-1">Peringatan: Tindakan Ini Tidak Dapat Dibatalkan!</p>
              <p>
                Seluruh {transactions.length} riwayat transaksi penjualan yang tercatat akan dihapus secara permanen dari database.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-heading mb-1.5">
                Ketik kata <span className="text-red-600 font-mono font-bold">HAPUS</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="Ketik HAPUS..."
                className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsClearAllModalOpen(false);
                  setClearConfirmText('');
                }}
                className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={isClearingAll || clearConfirmText.trim().toUpperCase() !== 'HAPUS'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isClearingAll ? 'Menghapus Semua...' : 'Hapus Seluruh Riwayat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {receiptTrx && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setIsReceiptOpen(false);
            setReceiptTrx(null);
          }}
          transaction={receiptTrx}
          settings={settings}
        />
      )}
    </AdminLayout>
  );
}
