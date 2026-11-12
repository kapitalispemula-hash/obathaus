'use client';

import React, { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { dbService } from '@/lib/services/database';
import { formatRupiah } from '@/lib/format';
import { PaymentMethod, Transaction } from '@/types/database';
import {
  Banknote,
  QrCode,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
  initialPaymentMethod?: PaymentMethod;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  initialPaymentMethod = 'cash',
}: CheckoutModalProps) {
  const { items, discountTotal, grandTotal, orderNotes, clearCart } = useCart();
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [amountReceived, setAmountReceived] = useState<number>(grandTotal);
  const [customCashInput, setCustomCashInput] = useState<string>(String(grandTotal));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string>('');

  React.useEffect(() => {
    if (isOpen) {
      if (initialPaymentMethod) setPaymentMethod(initialPaymentMethod);
      setAmountReceived(grandTotal);
      setCustomCashInput(String(grandTotal));
      setErrorMsg(null);
      idempotencyKeyRef.current = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }, [isOpen, initialPaymentMethod, grandTotal]);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, amountReceived - grandTotal);
  const isCashInsufficient = paymentMethod === 'cash' && amountReceived < grandTotal;

  // Pre-calculated quick denominations
  const quickCashOptions = [
    grandTotal, // Uang Pas
    Math.ceil(grandTotal / 50000) * 50000,
    Math.ceil(grandTotal / 100000) * 100000,
    Math.ceil(grandTotal / 50000) * 50000 + 50000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal);

  const handleCashChange = (valStr: string) => {
    setCustomCashInput(valStr);
    const num = Number(valStr.replace(/\D/g, ''));
    setAmountReceived(num || 0);
  };

  const handleSelectQuickCash = (val: number) => {
    setAmountReceived(val);
    setCustomCashInput(String(val));
  };

  const handleExecuteCheckout = async () => {
    if (!user) {
      setErrorMsg('Pengguna kasir belum login.');
      return;
    }

    if (paymentMethod === 'cash' && amountReceived < grandTotal) {
      setErrorMsg('Nominal uang tunai kurang dari total tagihan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Idempotency key per PRD CHECK-007 (stable across retries/double-tap in the same modal session)
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      const idempotencyKey = idempotencyKeyRef.current;

      const transaction = await dbService.processCheckout({
        cashier_id: user.id,
        outlet_id: activeOutlet?.id,
        idempotency_key: idempotencyKey,
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'cash' ? amountReceived : grandTotal,
        discount_total: discountTotal,
        notes: orderNotes,
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      });

      // Clear cart on atomic success
      clearCart();
      setIsSubmitting(false);
      onSuccess(transaction);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Gagal memproses transaksi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shadow-sm shadow-orange-500/20">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-heading text-base">Pembayaran & Checkout</h3>
              <p className="text-xs text-mutedtext">Pilih metode pembayaran pesanan kasir</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-white">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
              {errorMsg.toLowerCase().includes('tidak ditemukan') ||
              errorMsg.toLowerCase().includes('habis') ||
              errorMsg.toLowerCase().includes('tidak tersedia') ? (
                <button
                  type="button"
                  onClick={() => {
                    clearCart();
                    onClose();
                  }}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Kosongkan Keranjang
                </button>
              ) : null}
            </div>
          )}

          {/* Grand Total Highlight */}
          <div className="p-5 rounded-2xl bg-canvas border border-borderline flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-mutedtext uppercase tracking-wider">
                Total Tagihan Transaksi
              </p>
              <p className="text-2xl sm:text-3xl font-black text-[#FF6B00] tabular-nums mt-0.5">
                {formatRupiah(grandTotal)}
              </p>
            </div>
            <div className="text-right text-xs text-mutedtext space-y-0.5">
              <p className="font-semibold text-heading">{items.length} jenis produk</p>
              <p>{orderNotes ? `Catatan: ${orderNotes}` : 'Tanpa catatan'}</p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-mutedtext uppercase tracking-wider mb-2.5">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'cash', label: 'Tunai', icon: Banknote },
                { id: 'qris', label: 'QRIS', icon: QrCode },
                { id: 'debit', label: 'Kartu Debit', icon: CreditCard },
                { id: 'transfer', label: 'Transfer', icon: Building2 },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as PaymentMethod);
                      if (m.id !== 'cash') {
                        setAmountReceived(grandTotal);
                        setCustomCashInput(String(grandTotal));
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-md shadow-orange-500/20'
                        : 'bg-white text-heading border-borderline hover:bg-canvas hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional Method Screens */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4 p-4 bg-canvas rounded-2xl border border-borderline">
              <div>
                <label className="block text-xs font-bold text-heading mb-1.5">
                  Nominal Uang Diterima dari Pelanggan
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-mutedtext font-bold text-sm">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={customCashInput}
                    onChange={(e) => handleCashChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-borderline rounded-xl font-bold text-heading text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-mutedtext">Pilihan Cepat:</span>
                <div className="flex flex-wrap gap-2">
                  {quickCashOptions.map((opt, i) => (
                    <button
                      key={opt + '_' + i}
                      type="button"
                      onClick={() => handleSelectQuickCash(opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums ${
                        amountReceived === opt
                          ? 'bg-heading text-white'
                          : 'bg-white border border-borderline text-heading hover:bg-slate-100'
                      }`}
                    >
                      {opt === grandTotal ? 'Uang Pas' : formatRupiah(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculation Box */}
              <div
                className={`p-3.5 rounded-xl flex items-center justify-between text-sm font-bold border ${
                  isCashInsufficient
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <span>
                  {isCashInsufficient ? 'Uang Masih Kurang:' : 'Kembalian Pelanggan:'}
                </span>
                <span className="text-base sm:text-lg tabular-nums">
                  {isCashInsufficient
                    ? formatRupiah(grandTotal - amountReceived)
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && (
            <div className="p-6 bg-canvas rounded-2xl border border-borderline text-center space-y-3">
              <div className="inline-block p-4 bg-white rounded-2xl border border-borderline shadow-sm">
                <div className="w-36 h-36 bg-heading rounded-xl p-2 flex flex-col items-center justify-between text-white relative">
                  <div className="text-[9px] tracking-widest font-mono">QRIS STANDAR POS</div>
                  <div className="w-20 h-20 bg-white p-1 rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-heading" />
                  </div>
                  <div className="text-[10px] font-bold text-[#FF6B00] tabular-nums">
                    {formatRupiah(grandTotal)}
                  </div>
                </div>
              </div>
              <p className="text-xs text-mutedtext font-medium">
                Pindai kode QRIS di atas dengan aplikasi mobile banking atau e-wallet pelanggan.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap menerima pembayaran</span>
              </div>
            </div>
          )}

          {paymentMethod === 'debit' && (
            <div className="p-6 bg-canvas rounded-2xl border border-borderline text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center mx-auto">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-heading text-sm">Pembayaran Kartu Debit / EDC</h4>
                <p className="text-xs text-mutedtext mt-0.5">
                  Gesek atau masukkan kartu debit pelanggan pada mesin EDC kasir.
                </p>
              </div>
              <p className="text-xs font-bold text-[#FF6B00] tabular-nums">
                Total Tagihan: {formatRupiah(grandTotal)}
              </p>
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="p-6 bg-canvas rounded-2xl border border-borderline text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center mx-auto">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-heading text-sm">Transfer Bank Langsung</h4>
                <p className="text-xs text-mutedtext mt-1">
                  BCA: <strong className="text-heading">823-9018-299</strong> a.n. Cafe Antigravity
                </p>
                <p className="text-xs text-mutedtext">
                  Mandiri: <strong className="text-heading">152-00-1928374-1</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-borderline bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-borderline text-mutedtext hover:text-heading text-sm font-bold hover:bg-canvas transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteCheckout}
            disabled={isSubmitting || isCashInsufficient}
            className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan Transaksi...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Konfirmasi Pembayaran ({formatRupiah(grandTotal)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
