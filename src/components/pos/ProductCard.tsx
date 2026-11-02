'use client';

import React from 'react';
import { Product } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import { Coffee, Star, Heart, Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  cartQuantity?: number;
}

export function ProductCard({
  product,
  onAddToCart,
  cartQuantity = 0,
}: ProductCardProps) {
  // Deterministic realistic rating between 4.5 and 4.9 based on product name
  const rating = (4.5 + ((product.name.charCodeAt(0) + product.name.length) % 5) * 0.1).toFixed(1);

  return (
    <div
      onClick={() => onAddToCart(product)}
      className="group relative bg-white rounded-2xl sm:rounded-[22px] border border-[#F0F1F3] hover:border-[#FF6B00]/40 shadow-xs hover:shadow-md active:scale-[0.98] transition-all duration-150 p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* In-cart count indicator badge (Orange circle badge) */}
      {cartQuantity > 0 && (
        <span className="absolute top-4 left-4 bg-[#FF6B00] text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md z-20 animate-scaleIn">
          {cartQuantity}
        </span>
      )}

      {/* 1. Rectangular Food Photo with Rounded Corners (Matching Reference Image) */}
      <div className="relative w-full h-36 sm:h-40 rounded-xl sm:rounded-2xl overflow-hidden bg-[#FAF5F4] mb-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#FAFAFA]">
            <Coffee className="w-10 h-10 text-[#A1A1AA]" />
          </div>
        )}

        {/* Top-Right Favorite / Tag Pill */}
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-xs text-[#A1A1AA] group-hover:text-[#FF6B00] transition-colors">
          <Heart className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 2. Title & Star Rating Row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-extrabold text-xs sm:text-sm text-[#18181B] leading-tight truncate group-hover:text-[#FF6B00] transition-colors">
            {product.name}
          </h4>
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{rating}</span>
          </div>
        </div>

        {/* 3. Subtitle / Delivery Info & Price */}
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-[10px] text-[#A1A1AA] font-medium truncate">
            &bull; Ready &bull; Fast Delivery
          </p>
          <span className="font-black text-xs sm:text-sm text-[#18181B] shrink-0">
            {formatRupiah(product.selling_price)}
          </span>
        </div>
      </div>

      {/* 4. Instant Add-to-Order button on bottom */}
      <div className="mt-2.5 pt-2 border-t border-[#F0F1F3]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className={`w-full py-1.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            cartQuantity > 0
              ? 'bg-[#FFF7ED] text-[#FF6B00] border-[#FED7AA]'
              : 'bg-[#FAFAFA] group-hover:bg-[#FFF7ED] text-[#71717A] group-hover:text-[#FF6B00] border-[#F0F0F0] group-hover:border-[#FED7AA]'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{cartQuantity > 0 ? `Tambah (${cartQuantity})` : '+ Pesan'}</span>
        </button>
      </div>
    </div>
  );
}
