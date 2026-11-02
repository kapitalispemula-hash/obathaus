'use client';

import React from 'react';
import { formatRupiah, formatPercent } from '@/lib/format';
import { PieChart, ArrowUpRight, TrendingUp, ShieldCheck } from 'lucide-react';

interface FinancialHealthRatioProps {
  netRevenue: number;
  totalHpp: number;
  operatingExpenses: number;
  netOperatingProfit: number;
  netProfitMargin: number;
}

export function FinancialHealthRatio({
  netRevenue,
  totalHpp,
  operatingExpenses,
  netOperatingProfit,
  netProfitMargin,
}: FinancialHealthRatioProps) {
  const rev = Math.max(netRevenue, 1);
  const hppPercent = Math.min(100, Math.max(0, (totalHpp / rev) * 100));
  const expensePercent = Math.min(100, Math.max(0, (operatingExpenses / rev) * 100));
  const profitPercent = Math.max(0, 100 - hppPercent - expensePercent);

  return (
    <div className="bg-white p-6 rounded-[26px] border border-[#F0F0F0] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-extrabold text-[#18181B] text-sm sm:text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#FF6B00]" />
            <span>Struktur Alokasi Omzet & Profitabilitas</span>
          </h3>
          <p className="text-xs text-[#71717A] mt-0.5">
            Komposisi pembagian pendapatan ke HPP bahan baku, operasional, dan laba bersih toko
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] rounded-full text-xs font-bold shrink-0 self-start sm:self-auto">
          <TrendingUp className="w-3.5 h-3.5 text-[#FF6B00]" />
          <span>Net Profit Margin (NPM): {formatPercent(netProfitMargin)}</span>
        </div>
      </div>

      {/* Multi-segment Horizontal Proportion Bar */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-canvas rounded-xl overflow-hidden flex shadow-inner border border-borderline p-0.5">
          {/* HPP segment */}
          <div
            style={{ width: `${hppPercent}%` }}
            className="bg-amber-400 h-full rounded-l-lg transition-all"
            title={`HPP Bahan Baku: ${hppPercent.toFixed(1)}%`}
          />
          {/* Operating Expense segment */}
          <div
            style={{ width: `${expensePercent}%` }}
            className="bg-red-400 h-full transition-all"
            title={`Beban Operasional: ${expensePercent.toFixed(1)}%`}
          />
          {/* Net Profit segment */}
          <div
            style={{ width: `${profitPercent}%` }}
            className="bg-emerald-500 h-full rounded-r-lg transition-all"
            title={`Keuntungan Bersih: ${profitPercent.toFixed(1)}%`}
          />
        </div>

        {/* 3 Metric Proportion Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 1. HPP */}
          <div className="p-3 bg-canvas/60 rounded-xl border border-borderline">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-mutedtext uppercase">
                Bahan Baku (HPP)
              </span>
              <span className="text-xs font-black text-amber-600 tabular-nums">
                {hppPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm font-bold text-heading tabular-nums">
              {formatRupiah(totalHpp)}
            </div>
            <p className="text-[10px] text-mutedtext mt-0.5">Modal produksi menu</p>
          </div>

          {/* 2. Beban Operasional */}
          <div className="p-3 bg-canvas/60 rounded-xl border border-borderline">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-mutedtext uppercase">
                Beban Operasional
              </span>
              <span className="text-xs font-black text-red-600 tabular-nums">
                {expensePercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm font-bold text-heading tabular-nums">
              {formatRupiah(operatingExpenses)}
            </div>
            <p className="text-[10px] text-mutedtext mt-0.5">Sewa, gaji, utilitas toko</p>
          </div>

          {/* 3. Laba Bersih Operasional */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">
                Keuntungan Bersih
              </span>
              <span className="text-xs font-black text-emerald-700 tabular-nums">
                {profitPercent.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm font-black text-emerald-700 tabular-nums">
              {formatRupiah(netOperatingProfit)}
            </div>
            <p className="text-[10px] text-emerald-600 mt-0.5">Hasil bersih operasional</p>
          </div>
        </div>
      </div>
    </div>
  );
}
