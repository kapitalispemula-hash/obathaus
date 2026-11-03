'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';

export interface DateRangeCalendarPickerProps {
  startDate: string; // YYYY-MM-DD or empty
  endDate: string; // YYYY-MM-DD or empty
  onChange: (start: string, end: string, label?: string) => void;
  className?: string;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function padZero(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function formatIndoDate(isoStr: string): string {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return isoStr;
  const monthName = MONTH_NAMES[m - 1]?.slice(0, 3) || '';
  return `${d} ${monthName} ${y}`;
}

export function DateRangeCalendarPicker({
  startDate,
  endDate,
  onChange,
  className = '',
  align = 'right',
}: DateRangeCalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month currently viewed in calendar (defaults to startDate or today)
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (startDate) {
      const [y, m] = startDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  // Temporary selection while modal is open
  const [tempStart, setTempStart] = useState<string>(startDate || '');
  const [tempEnd, setTempEnd] = useState<string>(endDate || '');
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync temp state when props change
  useEffect(() => {
    setTempStart(startDate || '');
    setTempEnd(endDate || '');
  }, [startDate, endDate]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Generate calendar grid cells (Monday-based)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startingDayIndex = (firstDay.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const totalDays = lastDay.getDate();

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const todayStr = toISODate(new Date());

    // Previous month padding
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      days.push({
        dateStr: toISODate(prevDate),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: toISODate(prevDate) === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(currentYear, currentMonth, i);
      const iso = toISODate(curDate);
      days.push({
        dateStr: iso,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: iso === todayStr,
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      days.push({
        dateStr: toISODate(nextDate),
        dayNumber: i,
        isCurrentMonth: false,
        isToday: toISODate(nextDate) === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Handle cell click
  const handleDateClick = (dateStr: string) => {
    // If no start date, or both start and end are already selected:
    // start fresh with this date
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
      return;
    }

    // If start is selected and end is empty:
    if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        // If clicked date is before start date, make it the new start date
        setTempStart(dateStr);
        setTempEnd('');
      } else {
        // Clicked date is >= start date -> complete the range
        setTempEnd(dateStr);
      }
    }
  };

  // Presets
  const applyPreset = (presetKey: string) => {
    const today = new Date();
    const todayStr = toISODate(today);

    if (presetKey === 'today') {
      setTempStart(todayStr);
      setTempEnd(todayStr);
      setViewDate(new Date());
    } else if (presetKey === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toISODate(y);
      setTempStart(yStr);
      setTempEnd(yStr);
      setViewDate(y);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setTempStart(toISODate(past));
      setTempEnd(todayStr);
      setViewDate(today);
    } else if (presetKey === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setTempStart(toISODate(past));
      setTempEnd(todayStr);
      setViewDate(today);
    } else if (presetKey === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setTempStart(toISODate(startOfMonth));
      setTempEnd(toISODate(endOfMonth));
      setViewDate(today);
    } else if (presetKey === 'last_month') {
      const startOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLast = new Date(today.getFullYear(), today.getMonth(), 0);
      setTempStart(toISODate(startOfLast));
      setTempEnd(toISODate(endOfLast));
      setViewDate(startOfLast);
    } else if (presetKey === 'all') {
      setTempStart('');
      setTempEnd('');
    }
  };

  // Apply button
  const handleApply = () => {
    const finalStart = tempStart;
    const finalEnd = tempEnd || tempStart; // if only 1 date picked, treat as single date

    let label = 'Semua Periode';
    if (finalStart) {
      if (finalStart === finalEnd) {
        label = formatIndoDate(finalStart);
      } else {
        label = `${formatIndoDate(finalStart)} - ${formatIndoDate(finalEnd)}`;
      }
    }

    onChange(finalStart, finalEnd, label);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempStart('');
    setTempEnd('');
    onChange('', '', 'Semua Periode');
    setIsOpen(false);
  };

  // Button Display Label
  const displayLabel = useMemo(() => {
    if (!startDate && !endDate) return 'Semua Periode (Pilih Tanggal)';
    if (startDate && (!endDate || startDate === endDate)) {
      return formatIndoDate(startDate);
    }
    return `${formatIndoDate(startDate)} - ${formatIndoDate(endDate)}`;
  }, [startDate, endDate]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3.5 py-2 bg-white hover:bg-[#FAFAFA] border border-[#ECEEF1] hover:border-[#D1D5DB] text-[#18181B] rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 shadow-2xs cursor-pointer select-none"
      >
        <CalendarIcon className="w-4 h-4 text-[#FF6B00] shrink-0" />
        <span className="truncate max-w-[220px]">{displayLabel}</span>
        <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-extrabold ml-1">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Popover Calendar Container */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border border-[#ECEEF1] p-5 w-[330px] sm:w-[480px] select-none animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#ECEEF1]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#18181B] uppercase tracking-wider">
                  Filter Rentang Tanggal
                </h4>
                <p className="text-[11px] text-[#71717A]">
                  Klik 1 tanggal atau klik 2 tanggal untuk rentang
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-[#18181B] hover:bg-[#FAFAFA]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Quick Presets Column */}
            <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 sm:w-36 shrink-0 border-b sm:border-b-0 sm:border-r border-[#ECEEF1] sm:pr-3">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '7days', label: '7 Hari Terakhir' },
                { id: '30days', label: '30 Hari Terakhir' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'last_month', label: 'Bulan Lalu' },
                { id: 'all', label: 'Semua Periode' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1.5 text-left text-[11px] font-bold rounded-xl text-[#52525B] hover:text-[#18181B] hover:bg-orange-50/70 hover:text-[#FF6B00] transition-colors shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar Main Grid */}
            <div className="flex-1">
              {/* Month & Year Navigation Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 hover:bg-[#F4F4F5] rounded-xl text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-black text-[#18181B] tracking-tight">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 hover:bg-[#F4F4F5] rounded-xl text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
                  title="Bulan Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Headers (Sen - Min) */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES.map((dn) => (
                  <div
                    key={dn}
                    className="text-[10px] font-extrabold uppercase text-[#A1A1AA] py-1"
                  >
                    {dn}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cd) => {
                  const isStart = tempStart === cd.dateStr;
                  const isEnd = tempEnd === cd.dateStr;
                  const effectiveEnd = tempEnd || (tempStart && hoverDate && hoverDate > tempStart ? hoverDate : '');
                  const isInRange =
                    tempStart &&
                    effectiveEnd &&
                    cd.dateStr > tempStart &&
                    cd.dateStr < effectiveEnd;

                  return (
                    <button
                      key={cd.dateStr}
                      type="button"
                      onClick={() => handleDateClick(cd.dateStr)}
                      onMouseEnter={() => {
                        if (tempStart && !tempEnd) {
                          setHoverDate(cd.dateStr);
                        }
                      }}
                      className={`h-8 text-xs font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer relative ${
                        !cd.isCurrentMonth
                          ? 'text-[#D4D4D8]'
                          : 'text-[#18181B] hover:bg-orange-100/60'
                      } ${
                        isStart || isEnd
                          ? '!bg-[#FF6B00] !text-white shadow-xs font-black z-10 scale-105'
                          : ''
                      } ${isInRange ? '!bg-orange-50 !text-[#FF6B00]' : ''} ${
                        cd.isToday && !isStart && !isEnd
                          ? 'border border-[#FF6B00]/40 text-[#FF6B00]'
                          : ''
                      }`}
                    >
                      {cd.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="mt-4 pt-3.5 border-t border-[#ECEEF1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-[#71717A] leading-tight">
              {tempStart ? (
                <span>
                  Terpilih:{' '}
                  <strong className="text-[#18181B]">
                    {formatIndoDate(tempStart)}
                    {tempEnd && tempEnd !== tempStart
                      ? ` s/d ${formatIndoDate(tempEnd)}`
                      : ''}
                  </strong>
                </span>
              ) : (
                <span className="italic">Belum ada tanggal dipilih</span>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] rounded-xl transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart}
                className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
