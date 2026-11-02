'use client';

import React, { useState } from 'react';
import { formatRupiah, formatNumber } from '@/lib/format';
import { CreditCard, Banknote, QrCode, ArrowRightLeft } from 'lucide-react';

export interface PaymentBreakdownItem {
  method: string;
  count: number;
  total: number;
}

interface PaymentMethodDonutChartProps {
  data: PaymentBreakdownItem[];
  totalRevenue: number;
}

const PAYMENT_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  cash: { label: 'Tunai (Cash)', color: '#FF6B00', icon: Banknote },
  qris: { label: 'QRIS', color: '#18181B', icon: QrCode },
  debit: { label: 'Kartu Debit', color: '#EA580C', icon: CreditCard },
  transfer: { label: 'Transfer Bank', color: '#71717A', icon: ArrowRightLeft },
};

export function PaymentMethodDonutChart({
  data,
  totalRevenue,
}: PaymentMethodDonutChartProps) {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const grandTotal = totalRevenue > 0 ? totalRevenue : data.reduce((acc, d) => acc + d.total, 0);
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);

  // Geometry for SVG Donut (Refined modern compact proportion)
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate slice angles & strokeDasharrays
  let accumulatedPercent = 0;
  const slices = data.map((item) => {
    const ratio = grandTotal > 0 ? item.total / grandTotal : 0;
    const strokeDasharray = `${ratio * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += ratio;

    const meta = PAYMENT_META[item.method] || {
      label: item.method.toUpperCase(),
      color: '#8F95B2',
      icon: CreditCard,
    };

    return {
      ...item,
      ratio,
      percent: (ratio * 100).toFixed(1),
      strokeDasharray,
      strokeDashoffset,
      meta,
    };
  });

  const activeSlice = slices.find((s) => s.method === hoveredMethod);

  return (
    <div className="bg-white p-6 rounded-[26px] border border-[#F0F0F0] shadow-xs space-y-5">
      <div>
        <h3 className="font-extrabold text-[#18181B] text-sm sm:text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#FF6B00]" />
          <span>Komposisi Metode Bayar</span>
        </h3>
        <p className="text-xs text-[#71717A] mt-0.5">
          Distribusi nilai transaksi kasir per kanal pembayaran
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="py-12 text-center text-xs text-mutedtext">
          Belum ada transaksi pada periode ini.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          {/* Donut Chart SVG */}
          <div className="relative flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
            >
              {/* Background ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke="#F8F9FA"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slices.map((slice) => {
                const isHovered = hoveredMethod === slice.method;
                return (
                  <circle
                    key={slice.method}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={slice.meta.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                    onMouseEnter={() => setHoveredMethod(slice.method)}
                    onMouseLeave={() => setHoveredMethod(null)}
                    className="cursor-pointer transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
              <span className="text-[10px] font-bold text-mutedtext uppercase tracking-wider">
                {activeSlice ? activeSlice.meta.label : 'Total Struk'}
              </span>
              <span className="text-base font-black text-heading leading-tight tabular-nums">
                {activeSlice
                  ? `${activeSlice.percent}%`
                  : `${formatNumber(totalCount)}`}
              </span>
              <span className="text-[10px] text-mutedtext font-medium mt-0.5 truncate max-w-[100px]">
                {activeSlice ? formatRupiah(activeSlice.total) : 'Transaksi'}
              </span>
            </div>
          </div>

          {/* Legend Items Grid */}
          <div className="w-full space-y-2">
            {slices.map((slice) => {
              const Icon = slice.meta.icon;
              const isHovered = hoveredMethod === slice.method;
              return (
                <div
                  key={slice.method}
                  onMouseEnter={() => setHoveredMethod(slice.method)}
                  onMouseLeave={() => setHoveredMethod(null)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isHovered
                      ? 'bg-canvas border-coral-200 shadow-2xs'
                      : 'bg-white border-borderline hover:bg-canvas/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: slice.meta.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-heading truncate">
                        {slice.meta.label}
                      </div>
                      <div className="text-[11px] text-mutedtext">
                        {slice.count} transaksi &bull; {slice.percent}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-heading tabular-nums block">
                      {formatRupiah(slice.total)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
