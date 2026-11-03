'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { useOutlet } from '@/lib/outlet-context';
import {
  FinancialSummary,
  StoreSettings,
  OutletFinancialPerformance,
  InventoryValuationSummary,
  CashierShift,
} from '@/types/database';
import { formatRupiah, formatPercent, formatDateTime } from '@/lib/format';
import {
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Calendar,
  Store,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Printer,
  ChevronRight,
  Boxes,
  PieChart,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRangeCalendarPicker } from '@/components/common/DateRangeCalendarPicker';

export default function AdminReportsPage() {
  const { availableOutlets, activeOutlet, isAllOutletsSelected, setActiveOutletId } = useOutlet();

  // Active Tab: 'pnl' | 'valuation' | 'menu' | 'cash_shifts'
  const [activeTab, setActiveTab] = useState<'pnl' | 'valuation' | 'menu' | 'cash_shifts'>('pnl');

  // Filters
  const [period, setPeriod] = useState<
    'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'this_year' | 'custom'
  >('custom');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');

  // Data States
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    summary: FinancialSummary;
    topProducts: any[];
    chartData: any[];
    paymentBreakdown: any[];
  } | null>(null);
  const [outletComparison, setOutletComparison] = useState<OutletFinancialPerformance[]>([]);
  const [inventoryValuation, setInventoryValuation] = useState<InventoryValuationSummary | null>(null);
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Sync with global outlet switcher if changed
  useEffect(() => {
    if (!isAllOutletsSelected && activeOutlet) {
      setSelectedOutletId(activeOutlet.id);
    } else {
      setSelectedOutletId('all');
    }
  }, [activeOutlet, isAllOutletsSelected]);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      const [analyticsData, comparisonData, valuationData, shiftsData, s] = await Promise.all([
        dbService.getFinancialAnalytics(period, customStart, customEnd, selectedOutletId),
        dbService.getOutletComparisonReport(period, customStart, customEnd),
        dbService.getInventoryValuationReport(),
        dbService.getShifts({
          outletId: selectedOutletId !== 'all' ? selectedOutletId : undefined,
          startDate: customStart || undefined,
          endDate: customEnd ? `${customEnd}T23:59:59` : undefined,
        }),
        dbService.getStoreSettings(),
      ]);

      setAnalytics(analyticsData);
      setOutletComparison(comparisonData);
      setInventoryValuation(valuationData);
      setShifts(shiftsData);
      setSettings(s);
    } catch (err) {
      console.error('Failed to load comprehensive reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [period, customStart, customEnd, selectedOutletId]);

  const summary = analytics?.summary;

  // Shifts Summary Calculations
  const shiftsStats = useMemo(() => {
    const closedShifts = shifts.filter((s) => s.status === 'closed');
    const totalCashSales = shifts.reduce((acc, s) => acc + (s.total_cash_sales || 0), 0);
    const totalNonCashSales = shifts.reduce((acc, s) => acc + (s.total_non_cash_sales || 0), 0);
    const totalPettyIn = shifts.reduce((acc, s) => acc + (s.total_cash_in || 0), 0);
    const totalPettyOut = shifts.reduce((acc, s) => acc + (s.total_cash_out || 0), 0);
    const totalDiscrepancy = closedShifts.reduce((acc, s) => acc + (s.cash_difference || 0), 0);

    return {
      totalShifts: shifts.length,
      activeShifts: shifts.filter((s) => s.status === 'active').length,
      totalCashSales,
      totalNonCashSales,
      totalPettyIn,
      totalPettyOut,
      totalDiscrepancy,
    };
  }, [shifts]);

  // =========================================================================
  // EXPORT TO CSV
  // =========================================================================
  const handleExportCSV = () => {
    if (!analytics || !summary) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'OBAT HAUS — LAPORAN EKSEKUTIF FINANSIAL & OPERASIONAL\n';
    csvContent += `Toko / Unit: ${settings?.store_name || 'Obat Haus'}\n`;
    csvContent += `Filter Outlet: ${
      selectedOutletId === 'all'
        ? 'Konsolidasi 7 Cabang'
        : availableOutlets.find((o) => o.id === selectedOutletId)?.name || selectedOutletId
    }\n`;
    csvContent += `Periode: ${period.toUpperCase()}\n`;
    csvContent += `Tanggal Ekspor: ${new Date().toISOString()}\n\n`;

    // 1. Ringkasan Laba Rugi
    csvContent += '1. RINGKASAN LABA RUGI OPERASIONAL (P&L)\n';
    csvContent += `Omzet Penjualan Bersih,${summary.netRevenue}\n`;
    csvContent += `Total HPP Bahan Baku (COGS),${summary.totalHpp}\n`;
    csvContent += `Laba Kotor (Gross Profit),${summary.grossProfit}\n`;
    csvContent += `Beban Operasional Toko (OPEX),${summary.operatingExpenses}\n`;
    csvContent += `Keuntungan Bersih Operasional,${summary.netOperatingProfit}\n`;
    csvContent += `Net Profit Margin (NPM),${summary.netProfitMargin}%\n`;
    csvContent += `Jumlah Transaksi,${summary.transactionCount}\n`;
    csvContent += `Total Cup/Porsi Terjual,${summary.itemsSold}\n\n`;

    // 2. Matriks Performa 7 Cabang
    csvContent += '2. MATRIKS PERFORMA 7 CABANG\n';
    csvContent += 'Kode,Nama Cabang,Transaksi,Porsi Terjual,Omzet Bersih,HPP,Laba Kotor,Gross Margin %,Beban OPEX,Laba Bersih,Net Margin %\n';
    outletComparison.forEach((oc) => {
      csvContent += `"${oc.outlet_code}","${oc.outlet_name}",${oc.transaction_count},${oc.items_sold},${oc.net_revenue},${oc.total_cogs},${oc.gross_profit},${oc.gross_margin_percent}%,${oc.operating_expenses},${oc.net_operating_profit},${oc.net_margin_percent}%\n`;
    });
    csvContent += '\n';

    // 3. Valuasi Nilai Persediaan
    if (inventoryValuation) {
      csvContent += '3. VALUASI PERSEDIAAN BAHAN BAKU\n';
      csvContent += `Valuasi Gudang Pusat,${inventoryValuation.warehouse_total_value}\n`;
      csvContent += `Valuasi Persediaan di 7 Outlet,${inventoryValuation.outlets_total_value}\n`;
      csvContent += `Total Nilai Aset Persediaan Konsolidasi,${inventoryValuation.consolidated_total_value}\n\n`;

      csvContent += 'SKU,Nama Bahan Baku,Kategori,Satuan,HPP Unit,Stok Gudang,Nilai Gudang,Stok 7 Cabang,Nilai 7 Cabang,Total Stok,Total Nilai\n';
      inventoryValuation.items.forEach((item) => {
        csvContent += `"${item.material_sku}","${item.material_name}","${item.category_name}","${item.unit_symbol}",${item.unit_cost},${item.warehouse_qty},${item.warehouse_value},${item.outlets_qty},${item.outlets_value},${item.total_qty},${item.total_value}\n`;
      });
      csvContent += '\n';
    }

    // 4. Kinerja Menu
    csvContent += '4. KONTRIBUSI LABA PRODUK MENU\n';
    csvContent += 'Nama Menu,Terjual (Porsi),Omzet,Laba Kotor,Gross Margin (%)\n';
    analytics.topProducts.forEach((p) => {
      csvContent += `"${p.product_name}",${p.quantity_sold},${p.revenue},${p.gross_profit},${p.margin}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Eksekutif_ObatHaus_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // EXPORT TO PDF
  // =========================================================================
  const handleExportPDF = () => {
    if (!analytics || !summary) return;

    const doc = new jsPDF();
    const store = settings?.store_name || 'Obat Haus';

    // Header
    doc.setFontSize(18);
    doc.setTextColor(24, 24, 27);
    doc.text(store, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text('Laporan Eksekutif Finansial, Valuasi Aset & Performa Operasional Multi-Outlet', 14, 26);
    doc.text(
      `Outlet: ${
        selectedOutletId === 'all'
          ? 'Konsolidasi 7 Cabang'
          : availableOutlets.find((o) => o.id === selectedOutletId)?.name || selectedOutletId
      } | Periode: ${period.toUpperCase()} | Dicetak: ${formatDateTime(new Date())}`,
      14,
      32
    );

    // 1. P&L Summary Table
    autoTable(doc, {
      startY: 38,
      head: [['Metrik Finansial Operasional', 'Nilai (IDR)', 'Keterangan Metrik']],
      body: [
        ['Omzet Penjualan Bersih (Net Revenue)', formatRupiah(summary.netRevenue), 'Total penjualan setelah diskon (Exclude PPN)'],
        ['Total HPP Bahan Baku (COGS)', formatRupiah(summary.totalHpp), 'Biaya bahan baku berdasarkan snapshot resep (BOM)'],
        ['Laba Kotor (Gross Profit)', formatRupiah(summary.grossProfit), 'Omzet Bersih - Total HPP Bahan Baku'],
        ['Beban Operasional Cabang (OPEX)', formatRupiah(summary.operatingExpenses), 'Sewa, listrik, gaji karyawan, es batu, internet'],
        ['Keuntungan Bersih Operasional', formatRupiah(summary.netOperatingProfit), 'Laba Kotor - Beban Operasional'],
        ['Net Profit Margin (NPM)', `${summary.netProfitMargin}%`, '(Keuntungan Bersih / Omzet Bersih) x 100%'],
        ['Volume Transaksi Kasir', `${summary.transactionCount} transaksi`, `${summary.itemsSold} porsi/cup minuman terjual`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 107, 0], textColor: 255 },
      styles: { fontSize: 8.5 },
    });

    // 2. Outlet Comparison Matrix
    let nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text('Performa Finansial Antar 7 Cabang Obat Haus', 14, nextY);

    const outletRows = outletComparison.map((oc) => [
      oc.outlet_code,
      oc.outlet_name.replace('Obat Haus - ', ''),
      `${oc.transaction_count} trx`,
      formatRupiah(oc.net_revenue),
      formatRupiah(oc.total_cogs),
      formatRupiah(oc.gross_profit),
      `${oc.gross_margin_percent}%`,
      formatRupiah(oc.operating_expenses),
      formatRupiah(oc.net_operating_profit),
      `${oc.net_margin_percent}%`,
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Kode', 'Cabang', 'Trx', 'Omzet', 'HPP', 'Laba Kotor', 'Gross %', 'OPEX', 'Laba Bersih', 'Net %']],
      body: outletRows,
      theme: 'striped',
      headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      styles: { fontSize: 7.5 },
    });

    // 3. Inventory Asset Valuation (New Page)
    if (inventoryValuation) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(24, 24, 27);
      doc.text('Valuasi Nilai Aset Persediaan Bahan Baku', 14, 20);

      doc.setFontSize(9);
      doc.setTextColor(113, 113, 122);
      doc.text(
        `Total Nilai Aset Konsolidasi: ${formatRupiah(inventoryValuation.consolidated_total_value)} (Gudang Pusat: ${formatRupiah(
          inventoryValuation.warehouse_total_value
        )} | 7 Cabang: ${formatRupiah(inventoryValuation.outlets_total_value)})`,
        14,
        26
      );

      const valRows = inventoryValuation.items.slice(0, 15).map((item) => [
        item.material_name,
        item.unit_symbol,
        formatRupiah(item.unit_cost),
        `${item.warehouse_qty}`,
        formatRupiah(item.warehouse_value),
        `${item.outlets_qty}`,
        formatRupiah(item.outlets_value),
        formatRupiah(item.total_value),
      ]);

      autoTable(doc, {
        startY: 32,
        head: [['Bahan Baku', 'Unit', 'HPP Satuan', 'Stok GDG', 'Nilai GDG', 'Stok Cabang', 'Nilai Cabang', 'Total Nilai']],
        body: valRows,
        theme: 'grid',
        headStyles: { fillColor: [255, 107, 0], textColor: 255 },
        styles: { fontSize: 7.5 },
      });
    }

    doc.save(`Laporan_Finansial_ObatHaus_${period}.pdf`);
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* 1. Header Banner & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#ECEEF1] shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100 text-[#FF6B00] uppercase tracking-wider">
                Financial & Inventory Intelligence
              </span>
              <span className="text-xs text-[#71717A]">• Phase 6 Final Reporting</span>
            </div>
            <h1 className="text-2xl font-black text-[#18181B] tracking-tight mt-1">
              Laporan Finansial & Valuasi Operasional
            </h1>
            <p className="text-xs text-[#71717A] mt-0.5">
              Konsolidasi Laba Rugi (P&L), Valuasi Aset Persediaan Gudang Pusat & 7 Cabang, Kinerja Resep BOM, dan Arus Kas Shift.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#ECEEF1] hover:bg-[#F4F4F5] text-[#18181B] text-xs font-bold rounded-2xl transition-colors cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh Dokumen PDF</span>
            </button>
          </div>
        </div>

        {/* 2. Global Filter Toolbar: Outlet Switcher + Date Selector */}
        <div className="bg-white p-4 rounded-3xl border border-[#ECEEF1] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Outlet Dropdown */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3.5 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <Store className="w-4 h-4 text-[#FF6B00]" />
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">🌐 Konsolidasi Semua Cabang (7 Outlet)</option>
                {availableOutlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Calendar Date Range Picker */}
            <DateRangeCalendarPicker
              startDate={customStart}
              endDate={customEnd}
              onChange={(start, end) => {
                setPeriod('custom');
                setCustomStart(start);
                setCustomEnd(end);
              }}
              align="right"
            />
          </div>
        </div>

        {/* 3. Navigation Tabs: 4 Specialized Reports */}
        <div className="flex items-center gap-2 border-b border-[#ECEEF1] pb-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'pnl'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#FF6B00]" />
            <span>1. Laba Rugi (P&L Multi-Outlet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('valuation')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'valuation'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-400" />
            <span>2. Valuasi Nilai Persediaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'menu'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>3. Kinerja Menu & Efisiensi Resep (BOM)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cash_shifts')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'cash_shifts'
                ? 'bg-[#18181B] text-white shadow-xs'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-400" />
            <span>4. Arus Kas Shift & Rekonsiliasi Kasir</span>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: PROFIT & LOSS (P&L) MULTI-OUTLET
        =================================================================== */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            {/* 6 Key Financial Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Omzet Penjualan Bersih */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  1. Omzet Penjualan Bersih (Net Revenue)
                </span>
                <div className="text-2xl font-black text-[#18181B] tabular-nums">
                  {formatRupiah(summary?.netRevenue || 0)}
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Total penjualan setelah diskon (Di luar PPN titipan)
                </p>
              </div>

              {/* 2. Total HPP Penjualan (COGS) */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  2. Total HPP Bahan Baku (COGS)
                </span>
                <div className="text-2xl font-black text-rose-600 tabular-nums">
                  {formatRupiah(summary?.totalHpp || 0)}
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Dihitung otomatis dari resep BOM bahan baku per menu
                </p>
              </div>

              {/* 3. Laba Kotor (Gross Profit) */}
              <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  3. Laba Kotor (Gross Profit)
                </span>
                <div className="text-2xl font-black text-emerald-700 tabular-nums">
                  {formatRupiah(summary?.grossProfit || 0)}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">
                  Formula: Omzet Bersih - Total HPP Bahan Baku
                </p>
              </div>

              {/* 4. Beban Operasional (OPEX) */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  4. Beban Operasional Toko (OPEX)
                </span>
                <div className="text-2xl font-black text-red-600 tabular-nums">
                  {formatRupiah(summary?.operatingExpenses || 0)}
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Sewa tempat, listrik PLN, air, internet, gaji & supplies
                </p>
              </div>

              {/* 5. Keuntungan Bersih Operasional */}
              <div className="bg-[#FFF7ED] p-5 rounded-3xl border border-[#FED7AA] shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-[#FF6B00] uppercase tracking-wider">
                  5. Keuntungan Bersih Operasional
                </span>
                <div className="text-2xl font-black text-[#FF6B00] tabular-nums">
                  {formatRupiah(summary?.netOperatingProfit || 0)}
                </div>
                <p className="text-[11px] text-[#FF6B00]/80 font-medium">
                  Formula: Laba Kotor - Beban Operasional Toko
                </p>
              </div>

              {/* 6. Net Profit Margin (NPM) */}
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  6. Net Profit Margin (NPM)
                </span>
                <div className="text-2xl font-black text-[#18181B] tabular-nums">
                  {formatPercent(summary?.netProfitMargin || 0)}
                </div>
                <p className="text-[11px] text-[#71717A]">
                  (Keuntungan Bersih / Omzet Bersih) x 100%
                </p>
              </div>
            </div>

            {/* Multi-Outlet Comparison Matrix */}
            <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#18181B] tracking-tight">
                    Matriks Perbandingan Performa Finansial 7 Cabang
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Evaluasi omzet, efisiensi resep HPP, beban operasional, dan margin laba bersih tiap outlet Obat Haus.
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#FAFAFA] rounded-xl text-xs font-bold text-[#71717A] border border-[#ECEEF1]">
                  7 Outlet Terdata
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] text-[#71717A] border-b border-[#ECEEF1] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama Outlet</th>
                      <th className="py-3 px-4 text-center">Transaksi</th>
                      <th className="py-3 px-4 text-right">Omzet Bersih</th>
                      <th className="py-3 px-4 text-right">HPP (COGS)</th>
                      <th className="py-3 px-4 text-right">Laba Kotor</th>
                      <th className="py-3 px-4 text-center">Gross %</th>
                      <th className="py-3 px-4 text-right">Beban OPEX</th>
                      <th className="py-3 px-4 text-right">Laba Bersih</th>
                      <th className="py-3 px-4 text-center">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-[#18181B]">
                    {outletComparison.map((oc) => (
                      <tr key={oc.outlet_id} className="hover:bg-[#FBFBFC] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">{oc.outlet_code}</td>
                        <td className="py-3.5 px-4 font-bold text-[#18181B]">
                          {oc.outlet_name.replace('Obat Haus - ', '')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-medium text-[#71717A]">
                          {oc.transaction_count} trx
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#18181B]">
                          {formatRupiah(oc.net_revenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                          {formatRupiah(oc.total_cogs)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          {formatRupiah(oc.gross_profit)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                          {oc.gross_margin_percent}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-red-600">
                          {formatRupiah(oc.operating_expenses)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#FF6B00]">
                          {formatRupiah(oc.net_operating_profit)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-black">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] ${
                              oc.net_margin_percent >= 30
                                ? 'bg-emerald-100 text-emerald-800'
                                : oc.net_margin_percent > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {oc.net_margin_percent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: INVENTORY ASSET VALUATION
        =================================================================== */}
        {activeTab === 'valuation' && inventoryValuation && (
          <div className="space-y-6">
            {/* 4 Asset Valuation KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    Total Valuasi Aset Konsolidasi
                  </p>
                  <h3 className="text-2xl font-black text-[#FF6B00] mt-1">
                    {formatRupiah(inventoryValuation.consolidated_total_value)}
                  </h3>
                  <p className="text-[11px] text-[#71717A] mt-1">Gudang Pusat + 7 Outlet</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center shrink-0">
                  <Boxes className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    Nilai Aset Gudang Pusat
                  </p>
                  <h3 className="text-2xl font-black text-[#18181B] mt-1">
                    {formatRupiah(inventoryValuation.warehouse_total_value)}
                  </h3>
                  <p className="text-[11px] text-blue-600 font-bold mt-1">Stok Cadangan Utama</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    Nilai Persediaan di 7 Outlet
                  </p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-1">
                    {formatRupiah(inventoryValuation.outlets_total_value)}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">Stok Operasional Kasir</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    Peringatan Stok Menipis
                  </p>
                  <h3 className="text-2xl font-black text-amber-600 mt-1">
                    {inventoryValuation.low_stock_count}{' '}
                    <span className="text-xs font-semibold text-[#71717A]">bahan</span>
                  </h3>
                  <p className="text-[11px] text-amber-700 font-bold mt-1">Perlu Restock PO Supplier</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Outlets Asset Breakdown Matrix */}
            <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs p-6 space-y-4">
              <h3 className="text-base font-black text-[#18181B] tracking-tight">
                Sebaran Nilai Persediaan Bahan Baku di 7 Cabang
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {inventoryValuation.outlets_breakdown.map((ob) => (
                  <div key={ob.outlet_id} className="p-3.5 bg-[#FAFAFA] rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[10px] font-bold text-[#71717A] uppercase line-clamp-1">
                      {ob.outlet_name.replace('Obat Haus - ', '')}
                    </span>
                    <p className="text-sm font-black text-[#18181B] mt-1">{formatRupiah(ob.total_value)}</p>
                    <span className="text-[10px] text-[#71717A]">{ob.items_count} SKU bahan</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw Material Inventory Valuation Table */}
            <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-[#18181B] tracking-tight">
                    Rincian Valuasi Seluruh Bahan Baku (BOM Assets)
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Nilai aset dihitung dari Kuantitas Fisik x Estimasi Harga Satuan HPP (FIFO/Average).
                  </p>
                </div>
                <span className="text-xs font-bold text-[#71717A]">
                  {inventoryValuation.items.length} Bahan Baku Terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] text-[#71717A] border-b border-[#ECEEF1] font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">SKU & Bahan Baku</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Harga Satuan HPP</th>
                      <th className="py-3 px-4 text-right">Stok Gudang</th>
                      <th className="py-3 px-4 text-right">Nilai Gudang</th>
                      <th className="py-3 px-4 text-right">Stok 7 Cabang</th>
                      <th className="py-3 px-4 text-right">Nilai 7 Cabang</th>
                      <th className="py-3 px-4 text-right font-black text-[#FF6B00]">Total Valuasi Aset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0F0] text-[#18181B]">
                    {inventoryValuation.items.map((item) => (
                      <tr key={item.raw_material_id} className="hover:bg-[#FBFBFC] transition-colors">
                        <td className="py-3.5 px-4 font-bold">
                          <p className="text-[#18181B]">{item.material_name}</p>
                          <span className="text-[10px] font-mono text-[#71717A]">{item.material_sku}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#71717A]">{item.category_name}</td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {formatRupiah(item.unit_cost)} / {item.unit_symbol}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {item.warehouse_qty.toLocaleString('id-ID')} {item.unit_symbol}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-blue-600">
                          {formatRupiah(item.warehouse_value)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {item.outlets_qty.toLocaleString('id-ID')} {item.unit_symbol}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {formatRupiah(item.outlets_value)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#18181B]">
                          {formatRupiah(item.total_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MENU PERFORMANCE & RECIPE BOM EFFICIENCY
        =================================================================== */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#18181B] tracking-tight">
                  Analisis Kontribusi Laba & Efisiensi Resep Menu
                </h3>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Identifikasi menu terlaris (*best seller*), margin keuntungan kotor tertinggi, dan kontribusi terhadap omzet.
                </p>
              </div>
              <span className="text-xs font-bold text-[#71717A]">
                {analytics?.topProducts.length || 0} Menu Dianalisis
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] text-[#71717A] border-b border-[#ECEEF1] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Peringkat & Nama Menu</th>
                    <th className="py-3 px-4 text-right">Kuantitas Terjual</th>
                    <th className="py-3 px-4 text-right">Kontribusi Omzet</th>
                    <th className="py-3 px-4 text-right">Laba Kotor</th>
                    <th className="py-3 px-4 text-center">Gross Margin %</th>
                    <th className="py-3 px-4 text-center">Klasifikasi Kinerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] text-[#18181B]">
                  {analytics?.topProducts.map((p, idx) => (
                    <tr key={p.product_name} className="hover:bg-[#FBFBFC] transition-colors">
                      <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <span>{p.product_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#71717A]">
                        {p.quantity_sold} porsi
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-[#FF6B00]">
                        {formatRupiah(p.revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                        {formatRupiah(p.gross_profit)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">
                        {p.margin}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                            idx < 3
                              ? 'bg-orange-100 text-[#FF6B00]'
                              : p.margin >= 65
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {idx < 3 ? '🔥 Top Best Seller' : p.margin >= 65 ? '💎 High Margin Star' : 'Standard Menu'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: CASH FLOW & SHIFT RECONCILIATION SUMMARY
        =================================================================== */}
        {activeTab === 'cash_shifts' && (
          <div className="space-y-6">
            {/* Shifts KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">Total Sesi Shift</span>
                <h3 className="text-2xl font-black text-[#18181B] mt-1">{shiftsStats.totalShifts} Sesi</h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">
                  {shiftsStats.activeShifts} Sedang Aktif di Outlet
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">Penjualan Uang Tunai</span>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatRupiah(shiftsStats.totalCashSales)}</h3>
                <p className="text-[11px] text-[#71717A] mt-1">Setoran Uang Fisik Kasir</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">Kas Kecil Masuk / Keluar</span>
                <h3 className="text-2xl font-black text-rose-600 mt-1">-{formatRupiah(shiftsStats.totalPettyOut)}</h3>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">
                  Kas Masuk: +{formatRupiah(shiftsStats.totalPettyIn)}
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs">
                <span className="text-[11px] font-bold text-[#71717A] uppercase">Total Selisih Kas</span>
                <h3
                  className={`text-2xl font-black mt-1 ${
                    shiftsStats.totalDiscrepancy === 0
                      ? 'text-emerald-600'
                      : shiftsStats.totalDiscrepancy < 0
                      ? 'text-red-600'
                      : 'text-amber-600'
                  }`}
                >
                  {shiftsStats.totalDiscrepancy > 0 ? '+' : ''}
                  {formatRupiah(shiftsStats.totalDiscrepancy)}
                </h3>
                <p className="text-[11px] text-[#71717A] mt-1">
                  {shiftsStats.totalDiscrepancy === 0 ? 'Klop Sempurna' : 'Defisit / Surplus Fisik'}
                </p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs p-6 space-y-4">
              <h3 className="text-base font-black text-[#18181B] tracking-tight">
                Distribusi Pembayaran Pelanggan (Payment Method Breakdown)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {analytics?.paymentBreakdown.map((pb) => (
                  <div key={pb.method} className="p-4 bg-[#FAFAFA] rounded-2xl border border-[#ECEEF1]">
                    <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                      {pb.method === 'cash'
                        ? '💵 Uang Tunai'
                        : pb.method === 'qris'
                        ? '📱 QRIS Statis/Dinamis'
                        : pb.method === 'debit'
                        ? '💳 Kartu Debit EDC'
                        : '🏦 Transfer Bank'}
                    </span>
                    <p className="text-lg font-black text-[#18181B] mt-1">{formatRupiah(pb.total)}</p>
                    <p className="text-[11px] text-[#71717A] mt-0.5">{pb.count} Transaksi</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
