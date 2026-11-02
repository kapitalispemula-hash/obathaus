'use client';

import React from 'react';

export function TargetLogo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer concentric ring */}
      <circle
        cx="22"
        cy="22"
        r="18"
        stroke="#FF6B00"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Middle concentric ring */}
      <circle
        cx="22"
        cy="22"
        r="10"
        stroke="#FF6B00"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Center solid bullseye dot */}
      <circle cx="22" cy="22" r="3" fill="#FF6B00" />
    </svg>
  );
}
