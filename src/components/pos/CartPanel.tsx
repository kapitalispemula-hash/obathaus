'use client';

import React, { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { formatRupiah } from '@/lib/format';
import {
  Plus,
  Minus,
  X,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Coffee,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react';

interface CartPanelProps {
  onOpenCheckout: (initialMethod?: 'cash' | 'debit' | 'qris') => void;
  isMobileModal?: boolean;
  onCloseMobileModal?: () => void;
}

export function CartPanel({
  onOpenCheckout,
  isMobileModal = false,
  onCloseMobileModal,
}: CartPanelProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    settings,
  } = useCart();

  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'debit' | 'qris'>('debit');

  return (
    <div className="bg-white rounded-3xl border border-[#ECEEF1] flex flex-col h-full overflow-hidden select-none shadow-xs">
      {/* 1. Header (Matching "My Order" from Reference Image) */}
      <div className="p-5 sm:p-6 pb-4 border-b border-[#ECEEF1] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h3 className="font-extrabold text-lg sm:text-xl text-[#18181B] tracking-tight">
            My Order
          </h3>
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#FF6B00] text-[10px] font-bold">
              {items.length} Menu
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[#9CA3AF] hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
              title="Kosongkan Pesanan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isMobileModal && (
            <button
              type="button"
              onClick={onCloseMobileModal}
              className="w-8 h-8 rounded-full bg-[#F8F9FA] text-[#8F95B2] hover:text-[#18181B] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Item List with Rectangular Rounded Thumbnails & Steppers */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#9CA3AF] space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-[#FAFAFA] flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-[#A1A1AA]" />
            </div>
            <p className="text-xs font-bold text-[#18181B]">Pesanan Masih Kosong</p>
            <p className="text-[11px] text-[#A1A1AA] max-w-[180px]">
              Klik pada menu di katalog untuk langsung menambahkan ke My Order
            </p>
          </div>
        ) : (
          items.map((item) => {
            const itemPriceTotal = item.product.selling_price * item.quantity;
            return (
              <div
                key={item.product.id}
                className="flex items-center justify-between gap-3 group bg-white hover:bg-[#FAFAFA] p-2 rounded-2xl border border-transparent hover:border-[#F0F0F0] transition-all"
              >
                {/* Food Rectangular Rounded Thumbnail */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FAF5F4] border border-[#F0F0F0] shrink-0 flex items-center justify-center">
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Coffee className="w-5 h-5 text-[#A1A1AA]" />
                  )}
                </div>

                {/* Title & Stepper with Orange Accents */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-xs text-[#18181B] leading-tight truncate">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-5 h-5 rounded-md bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-[#EA580C] px-1 min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-5 h-5 rounded-md bg-[#FF6B00] hover:bg-[#EA580C] text-white flex items-center justify-center text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <span className="font-black text-xs sm:text-sm text-[#18181B]">
                    {formatRupiah(itemPriceTotal)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Total Amount & Checkout Section (Orange Button) */}
      <div className="p-4 sm:p-5 pt-3 border-t border-[#F0F0F0] bg-[#FAFAFA]/80 space-y-4">
        {/* Payment Method Selector */}
        <div>
          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2">
            Metode Pembayaran
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'debit', label: 'Debit Card', icon: CreditCard },
              { id: 'cash', label: 'Cash / Tunai', icon: Banknote },
              { id: 'qris', label: 'QRIS', icon: QrCode },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id as any)}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF7ED] border-[#FF6B00] text-[#FF6B00] shadow-2xs font-bold ring-1 ring-[#FF6B00]/20'
                      : 'bg-white border-[#F0F0F0] text-[#71717A] hover:bg-[#FAFAFA] font-medium'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] truncate">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Total Amount Row */}
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-xs font-bold text-[#A1A1AA]">Total Amount</span>
          <span className="text-lg sm:text-xl font-black text-[#18181B] tracking-tight">
            {formatRupiah(grandTotal)}
          </span>
        </div>

        {/* Big Vibrant Orange Checkout Button */}
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => onOpenCheckout(selectedMethod)}
          className={`w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
            items.length > 0
              ? 'bg-[#FF6B00] hover:bg-[#EA580C] text-white shadow-orange-500/25 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <span>Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
