'use client';

import React, { useState } from 'react';
import { Transaction, StoreSettings } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  settings?: StoreSettings | null;
}

export function ReceiptModal({ isOpen, onClose, transaction, settings }: ReceiptModalProps) {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(
    settings?.receipt_paper_size || '58mm'
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const outlet = transaction.outlet;
  const storeName = outlet?.name || settings?.store_name || 'Obat Haus';
  const address = outlet?.address || settings?.address || 'Makassar';
  const phone = outlet?.phone || settings?.phone || '0811-4401-001';
  const header = outlet?.receipt_header || settings?.receipt_header || 'Selamat Datang di Obat Haus';
  const footer =
    outlet?.receipt_footer ||
    settings?.receipt_footer ||
    'Terima kasih atas kunjungan Anda!\nFollow Instagram: @obathaus';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-borderline flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-heading text-sm">Struk Pembayaran Pelanggan</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Switcher */}
            <div className="flex items-center bg-canvas p-0.5 rounded-lg border border-borderline text-xs font-semibold">
              <button
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '58mm' ? 'bg-white text-heading shadow-xs font-bold' : 'text-mutedtext'
                }`}
              >
                58 mm
              </button>
              <button
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperSize === '80mm' ? 'bg-white text-heading shadow-xs font-bold' : 'text-mutedtext'
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Preview Area (Monochrome Thermal Styling) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-canvas flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white p-5 shadow-sm border border-borderline text-heading font-mono text-xs leading-tight transition-all rounded-lg ${
              paperSize === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            {/* Header Store Info */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400 flex flex-col items-center">
              {settings?.logo_url && (
                <img
                  src={settings.logo_url}
                  alt={storeName}
                  className="w-12 h-12 object-contain mb-1 rounded-md"
                />
              )}
              <div className="font-black text-sm uppercase tracking-wider">{storeName}</div>
              <div className="text-[11px] text-slate-600">{address}</div>
              <div className="text-[11px] text-slate-600">Telp: {phone}</div>
              <div className="text-[10px] italic text-slate-500 pt-1">{header}</div>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>No. Invoice:</span>
                <span className="font-bold">{transaction.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDateTime(transaction.created_at, true, 'Asia/Makassar')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashier?.full_name || 'Kasir Toko'}</span>
              </div>
              {transaction.notes && (
                <div className="flex justify-between">
                  <span>Catatan:</span>
                  <span className="italic">{transaction.notes}</span>
                </div>
              )}
            </div>

            {/* Item List */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
              {(transaction.items || []).map((item, idx) => (
                <div key={item.id || idx} className="space-y-0.5">
                  <div className="font-bold">{item.product_name}</div>
                  <div className="flex justify-between text-[11px]">
                    <span>
                      {item.quantity} x {formatRupiah(item.unit_price)}
                    </span>
                    <span className="font-bold tabular-nums">{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.discount_allocated > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Diskon:</span>
                      <span className="tabular-nums">-{formatRupiah(item.discount_allocated)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="tabular-nums">{formatRupiah(transaction.subtotal)}</span>
              </div>

              {transaction.discount_total > 0 && (
                <div className="flex justify-between">
                  <span>Diskon:</span>
                  <span className="tabular-nums">-{formatRupiah(transaction.discount_total)}</span>
                </div>
              )}

              {transaction.tax_total > 0 && (
                <div className="flex justify-between">
                  <span>Pajak (PPN):</span>
                  <span className="tabular-nums">{formatRupiah(transaction.tax_total)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatRupiah(transaction.grand_total)}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span>Metode Bayar:</span>
                <span className="uppercase font-semibold">{transaction.payment_method}</span>
              </div>

              <div className="flex justify-between">
                <span>Bayar:</span>
                <span className="tabular-nums">{formatRupiah(transaction.amount_received)}</span>
              </div>

              <div className="flex justify-between font-bold">
                <span>Kembali:</span>
                <span className="tabular-nums">{formatRupiah(transaction.change_amount)}</span>
              </div>
            </div>

            {/* Footer Notice & Thank You */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-slate-600">
              <p className="whitespace-pre-line">{footer}</p>
              <p className="pt-1 text-[9px] text-slate-400">
                Dicetak oleh OBATHAUS - Operational System Management
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-4 border-t border-borderline bg-white flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading rounded-xl"
          >
            Tutup
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk ({paperSize})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
