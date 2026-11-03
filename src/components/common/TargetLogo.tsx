'use client';

import React from 'react';

export function TargetLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="OBAT HAUS"
      className={`object-contain select-none pointer-events-none ${className}`}
    />
  );
}
