'use client';

import React, { useState, useEffect } from 'react';
import { CashierShift, ShiftCashMovement } from '@/types/database';
import { dbService } from '@/lib/services/database';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { formatRupiah, formatDateTime } from '@/lib/format';
import {
  Clock,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  AlertTriangle,
  X,
  Printer,
  FileText,
  Lock,
  Unlock,
  Coins,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Equal,
} from 'lucide-react';

interface ShiftControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  onShiftUpdated: () => void;
  initialTab?: 'open' | 'movement' | 'close';
}

export function ShiftControlModal({
  isOpen,
  onClose,
  activeShift,
  onShiftUpdated,
  initialTab = 'movement',
}: ShiftControlModalProps) {
  const { user } = useAuth();
  const { activeOutlet, availableOutlets } = useOutlet();
  const [tab, setTab] = useState<'open' | 'movement' | 'close' | 'receipt'>(
    !activeShift ? 'open' : initialTab
  );

  // Open Shift Form
  const [openingCash, setOpeningCash] = useState<number>(200000);
  const [openNotes, setOpenNotes] = useState('Modal awal uang pecahan kasir');
  const [isOpening, setIsOpening] = useState(false);

  // Cash Movement Form
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [movementAmount, setMovementAmount] = useState<number>(25000);
  const [movementReason, setMovementReason] = useState('Beli es batu kristal higienis (darurat)');
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  // Close Shift Form
  const [actualCash, setActualCash] = useState<number>(activeShift?.closing_cash_expected || 0);
  const [closeNotes, setCloseNotes] = useState('Tutup shift operasional');
  const [isClosing, setIsClosing] = useState(false);
  const [closedShiftResult, setClosedShiftResult] = useState<CashierShift | null>(null);

  // Paper size for shift report print
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');

  useEffect(() => {
    if (!activeShift) {
      setTab('open');
    } else {
      setTab(initialTab);
      setActualCash(activeShift.closing_cash_expected || activeShift.opening_cash);
    }
  }, [activeShift, initialTab, isOpen]);

  if (!isOpen) return null;

  // Handlers
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetOutletId = activeOutlet?.id || user.primary_outlet_id || availableOutlets[0]?.id || '';
    if (!targetOutletId) {
      alert('Cabang aktif belum terpilih. Silakan pilih cabang di menu POS terlebih dahulu.');
      return;
    }
    try {
      setIsOpening(true);
      await dbService.openShift({
        cashier_id: user.id,
        outlet_id: targetOutletId,
        opening_cash: openingCash,
        notes: openNotes,
      });
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      alert(`Gagal membuka shift: ${err.message || err}`);
    } finally {
      setIsOpening(false);
    }
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift || !user) return;
    try {
      setIsSavingMovement(true);
      await dbService.recordShiftCashMovement({
        shift_id: activeShift.id,
        type: movementType,
        amount: movementAmount,
        reason: movementReason,
        created_by: user.id,
      });
      onShiftUpdated();
      alert(`${movementType === 'cash_in' ? 'Kas Masuk' : 'Kas Keluar'} berhasil dicatat.`);
      setMovementAmount(0);
      setMovementReason('');
    } catch (err: any) {
      alert(`Gagal mencatat mutasi kas: ${err.message || err}`);
    } finally {
      setIsSavingMovement(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    try {
      setIsClosing(true);
      const closed = await dbService.closeShift(activeShift.id, actualCash, closeNotes);
      setClosedShiftResult(closed);
      onShiftUpdated();
      setTab('receipt');
    } catch (err: any) {
      alert(`Gagal menutup shift: ${err.message || err}`);
    } finally {
      setIsClosing(false);
    }
  };

  const expectedCash = activeShift
    ? activeShift.opening_cash +
      activeShift.total_cash_sales +
      activeShift.total_cash_in -
      activeShift.total_cash_out
    : 0;
  const liveDiff = actualCash - expectedCash;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ECEEF1] flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Manajemen Shift & Kas Kasir</h3>
              <p className="text-xs text-slate-500">
                {activeShift
                  ? `Shift Aktif: ${activeShift.shift_number}`
                  : 'Sesi Kasir Belum Dibuka'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation if active shift */}
        {activeShift && tab !== 'receipt' && (
          <div className="px-6 pt-3 pb-0 border-b border-[#ECEEF1] flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setTab('movement')}
              className={`pb-3 px-2 border-b-2 transition-all cursor-pointer ${
                tab === 'movement'
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Catat Kas Masuk / Keluar
            </button>
            <button
              onClick={() => setTab('close')}
              className={`pb-3 px-2 border-b-2 transition-all cursor-pointer ${
                tab === 'close'
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Tutup Shift Kasir (End of Shift)
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* 1. OPEN SHIFT TAB */}
          {tab === 'open' && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl text-slate-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-sm text-[#FF6B00]">
                  <Unlock className="w-4 h-4" />
                  <span>Buka Shift Baru Kasir</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Kasir wajib membuka sesi kerja dengan modal kas awal sebelum dapat melayani transaksi penjualan di kasir POS.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Modal Kas Awal di Laci (Float) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={openingCash}
                    onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 200000"
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100000, 200000, 300000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpeningCash(amt)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Buka Shift
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Catatan kondisi laci atau serah terima shift..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isOpening}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isOpening ? 'Membuka...' : 'Buka Shift Sekarang'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. CASH MOVEMENT TAB */}
          {tab === 'movement' && activeShift && (
            <form onSubmit={handleSaveMovement} className="space-y-4">
              {/* Summary Pill */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-slate-500 block">Modal Awal:</span>
                  <strong className="text-slate-900">{formatRupiah(activeShift.opening_cash)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Kas Masuk:</span>
                  <strong className="text-emerald-600">+{formatRupiah(activeShift.total_cash_in)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Kas Keluar:</span>
                  <strong className="text-rose-600">-{formatRupiah(activeShift.total_cash_out)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Jenis Mutasi Kas
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('cash_out');
                      setMovementReason('Beli es batu kristal higienis (darurat)');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      movementType === 'cash_out'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-800 ring-2 ring-rose-500/20 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <div>
                      <div>Kas Keluar (Petty Cash)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Pengeluaran kas kecil</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('cash_in');
                      setMovementReason('Tambah uang modal pecahan kecil kembalian');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      movementType === 'cash_in'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>Kas Masuk (Setoran)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Penambahan uang kas laci</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nominal Uang (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-1 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Keperluan / Alasan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Contoh: Beli air galon isi ulang, beli sedotan tambahan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSavingMovement}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isSavingMovement ? 'Menyimpan...' : 'Simpan Mutasi Kas'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. CLOSE SHIFT TAB */}
          {tab === 'close' && activeShift && (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 block uppercase tracking-wider">
                  Kalkulasi Kas Seharusnya di Laci:
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">1. Modal Awal Kasir:</span>
                    <strong className="text-slate-800">{formatRupiah(activeShift.opening_cash)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">2. Penjualan Tunai (Cash Sales):</span>
                    <strong className="text-emerald-700">+{formatRupiah(activeShift.total_cash_sales)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">3. Kas Masuk Operasional:</span>
                    <strong className="text-emerald-700">+{formatRupiah(activeShift.total_cash_in)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">4. Kas Keluar (Petty Cash):</span>
                    <strong className="text-rose-700">-{formatRupiah(activeShift.total_cash_out)}</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                    <span className="font-bold text-slate-900">Total Kas Seharusnya:</span>
                    <strong className="text-dark font-black text-base">{formatRupiah(expectedCash)}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Hitung Uang Fisik Aktual di Laci (Blind Cash Count) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={0}
                    required
                    value={actualCash}
                    onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                    placeholder="Hitung seluruh uang kertas & koin di laci..."
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* Live Difference Badge */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  liveDiff === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : liveDiff < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {liveDiff === 0 ? (
                    <Equal className="w-5 h-5 text-emerald-600" />
                  ) : liveDiff < 0 ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <Coins className="w-5 h-5 text-blue-600" />
                  )}
                  <div>
                    <div className="font-bold">
                      {liveDiff === 0
                        ? '100% Kas Fisik Cocok Sempurna'
                        : liveDiff < 0
                        ? 'Selisih Kurang (Shortage)'
                        : 'Selisih Lebih (Surplus)'}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {liveDiff === 0
                        ? 'Uang fisik sama persis dengan sistem'
                        : liveDiff < 0
                        ? 'Uang fisik di laci kurang dari catatan sistem'
                        : 'Uang fisik di laci melebihi catatan sistem'}
                    </div>
                  </div>
                </div>
                <strong className="text-sm font-black">
                  {liveDiff > 0 ? '+' : ''}
                  {formatRupiah(liveDiff)}
                </strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Rekonsiliasi Tutup Shift
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Keterangan jika terdapat selisih uang..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTab('movement')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isClosing}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isClosing ? 'Menutup Shift...' : 'Tutup Shift & Rekonsiliasi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. RECEIPT REPORT TAB (X/Z REPORT) */}
          {tab === 'receipt' && closedShiftResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold text-slate-800 text-sm">
                  Struk Laporan Tutup Shift Kasir (Z-Report)
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      onClick={() => setPaperSize('58mm')}
                      className={`px-2 py-0.5 rounded-md ${
                        paperSize === '58mm' ? 'bg-white text-dark shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      58mm
                    </button>
                    <button
                      onClick={() => setPaperSize('80mm')}
                      className={`px-2 py-0.5 rounded-md ${
                        paperSize === '80mm' ? 'bg-white text-dark shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      80mm
                    </button>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 px-3 py-1 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>

              {/* Thermal Paper Simulation */}
              <div
                className={`mx-auto bg-white p-5 border border-dashed border-slate-300 rounded-xl shadow-xs font-mono text-[11px] text-slate-800 leading-relaxed ${
                  paperSize === '58mm' ? 'max-w-[280px]' : 'max-w-[340px]'
                }`}
              >
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <div className="font-black text-sm uppercase">OBAT HAUS</div>
                  <div className="text-[10px] text-slate-500">{closedShiftResult.outlet?.name || 'Cabang Hasanuddin'}</div>
                  <div className="text-[10px] text-slate-400">LAPORAN TUTUP SHIFT (Z-REPORT)</div>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                  <div>No. Shift: {closedShiftResult.shift_number}</div>
                  <div>Kasir    : {closedShiftResult.cashier?.full_name || 'Budi Santoso'}</div>
                  <div>Buka     : {formatDateTime(closedShiftResult.opened_at)}</div>
                  <div>Tutup    : {closedShiftResult.closed_at ? formatDateTime(closedShiftResult.closed_at) : '-'}</div>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Kas Awal Modal:</span>
                    <span>{formatRupiah(closedShiftResult.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Penjualan Tunai:</span>
                    <span>+{formatRupiah(closedShiftResult.total_cash_sales)}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span>Non-Tunai (QRIS/Debit):</span>
                    <span>{formatRupiah(closedShiftResult.total_non_cash_sales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kas Masuk:</span>
                    <span>+{formatRupiah(closedShiftResult.total_cash_in)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Kas Keluar:</span>
                    <span>-{formatRupiah(closedShiftResult.total_cash_out)}</span>
                  </div>
                </div>

                <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Kas Seharusnya:</span>
                    <span>{formatRupiah(closedShiftResult.closing_cash_expected || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Fisik Laci:</span>
                    <span>{formatRupiah(closedShiftResult.closing_cash_actual || 0)}</span>
                  </div>
                  <div className="flex justify-between font-black pt-1 border-t border-slate-200">
                    <span>Selisih Kas:</span>
                    <span className={closedShiftResult.cash_difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {closedShiftResult.cash_difference && closedShiftResult.cash_difference > 0 ? '+' : ''}
                      {formatRupiah(closedShiftResult.cash_difference || 0)}
                    </span>
                  </div>
                </div>

                <div className="text-center pt-3 text-[9px] text-slate-400">
                  --- SHIFT RESMI BERAKHIR ---
                  <br />
                  Terima kasih atas kerja keras Anda!
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
