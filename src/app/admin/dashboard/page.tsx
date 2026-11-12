'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { FinancialSummary, Transaction } from '@/types/database';
import { formatRupiah, formatNumber, formatPercent, formatDateTime } from '@/lib/format';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  DollarSign,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  Flame,
  Clock,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import Link from 'next/link';
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart';
import { PaymentMethodDonutChart } from '@/components/dashboard/PaymentMethodDonutChart';
import { FinancialHealthRatio } from '@/components/dashboard/FinancialHealthRatio';
import { useOutlet } from '@/lib/outlet-context';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { Store } from 'lucide-react';

export default function AdminDashboardPage() {
  const { activeOutlet, isAllOutletsSelected } = useOutlet();
  const [period, setPeriod] = useState<
    'today' | 'yesterday' | '7days' | '30days' | 'this_month'
  >('today');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    summary: FinancialSummary;
    topProducts: any[];
    chartData: any[];
    paymentBreakdown: any[];
  } | null>(null);
  const [recentTrx, setRecentTrx] = useState<Transaction[]>([]);
  const [pendingPOsCount, setPendingPOsCount] = useState(0);

  useEffect(() => {
    const selectedOutletId = isAllOutletsSelected ? undefined : activeOutlet?.id;
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [data, trxs, allPOs] = await Promise.all([
          dbService.getFinancialAnalytics(period, undefined, undefined, selectedOutletId),
          dbService.getTransactions({ limit: 6, outletId: selectedOutletId }),
          dbService.getSupplierPOs(),
        ]);
        if (cancelled) return;
        setAnalytics(data);
        setRecentTrx(trxs);
        setPendingPOsCount(allPOs.filter((p) => p.status === 'pending_approval').length);
      } catch (err) {
        console.error('Failed to load dashboard analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();

    const handleSynced = () => {
      void loadDashboard();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_offline_queue_synced', handleSynced);
    }

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel(`admin-dashboard-${period}-${selectedOutletId || 'all'}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadDashboard())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cashier_shifts' }, () => void loadDashboard())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operating_expenses' }, () => void loadDashboard())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_pos' }, () => void loadDashboard())
        .subscribe();
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_offline_queue_synced', handleSynced);
      }
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [period, activeOutlet?.id, isAllOutletsSelected]);

  const summary = analytics?.summary;

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-7">
        {/* ========================================================
            1. Executive Header & Period Segmented Control
        ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 pb-2 border-b border-[#F0F0F0]">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-lg sm:text-2xl font-black text-[#18181B] tracking-tight">
                Dashboard Operasional
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
                Live Toko
              </span>
            </div>
            <p className="text-xs text-[#71717A] font-medium mt-1 flex items-center gap-1.5 min-w-0">
              <Store className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
              <span className="truncate">
                Cakupan:{' '}
                <strong className="text-[#18181B]">
                  {isAllOutletsSelected ? 'Konsolidasi 7 Cabang Obat Haus' : activeOutlet?.name}
                </strong>
              </span>
            </p>
          </div>

          {/* Segmented Control Filter */}
          <div className="flex items-center p-1 sm:p-1.5 bg-[#F4F4F5] rounded-2xl border border-[#E4E4E7] overflow-x-auto no-scrollbar shadow-2xs max-w-full">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: '7days', label: '7 Hari' },
              { id: '30days', label: '30 Hari' },
              { id: 'this_month', label: 'Bulan Ini' },
            ].map((p) => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as any)}
                  className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#71717A] hover:text-[#18181B] hover:bg-white/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Executive Action Banner: PO Approval Alert */}
        {pendingPOsCount > 0 && (
          <div className="bg-[#FFF7ED] border border-[#FED7AA] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#18181B]">
                  {pendingPOsCount} Permohonan PO Supplier Menunggu Otorisasi Admin
                </h4>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  Operator Gudang Pusat telah mengajukan pengadaan bahan baku ke mitra vendor. Persetujuan Admin diperlukan sebelum barang dikirim dan diterima.
                </p>
              </div>
            </div>
            <Link
              href="/admin/supplier-pos"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span>Review & Otorisasi PO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ========================================================
            2. Hero Executive KPI Grid (4 High-Contrast Cards)
        ======================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Omzet Bersih */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center font-bold shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider block truncate">
                    Omzet Bersih
                  </span>
                  <span className="hidden sm:block text-[10px] text-[#A1A1AA]">Setelah diskon kasir</span>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[10px] font-extrabold text-[#FF6B00] bg-[#FFF7ED] px-2 py-0.5 rounded-full border border-[#FED7AA] shrink-0">
                Net Revenue
              </span>
            </div>
            <div>
              <div className="text-base sm:text-2xl lg:text-3xl font-black text-[#18181B] tracking-tight tabular-nums truncate">
                {formatRupiah(summary?.netRevenue || 0)}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-[#71717A]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Laba Kotor: <strong className="text-[#18181B]">{formatRupiah(summary?.grossProfit || 0)}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 2: Keuntungan Bersih (Jet Black & Orange Hero Card) */}
          <div className="bg-[#18181B] text-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] shadow-md hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#27272A] text-[#FF6B00] flex items-center justify-center font-bold shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-white/70 uppercase tracking-wider block truncate">
                    Laba Bersih
                  </span>
                  <span className="hidden sm:block text-[10px] text-white/50">Laba Operasional</span>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-extrabold text-[#FF6B00] bg-[#FF6B00]/15 px-1.5 sm:px-2 py-0.5 rounded-full border border-[#FF6B00]/30 shrink-0">
                {formatPercent(summary?.netProfitMargin || 0)}
              </span>
            </div>
            <div>
              <div className="text-base sm:text-2xl lg:text-3xl font-black text-[#FF6B00] tracking-tight tabular-nums truncate">
                {formatRupiah(summary?.netOperatingProfit || 0)}
              </div>
              <div className="flex items-center justify-between gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-white/60 pt-1 border-t border-white/10">
                <span className="truncate">OPEX:</span>
                <span className="font-semibold text-white/80 truncate">{formatRupiah(summary?.operatingExpenses || 0)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Jumlah Transaksi & Rata-rata */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FAFAFA] text-[#18181B] border border-[#F0F0F0] flex items-center justify-center font-bold shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider block truncate">
                    Transaksi
                  </span>
                  <span className="hidden sm:block text-[10px] text-[#A1A1AA]">Aktivitas pesanan</span>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[10px] font-bold text-[#71717A] bg-[#FAFAFA] px-2 py-0.5 rounded-full border border-[#F0F0F0] shrink-0">
                Total Struk
              </span>
            </div>
            <div>
              <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#18181B] tracking-tight tabular-nums">
                {formatNumber(summary?.transactionCount || 0)}{' '}
                <span className="text-xs sm:text-sm font-bold text-[#71717A]">struk</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-[#71717A]">
                <span className="truncate">Avg: <strong className="text-[#18181B]">{formatRupiah(summary?.averageTransaction || 0)}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 4: Menu Terjual & HPP */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center font-bold shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#71717A] uppercase tracking-wider block truncate">
                    Menu Terjual
                  </span>
                  <span className="hidden sm:block text-[10px] text-[#A1A1AA]">Kuantitas item</span>
                </div>
              </div>
              <span className="hidden sm:inline-flex text-[10px] font-bold text-[#FF6B00] bg-[#FFF7ED] px-2 py-0.5 rounded-full border border-[#FED7AA] shrink-0">
                Katalog Menu
              </span>
            </div>
            <div>
              <div className="text-lg sm:text-2xl lg:text-3xl font-black text-[#18181B] tracking-tight tabular-nums">
                {formatNumber(summary?.itemsSold || 0)}{' '}
                <span className="text-xs sm:text-sm font-bold text-[#71717A]">porsi</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-[#71717A]">
                <span className="truncate">HPP: <strong className="text-[#18181B]">{formatRupiah(summary?.totalHpp || 0)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            3. Visual Analytics (Sales Trend 8-col & Donut 4-col)
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SalesTrendChart
              data={analytics?.chartData || []}
              periodLabel={period}
            />
          </div>
          <div>
            <PaymentMethodDonutChart
              data={analytics?.paymentBreakdown || []}
              totalRevenue={summary?.netRevenue || 0}
            />
          </div>
        </div>

        {/* ========================================================
            4. Revenue Allocation & Profit Efficiency Ratio
        ======================================================== */}
        <FinancialHealthRatio
          netRevenue={summary?.netRevenue || 0}
          totalHpp={summary?.totalHpp || 0}
          operatingExpenses={summary?.operatingExpenses || 0}
          netOperatingProfit={summary?.netOperatingProfit || 0}
          netProfitMargin={summary?.netProfitMargin || 0}
        />

        {/* ========================================================
            5. Operational Lists: Top Selling & Recent Transactions
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-[#18181B] text-sm sm:text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#FF6B00] shrink-0" />
                  <span className="truncate">Menu Terlaris (Top Selling)</span>
                </h3>
                <p className="text-xs text-[#71717A] mt-0.5 truncate">Produk dengan kontribusi omzet tertinggi</p>
              </div>
              <Link
                href="/admin/products"
                className="text-xs font-bold text-[#FF6B00] hover:text-[#EA580C] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Kelola</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#F0F0F0]">
              {(analytics?.topProducts || []).slice(0, 5).map((p, idx) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;
                const isBronze = idx === 2;
                return (
                  <div key={p.product_name} className="py-3 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          isGold
                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                            : isSilver
                            ? 'bg-[#F4F4F5] text-[#3F3F46] border border-[#E4E4E7]'
                            : isBronze
                            ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                            : 'bg-[#FAFAFA] text-[#71717A] border border-[#F0F0F0]'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-[#18181B] truncate group-hover:text-[#FF6B00] transition-colors">
                          {p.product_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-extrabold text-[#FF6B00] bg-[#FFF7ED] px-2 py-0.5 rounded-full border border-[#FED7AA]">
                            Margin: {p.margin}%
                          </span>
                          <span className="text-[11px] text-[#71717A]">
                            {p.quantity_sold} porsi terjual
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-xs sm:text-sm text-[#18181B] tabular-nums block">
                        {formatRupiah(p.revenue)}
                      </span>
                      <span className="text-[10px] text-[#A1A1AA]">
                        Laba: {formatRupiah(p.gross_profit || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Completed Transactions */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-extrabold text-[#18181B] text-sm sm:text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF6B00] shrink-0" />
                  <span className="truncate">Aktivitas Kasir Terbaru</span>
                </h3>
                <p className="text-xs text-[#71717A] mt-0.5 truncate">Struk pesanan yang baru saja diselesaikan</p>
              </div>
              <Link
                href="/admin/transactions"
                className="text-xs font-bold text-[#FF6B00] hover:text-[#EA580C] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#F0F0F0]">
              {recentTrx.map((trx) => (
                <div key={trx.id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-mono font-bold text-xs text-[#18181B] truncate group-hover:text-[#FF6B00] transition-colors">
                        {trx.invoice_number}
                      </h4>
                      <p className="text-[11px] text-[#71717A] mt-0.5 truncate">
                        {formatDateTime(trx.created_at, true)} &bull; {trx.cashier?.full_name || 'Kasir'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-xs sm:text-sm text-[#18181B] tabular-nums block">
                      {formatRupiah(trx.grand_total)}
                    </span>
                    <span className="inline-block text-[9px] uppercase font-bold text-[#FF6B00] bg-[#FFF7ED] px-2 py-0.5 rounded-full border border-[#FED7AA]">
                      {trx.payment_method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
