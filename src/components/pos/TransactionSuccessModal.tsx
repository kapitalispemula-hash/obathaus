'use client';

import React from 'react';
import { Transaction, StoreSettings } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import { CheckCircle2, Printer, PlusCircle } from 'lucide-react';

interface TransactionSuccessModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onNewOrder: () => void;
  onPrintReceipt: () => void;
  settings?: StoreSettings | null;
}

export function TransactionSuccessModal({
  isOpen,
  transaction,
  onNewOrder,
  onPrintReceipt,
}: TransactionSuccessModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 sm:p-7 text-center space-y-5 animate-scaleIn">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#FF6B00] mb-2">
            Transaksi Berhasil
          </span>
          <h3 className="text-xl font-black text-heading">
            {transaction.invoice_number}
          </h3>
          <p className="text-xs text-mutedtext mt-1">
            Data pesanan dan snapshot HPP telah tercatat atomik ke database.
          </p>
        </div>

        {/* Financial Recap Box */}
        <div className="p-4 rounded-xl bg-canvas border border-borderline space-y-2 text-xs">
          <div className="flex justify-between text-mutedtext">
            <span>Total Tagihan:</span>
            <span className="font-black text-[#FF6B00] text-sm tabular-nums">
              {formatRupiah(transaction.grand_total)}
            </span>
          </div>

          <div className="flex justify-between text-mutedtext">
            <span>Metode Bayar:</span>
            <span className="font-bold uppercase text-heading">
              {transaction.payment_method}
            </span>
          </div>

          <div className="flex justify-between text-mutedtext">
            <span>Uang Diterima:</span>
            <span className="font-semibold text-heading tabular-nums">
              {formatRupiah(transaction.amount_received)}
            </span>
          </div>

          {transaction.payment_method === 'cash' && (
            <div className="pt-2 border-t border-borderline flex justify-between items-baseline font-bold text-emerald-700">
              <span className="text-xs">Uang Kembalian:</span>
              <span className="text-base font-extrabold tabular-nums">
                {formatRupiah(transaction.change_amount)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={onPrintReceipt}
            className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk Pembayaran</span>
          </button>

          <button
            onClick={onNewOrder}
            className="w-full py-2.5 px-4 bg-canvas hover:bg-slate-200/60 text-heading font-bold text-sm rounded-xl border border-borderline flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-mutedtext" />
            <span>Mulai Transaksi Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
