'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download } from 'lucide-react';

export function PwaSupport() {
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // PWA Install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-1.5 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Mode Offline: Transaksi POS memerlukan koneksi database agar dapat tersimpan.</span>
        </div>
      )}

      {showInstallBtn && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-4 left-4 z-40 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Install Aplikasi PWA
        </button>
      )}
    </>
  );
}
