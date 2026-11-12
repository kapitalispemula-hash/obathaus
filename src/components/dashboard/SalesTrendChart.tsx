'use client';

import React, { useState } from 'react';
import { formatRupiah, formatCompactRupiah, formatDateShort } from '@/lib/format';
import { BarChart3, LineChart, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export interface ChartDataPoint {
  date: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  expenses?: number;
  netProfit?: number;
}

interface SalesTrendChartProps {
  data: ChartDataPoint[];
  periodLabel?: string;
}

export function SalesTrendChart({ data, periodLabel }: SalesTrendChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // If no data
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-borderline shadow-2xs flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-canvas text-mutedtext flex items-center justify-center mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-heading text-sm">Belum Ada Data Transaksi</h4>
        <p className="text-xs text-mutedtext mt-1 max-w-xs">
          Diagram tren akan tampil otomatis setelah ada transaksi penjualan yang tercatat pada rentang waktu ini.
        </p>
      </div>
    );
  }

  // Calculate scales
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100000);
  // Add a 15% headroom to max scale for clean visuals
  const chartMax = Math.ceil((maxRevenue * 1.15) / 50000) * 50000;

  // Chart coordinate constants
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: chartMax * pct,
    y: paddingTop + plotHeight * (1 - pct),
  }));

  // X-axis coordinate mapping
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
    const yRevenue = paddingTop + plotHeight * (1 - Math.max(0, d.revenue) / chartMax);
    const yProfit = paddingTop + plotHeight * (1 - Math.max(0, d.grossProfit) / chartMax);
    return { ...d, x, yRevenue, yProfit, index: i };
  });

  // Calculate Bar dimensions
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(Math.max(slotWidth * 0.35, 4), 16);
  const barGap = 3;

  // Build SVG Path for Area Chart
  const revenuePointsStr = points.map((p) => `${p.x},${p.yRevenue}`).join(' ');
  const areaPath = `M ${points[0].x},${paddingTop + plotHeight} L ${revenuePointsStr} L ${points[points.length - 1].x},${paddingTop + plotHeight} Z`;
  const profitPointsStr = points.map((p) => `${p.x},${p.yProfit}`).join(' ');

  // Peak revenue day
  const peakDay = [...data].sort((a, b) => b.revenue - a.revenue)[0];
  const totalRev = data.reduce((acc, d) => acc + d.revenue, 0);
  const avgRev = Math.round(totalRev / data.length);

  // Label skip interval for X axis (prevent overlapping if > 10 points)
  const labelInterval = data.length > 20 ? 5 : data.length > 10 ? 3 : 1;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[26px] border border-[#F0F0F0] shadow-xs space-y-4 sm:space-y-5">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-[#18181B] text-sm sm:text-base tracking-tight">
              Tren Omzet & Laba Penjualan
            </h3>
            <span className="text-[11px] font-bold text-[#71717A] bg-[#FAFAFA] px-2.5 py-0.5 rounded-full border border-[#F0F0F0]">
              {data.length} Hari
            </span>
          </div>
          <p className="text-xs text-[#71717A] mt-0.5">
            Grafik komparasi realisasi pendapatan harian vs laba kotor toko
          </p>
        </div>

        {/* Legend & View Switcher */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]" />
              <span className="text-heading text-[11px]">Omzet (Orange)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18181B]" />
              <span className="text-heading text-[11px]">Laba Kotor (Hitam)</span>
            </div>
          </div>

          <div className="flex items-center p-0.5 bg-canvas rounded-xl border border-borderline">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-[#FF6B00] shadow-2xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
              title="Tampilan Diagram Batang"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-[#FF6B00] shadow-2xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
              title="Tampilan Grafik Garis / Area"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Garis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Chart Container */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-64 overflow-visible"
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#18181B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="#ECEEF1"
                strokeDasharray={i === 0 ? 'none' : '3 3'}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                className="text-[10px] fill-[#8F95B2] font-mono font-medium"
              >
                {formatCompactRupiah(tick.val)}
              </text>
            </g>
          ))}

          {/* AREA / LINE CHART MODE */}
          {chartType === 'area' && (
            <>
              {/* Revenue Area Fill & Stroke */}
              <path d={areaPath} fill="url(#revenueGradient)" />
              <polyline
                fill="none"
                stroke="#FF6B00"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={revenuePointsStr}
              />

              {/* Profit Line Stroke */}
              <polyline
                fill="none"
                stroke="#18181B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 2"
                points={profitPointsStr}
              />

              {/* Data points */}
              {points.map((p, idx) => (
                <g key={idx} className="cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.yRevenue}
                    r={hoveredIdx === idx ? 5 : 3}
                    fill={hoveredIdx === idx ? '#FF6B00' : '#FFFFFF'}
                    stroke="#FF6B00"
                    strokeWidth="2"
                    className="transition-all"
                  />
                  <circle
                    cx={p.x}
                    cy={p.yProfit}
                    r={hoveredIdx === idx ? 4 : 2}
                    fill="#18181B"
                  />
                </g>
              ))}
            </>
          )}

          {/* BAR CHART MODE */}
          {chartType === 'bar' && (
            <g>
              {points.map((p, idx) => {
                const centerX =
                  data.length === 1
                    ? paddingLeft + plotWidth / 2
                    : paddingLeft + (idx / (data.length - 1)) * plotWidth;

                const baseLine = paddingTop + plotHeight;
                const revHeight = Math.max(0, baseLine - p.yRevenue);
                const profitHeight = Math.max(0, baseLine - p.yProfit);

                const revX = centerX - barWidth - barGap / 2;
                const profitX = centerX + barGap / 2;

                const isHovered = hoveredIdx === idx;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer transition-opacity"
                    opacity={hoveredIdx === null || isHovered ? 1 : 0.6}
                  >
                    {/* Hover column background highlight */}
                    {isHovered && (
                      <rect
                        x={centerX - slotWidth / 2}
                        y={paddingTop}
                        width={slotWidth}
                        height={plotHeight}
                        fill="#F8F9FA"
                        rx="6"
                      />
                    )}

                    {/* Revenue Bar (Orange) */}
                    <rect
                      x={revX}
                      y={p.yRevenue}
                      width={barWidth}
                      height={Math.max(revHeight, 2)}
                      rx="3"
                      fill={isHovered ? '#EA580C' : '#FF6B00'}
                    />

                    {/* Gross Profit Bar (Hitam) */}
                    <rect
                      x={profitX}
                      y={p.yProfit}
                      width={barWidth}
                      height={Math.max(profitHeight, 2)}
                      rx="3"
                      fill={isHovered ? '#000000' : '#18181B'}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Interactive Transparent Hover Overlay Columns (Works for both Area & Bar) */}
          {points.map((p, idx) => {
            const centerX =
              data.length === 1
                ? paddingLeft + plotWidth / 2
                : paddingLeft + (idx / (data.length - 1)) * plotWidth;
            const colWidth = plotWidth / data.length;

            return (
              <rect
                key={idx}
                x={centerX - colWidth / 2}
                y={paddingTop}
                width={colWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* X-Axis Date Labels */}
          {points.map((p, idx) => {
            if (idx % labelInterval !== 0 && idx !== points.length - 1) return null;
            const centerX =
              data.length === 1
                ? paddingLeft + plotWidth / 2
                : paddingLeft + (idx / (data.length - 1)) * plotWidth;

            return (
              <text
                key={idx}
                x={centerX}
                y={svgHeight - 10}
                textAnchor="middle"
                className={`text-[10px] font-medium ${
                  hoveredIdx === idx ? 'fill-heading font-bold' : 'fill-mutedtext'
                }`}
              >
                {formatDateShort(p.date)}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {activePoint && (
          <div
            className="absolute z-20 pointer-events-none bg-heading text-white p-2.5 rounded-xl shadow-lg border border-white/10 text-xs min-w-[170px] space-y-1 transition-all"
            style={{
              left: `${Math.min(
                Math.max((activePoint.x / svgWidth) * 100, 15),
                85
              )}%`,
              top: '12%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-[11px] text-white/90 border-b border-white/10 pb-1 flex items-center justify-between">
              <span>{activePoint.date}</span>
              <Calendar className="w-3 h-3 text-coral-400" />
            </div>
            <div className="flex justify-between gap-3 text-[11px] pt-0.5">
              <span className="text-white/70">Omzet Kotor:</span>
              <span className="font-black text-coral-400 tabular-nums">
                {formatRupiah(activePoint.revenue)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-[11px]">
              <span className="text-white/70">Laba Kotor:</span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {formatRupiah(activePoint.grossProfit)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-[10px] border-t border-white/10 pt-1 text-white/60">
              <span>HPP Bahan Baku:</span>
              <span className="tabular-nums font-mono">{formatRupiah(activePoint.hpp)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer Pills */}
      <div className="pt-3 border-t border-borderline flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-mutedtext">
          <TrendingUp className="w-3.5 h-3.5 text-coral-500" />
          <span>
            Rata-rata Omzet: <strong className="text-heading">{formatRupiah(avgRev)}/hari</strong>
          </span>
        </div>
        {peakDay && (
          <div className="flex items-center gap-1.5 text-mutedtext">
            <span>
              Puncak Penjualan:{' '}
              <strong className="text-coral-500">
                {formatRupiah(peakDay.revenue)}
              </strong>{' '}
              ({formatDateShort(peakDay.date)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
