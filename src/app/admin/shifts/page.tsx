'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { useOutlet } from '@/lib/outlet-context';
import { CashierShift, ShiftCashMovement } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Filter,
  Search,
  Store,
  ChevronRight,
  Eye,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function AdminShiftsPage() {
  const { availableOutlets, activeOutlet, isAllOutletsSelected } = useOutlet();

  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Shift Detail Modal
  const [detailShift, setDetailShift] = useState<CashierShift | null>(null);
  const [detailMovements, setDetailMovements] = useState<ShiftCashMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);

  useEffect(() => {
    if (!isAllOutletsSelected && activeOutlet) {
      setSelectedOutlet(activeOutlet.id);
    } else {
      setSelectedOutlet('all');
    }
  }, [activeOutlet, isAllOutletsSelected]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await dbService.getShifts({
        outletId: selectedOutlet !== 'all' ? selectedOutlet : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setShifts(data);
    } catch (err) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [selectedOutlet, statusFilter]);

  const openDetailModal = async (shift: CashierShift) => {
    setDetailShift(shift);
    try {
      setLoadingMovements(true);
      const movements = await dbService.getShiftMovements(shift.id);
      setDetailMovements(movements);
    } catch (err) {
      console.error('Failed to load shift movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  // Filtered shifts based on search query & discrepancy
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        s.shift_number.toLowerCase().includes(q) ||
        (s.cashier?.full_name || '').toLowerCase().includes(q) ||
        (s.outlet?.name || '').toLowerCase().includes(q);

      let matchDiscrepancy = true;
      if (discrepancyFilter === 'discrepancy_only') {
        matchDiscrepancy = s.status === 'closed' && (s.cash_difference || 0) !== 0;
      } else if (discrepancyFilter === 'match_only') {
        matchDiscrepancy = s.status === 'closed' && (s.cash_difference || 0) === 0;
      }

      return matchSearch && matchDiscrepancy;
    });
  }, [shifts, searchQuery, discrepancyFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCount = filteredShifts.length;
    const activeCount = filteredShifts.filter((s) => s.status === 'active').length;
    const totalCashSales = filteredShifts.reduce((acc, s) => acc + (s.total_cash_sales || 0), 0);
    const totalNonCashSales = filteredShifts.reduce((acc, s) => acc + (s.total_non_cash_sales || 0), 0);
    const totalGrossRevenue = totalCashSales + totalNonCashSales;
    const totalDifference = filteredShifts
      .filter((s) => s.status === 'closed')
      .reduce((acc, s) => acc + (s.cash_difference || 0), 0);

    return {
      totalCount,
      activeCount,
      totalCashSales,
      totalNonCashSales,
      totalGrossRevenue,
      totalDifference,
    };
  }, [filteredShifts]);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#ECEEF1] shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100 text-[#FF6B00] uppercase tracking-wider">
                Multi-Outlet Shift Control
              </span>
              <span className="text-xs text-[#71717A]">• Phase 5 Audit Control</span>
            </div>
            <h1 className="text-2xl font-black text-[#18181B] tracking-tight mt-1">
              Rekonsiliasi Kas & Sesi Shift Kasir
            </h1>
            <p className="text-xs text-[#71717A] mt-0.5">
              Pantau kepatuhan kasir di 7 outlet, pergerakan uang tunai (petty cash), dan deteksi selisih kas fisik vs sistem.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadShifts}
              className="px-4 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Clock className="w-4 h-4 text-[#71717A]" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Sesi Shift Terpantau
              </p>
              <h3 className="text-2xl font-black text-[#18181B] mt-1">
                {stats.totalCount}{' '}
                <span className="text-xs font-semibold text-[#71717A]">sesi</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {stats.activeCount} Shift sedang berjalan
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Total Omzet Terverifikasi
              </p>
              <h3 className="text-2xl font-black text-[#18181B] mt-1">
                {formatRupiah(stats.totalGrossRevenue)}
              </h3>
              <p className="text-[11px] text-[#71717A] mt-1">
                Tunai: {formatRupiah(stats.totalCashSales)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Penjualan Non-Tunai
              </p>
              <h3 className="text-2xl font-black text-[#18181B] mt-1">
                {formatRupiah(stats.totalNonCashSales)}
              </h3>
              <p className="text-[11px] text-blue-600 font-bold mt-1">
                QRIS, EDC & Transfer Bank
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Kumulatif Selisih Kas
              </p>
              <h3
                className={`text-2xl font-black mt-1 ${
                  stats.totalDifference === 0
                    ? 'text-emerald-600'
                    : stats.totalDifference < 0
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}
              >
                {stats.totalDifference > 0 ? '+' : ''}
                {formatRupiah(stats.totalDifference)}
              </h3>
              <p className="text-[11px] font-medium text-[#71717A] mt-1">
                {stats.totalDifference === 0
                  ? 'Klop 100% (Sesuai)'
                  : stats.totalDifference < 0
                  ? 'Defisit kas (kurang setor)'
                  : 'Surplus kas (lebih setor)'}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                stats.totalDifference === 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {stats.totalDifference === 0 ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        {/* 3. Filters Toolbar */}
        <div className="bg-white p-4 rounded-3xl border border-[#ECEEF1] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Outlet Switcher */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <Store className="w-4 h-4 text-[#FF6B00]" />
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Outlet (7 Cabang)</option>
                {availableOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code}: {o.name.replace('Obat Haus - ', '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <Filter className="w-4 h-4 text-[#71717A]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status Shift</option>
                <option value="active">🟢 Shift Aktif</option>
                <option value="closed">🔒 Shift Selesai / Ditutup</option>
              </select>
            </div>

            {/* Discrepancy Filter */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <select
                value={discrepancyFilter}
                onChange={(e) => setDiscrepancyFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kondisi Kas</option>
                <option value="discrepancy_only">⚠️ Ada Selisih Kas Saja</option>
                <option value="match_only">✅ Kas Klop 100%</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kasir / nomor shift..."
              className="w-full pl-9 pr-4 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-2xl text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* 4. Main Shifts Table */}
        <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] text-[#71717A] border-b border-[#ECEEF1] font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-5">Sesi & Outlet</th>
                  <th className="py-4 px-4">Kasir</th>
                  <th className="py-4 px-4">Waktu Buka / Tutup</th>
                  <th className="py-4 px-4 text-right">Modal Awal</th>
                  <th className="py-4 px-4 text-right">Penjualan Tunai</th>
                  <th className="py-4 px-4 text-right">Kas Sistem (Harapan)</th>
                  <th className="py-4 px-4 text-right">Fisik Kas (Setoran)</th>
                  <th className="py-4 px-4 text-center">Status / Selisih</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-[#18181B]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#71717A]">
                      <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat rekonsiliasi shift kasir...
                    </td>
                  </tr>
                ) : filteredShifts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#71717A]">
                      <Clock className="w-10 h-10 text-[#D4D4D8] mx-auto mb-2" />
                      Tidak ada riwayat shift yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredShifts.map((shift) => {
                    const diff = shift.cash_difference || 0;
                    return (
                      <tr key={shift.id} className="hover:bg-[#FBFBFC] transition-colors">
                        <td className="py-4 px-5 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="text-[#18181B]">{shift.shift_number}</span>
                            {shift.status === 'active' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Shift Aktif" />
                            )}
                          </div>
                          <p className="text-[10px] text-[#71717A] font-medium mt-0.5">
                            {shift.outlet?.name || shift.outlet_id}
                          </p>
                        </td>

                        <td className="py-4 px-4 font-medium">
                          <p className="font-bold text-[#18181B]">{shift.cashier?.full_name || 'Kasir'}</p>
                          <p className="text-[10px] text-[#71717A]">{shift.cashier?.email || ''}</p>
                        </td>

                        <td className="py-4 px-4 text-[#71717A]">
                          <p className="font-medium text-[#18181B]">{formatDateTime(shift.opened_at)}</p>
                          <p className="text-[10px]">
                            {shift.closed_at ? `Tutup: ${formatDateTime(shift.closed_at)}` : 'Masih aktif bertugas'}
                          </p>
                        </td>

                        <td className="py-4 px-4 text-right font-medium">
                          {formatRupiah(shift.opening_cash)}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-emerald-600">
                          {formatRupiah(shift.total_cash_sales)}
                        </td>

                        <td className="py-4 px-4 text-right font-medium">
                          {formatRupiah(shift.closing_cash_expected || 0)}
                        </td>

                        <td className="py-4 px-4 text-right font-bold">
                          {shift.status === 'closed' && shift.closing_cash_actual != null
                            ? formatRupiah(shift.closing_cash_actual)
                            : '-'}
                        </td>

                        <td className="py-4 px-4 text-center">
                          {shift.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Sedang Aktif
                            </span>
                          ) : (diff || 0) === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Klop (Rp 0)
                            </span>
                          ) : (diff || 0) < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              Defisit {formatRupiah(Math.abs(diff || 0))}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Surplus +{formatRupiah(diff || 0)}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetailModal(shift)}
                            className="px-3 py-1.5 bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFEDD5] text-[11px] font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Audit & X/Z</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Shift Detail & X/Z Report Modal */}
        {detailShift && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#ECEEF1] overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#ECEEF1] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center border border-[#FED7AA] font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#18181B] text-base">
                      Audit Sesi Shift #{detailShift.shift_number}
                    </h3>
                    <p className="text-xs text-[#71717A]">
                      {detailShift.outlet?.name} &bull; Kasir: {detailShift.cashier?.full_name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailShift(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Status Callout */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    detailShift.status === 'active'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : (detailShift.cash_difference || 0) === 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : (detailShift.cash_difference || 0) < 0
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Status: {detailShift.status === 'active' ? 'Shift Sedang Aktif' : 'Shift Telah Ditutup'}
                    </p>
                    <p className="text-sm font-black mt-0.5">
                      {detailShift.status === 'active'
                        ? 'Kasir saat ini sedang melayani pesanan di outlet.'
                        : (detailShift.cash_difference || 0) === 0
                        ? 'Rekonsiliasi Kas Sempurna (Tidak Ada Selisih)'
                        : `Terdapat Selisih Kas: ${formatRupiah(detailShift.cash_difference || 0)}`}
                    </p>
                  </div>
                  {detailShift.status === 'closed' && (
                    <div className="text-right">
                      <span className="text-[11px] font-bold block text-mutedtext">Laporan Z Final</span>
                      <span className="text-xs font-black">{formatDateTime(detailShift.closed_at || '')}</span>
                    </div>
                  )}
                </div>

                {/* Financial Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Modal Awal Kas</span>
                    <p className="text-sm font-black text-[#18181B] mt-1">{formatRupiah(detailShift.opening_cash)}</p>
                  </div>
                  <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Penjualan Tunai</span>
                    <p className="text-sm font-black text-emerald-600 mt-1">{formatRupiah(detailShift.total_cash_sales)}</p>
                  </div>
                  <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Penjualan Non-Tunai</span>
                    <p className="text-sm font-black text-blue-600 mt-1">{formatRupiah(detailShift.total_non_cash_sales)}</p>
                  </div>
                  <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Kas Masuk (Petty In)</span>
                    <p className="text-sm font-black text-indigo-600 mt-1">{formatRupiah(detailShift.total_cash_in)}</p>
                  </div>
                  <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase">Kas Keluar (Petty Out)</span>
                    <p className="text-sm font-black text-rose-600 mt-1">-{formatRupiah(detailShift.total_cash_out)}</p>
                  </div>
                  <div className="bg-[#FFF7ED] p-3.5 rounded-2xl border border-[#FED7AA]">
                    <span className="text-[10px] font-bold text-[#FF6B00] uppercase">Kas Sistem Harapan</span>
                    <p className="text-sm font-black text-[#FF6B00] mt-1">{formatRupiah(detailShift.closing_cash_expected || 0)}</p>
                  </div>
                </div>

                {/* Actual Count & Discrepancy Note */}
                {detailShift.status === 'closed' && (
                  <div className="bg-[#F8F9FA] p-4 rounded-2xl border border-[#ECEEF1] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#71717A]">Hitungan Kas Fisik Aktual (Blind Count):</span>
                      <span className="font-black text-[#18181B] text-sm">
                        {formatRupiah(detailShift.closing_cash_actual || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[#ECEEF1]">
                      <span className="text-[#71717A]">Selisih Kas (Fisik - Harapan):</span>
                      <span
                        className={`font-black text-sm ${
                          (detailShift.cash_difference || 0) === 0
                            ? 'text-emerald-600'
                            : (detailShift.cash_difference || 0) < 0
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {(detailShift.cash_difference || 0) > 0 ? '+' : ''}
                        {formatRupiah(detailShift.cash_difference || 0)}
                      </span>
                    </div>
                    {detailShift.notes && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-[#71717A]">Catatan Kasir saat Tutup Shift:</span>
                        <p className="text-xs text-[#18181B] bg-white p-2.5 rounded-xl border border-[#ECEEF1] mt-1">
                          {detailShift.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Petty Cash Movement History */}
                <div>
                  <h4 className="text-xs font-extrabold text-[#18181B] uppercase tracking-wider mb-2">
                    Riwayat Pergerakan Kas (Petty Cash Sesi Ini)
                  </h4>
                  {loadingMovements ? (
                    <p className="text-xs text-[#71717A] py-3 text-center">Memuat mutasi kas...</p>
                  ) : detailMovements.length === 0 ? (
                    <p className="text-xs text-[#71717A] py-3 text-center bg-[#FAFAFA] rounded-2xl border border-[#ECEEF1]">
                      Tidak ada kas masuk/keluar selain transaksi POS.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detailMovements.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 bg-[#FAFAFA] rounded-xl border border-[#ECEEF1] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {m.type === 'cash_in' ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-600" />
                            )}
                            <div>
                              <p className="font-bold text-[#18181B]">{m.reason}</p>
                              <p className="text-[10px] text-[#71717A]">{formatDateTime(m.created_at)}</p>
                            </div>
                          </div>
                          <span
                            className={`font-black ${
                              m.type === 'cash_in' ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {m.type === 'cash_in' ? '+' : '-'}
                            {formatRupiah(m.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#ECEEF1] flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white border border-[#ECEEF1] hover:bg-[#F4F4F5] text-[#18181B] text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-4 h-4 text-[#71717A]" />
                  <span>Cetak Dokumen Audit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailShift(null)}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
