'use client';

import React, { useState, useEffect } from 'react';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { dbService } from '@/lib/services/database';
import { getPendingOfflineSyncCount, syncOfflineQueue } from '@/lib/services/offline-sync';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Transaction, StoreSettings } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import {
  Receipt,
  Search,
  Eye,
  Printer,
  X,
  CreditCard,
  ShoppingBag,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export default function CashierHistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setOfflinePendingCount(getPendingOfflineSyncCount());
      // Load transactions for this cashier (or active session) per PRD Section 2.2 & 9.2
      const filter = user ? { cashierId: user.id } : undefined;
      const [trxs, s] = await Promise.all([
        dbService.getTransactions(filter),
        dbService.getStoreSettings(),
      ]);
      setTransactions(trxs);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load cashier transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await syncOfflineQueue();
      }
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSynced = () => {
      void loadData();
    };
    const handleQueueChanged = () => {
      setOfflinePendingCount(getPendingOfflineSyncCount());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_offline_queue_synced', handleSynced);
      window.addEventListener('obathaus_offline_queue_changed', handleQueueChanged);
    }

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel(`pos-history-${user?.id || 'guest'}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadData())
        .subscribe();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_offline_queue_synced', handleSynced);
        window.removeEventListener('obathaus_offline_queue_changed', handleQueueChanged);
      }
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  const handleReprintReceipt = (trx: Transaction) => {
    setReceiptTrx(trx);
    setIsReceiptOpen(true);
  };

  const filtered = transactions.filter((t) => {
    return (
      !search ||
      t.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <CashierLayout>
      <div className="h-full overflow-y-auto p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Riwayat Transaksi Saya
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Daftar transaksi yang diproses oleh akun kasir Anda ({user?.full_name || 'Staf Kasir'}) pada sesi kasir aktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {offlinePendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5" />
                {offlinePendingCount} Antrean Offline
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || loading}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-borderline rounded-xl text-xs font-bold text-heading flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing || loading ? 'animate-spin' : ''}`} />
              <span>Sinkronkan</span>
            </button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedtext" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor invoice..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-borderline rounded-xl text-xs sm:text-sm text-heading placeholder:text-mutedtext focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">No. Invoice</th>
                  <th className="py-3.5 px-4">Tanggal & Waktu</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                  <th className="py-3.5 px-4 text-right">Diterima</th>
                  <th className="py-3.5 px-4 text-right">Kembalian</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-mutedtext">
                      <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat riwayat transaksi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-mutedtext">
                      Belum ada transaksi pada riwayat akun kasir ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((trx) => (
                    <tr key={trx.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-heading">
                        {trx.invoice_number}
                      </td>
                      <td className="py-3 px-4 text-mutedtext text-xs">
                        {formatDateTime(trx.created_at, true)}
                      </td>
                      <td className="py-3 px-4 uppercase font-bold text-xs text-mutedtext">
                        {trx.payment_method}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#FF6B00] tabular-nums">
                        {formatRupiah(trx.grand_total)}
                      </td>
                      <td className="py-3 px-4 text-right text-mutedtext tabular-nums">
                        {formatRupiah(trx.amount_received)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-heading tabular-nums">
                        {formatRupiah(trx.change_amount)}
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
                            title="Rincian Pesanan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReprintReceipt(trx)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors"
                            title="Cetak Ulang Struk"
                          >
                            <Printer className="w-4 h-4" />
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

      {/* Cashier Item Details Modal (WITHOUT HPP / MARGIN) */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-heading text-base">Rincian Pesanan Kasir</h3>
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
              {/* Items List (Strict Cashier Privacy: No HPP) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-mutedtext uppercase tracking-wider">
                  Menu Yang Dipesan
                </span>
                <div className="bg-canvas rounded-xl border border-borderline divide-y divide-borderline overflow-hidden">
                  {(selectedTrx.items || []).map((item) => (
                    <div key={item.id} className="p-3 space-y-0.5">
                      <div className="flex justify-between font-bold text-heading">
                        <span>{item.product_name}</span>
                        <span className="tabular-nums">{formatRupiah(item.subtotal)}</span>
                      </div>
                      <div className="text-xs text-mutedtext">
                        {item.quantity} x {formatRupiah(item.unit_price)}
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
                  <div className="flex justify-between text-[#FF6B00] font-semibold">
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
                  <span>Total Tagihan:</span>
                  <span className="text-[#FF6B00] tabular-nums">{formatRupiah(selectedTrx.grand_total)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-borderline bg-white flex justify-between">
              <button
                onClick={() => setSelectedTrx(null)}
                className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={() => handleReprintReceipt(selectedTrx)}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Ulang Struk</span>
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
    </CashierLayout>
  );
}
