'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { TargetLogo } from '@/components/common/TargetLogo';

export function BrandLogo({
  href = '/pos',
  className = '',
  name,
  showImage = true,
}: {
  href?: string;
  className?: string;
  name?: string;
  showImage?: boolean;
}) {
  const cart = useCart();
  const rawStoreName = (name || cart?.settings?.store_name || 'OBAT HAUS').trim();
  const logoUrl = cart?.settings?.logo_url;

  // Clean brand name so "- Operational System Management" doesn't clutter navbar
  const cleanBrand = rawStoreName.replace(/-\s*operational\s*system\s*management/i, '').trim() || 'OBAT HAUS';
  let firstWord = 'OBAT';
  let secondWord = 'HAUS';
  if (cleanBrand.toUpperCase() === 'OBATHAUS') {
    firstWord = 'OBAT';
    secondWord = 'HAUS';
  } else {
    const parts = cleanBrand.split(/\s+/);
    firstWord = parts[0] || 'OBAT';
    secondWord = parts.slice(1).join(' ') || 'HAUS';
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 group cursor-pointer select-none ${className}`}
    >
      {showImage ? (
        logoUrl ? (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
            <img src={logoUrl} alt={cleanBrand} className="w-full h-full object-contain rounded-lg" />
          </div>
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
            <TargetLogo className="w-full h-full" />
          </div>
        )
      ) : null}
      <div className="flex items-center tracking-tight font-black text-lg sm:text-xl text-[#18181B] uppercase">
        <span>{firstWord}</span>
        <span className="text-[#FF6B00] ml-1.5">{secondWord}</span>
        <span className="w-2 h-2 rounded-full bg-[#FF6B00] ml-1 self-start mt-1.5" />
      </div>
    </Link>
  );
}
