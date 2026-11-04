'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';
import { TargetLogo } from './TargetLogo';

const PWA_DISMISSED_KEY = 'obathaus_pwa_prompt_dismissed_at';

export function PwaSupport() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already running as installed standalone app
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Detect mobile device
    const userAgent = navigator.userAgent || '';
    const mobileCheck = /Android|iPhone|iPad|iPod/i.test(userAgent);
    const iosCheck = /iPhone|iPad|iPod/i.test(userAgent) && !(window as any).MSStream;
    setIsMobile(mobileCheck);
    setIsIos(iosCheck);

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // PWA Install prompt for Chromium / Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== 'undefined') {
        (window as any).__pwaDeferredPrompt = e;
        window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
      }
      // If mobile and not standalone, show CTA
      if (mobileCheck && !checkStandalone) {
        checkAndShowBanner();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleOpenModal = () => {
      setShowMobileBanner(true);
    };
    window.addEventListener('open-pwa-install-modal', handleOpenModal);

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowMobileBanner(false);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__pwaDeferredPrompt = null;
      }
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS Safari or if mobile and no prompt yet
    if (mobileCheck && !checkStandalone) {
      const timer = setTimeout(() => {
        checkAndShowBanner();
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('open-pwa-install-modal', handleOpenModal);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkAndShowBanner = () => {
    if (pathname?.startsWith('/absen')) return;
    try {
      const dismissedAt = localStorage.getItem(PWA_DISMISSED_KEY);
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        // Suppress for 24 hours if dismissed
        if (diff < 24 * 60 * 60 * 1000) {
          return;
        }
      }
      setShowMobileBanner(true);
    } catch {
      setShowMobileBanner(true);
    }
  };

  const handleDismissBanner = () => {
    setShowMobileBanner(false);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__pwaDeferredPrompt : null);
    if (!prompt) {
      if (isIos) {
        // Just keep banner open showing steps
        return;
      }
      return;
    }
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setShowMobileBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    if (typeof window !== 'undefined') {
      (window as any).__pwaDeferredPrompt = null;
    }
  };

  return (
    <>
      {/* Offline Connectivity Warning */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-1.5 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Mode Offline: Transaksi tersimpan lokal dan otomatis sinkron saat internet aktif.</span>
        </div>
      )}

      {/* Mobile Download/Install Popup Banner (Android & iOS) */}
      {showMobileBanner && !isStandalone && !pathname?.startsWith('/absen') && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-5 relative overflow-hidden backdrop-blur-md">
            {/* Top Close Button */}
            <button
              onClick={handleDismissBanner}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              {/* Logo container */}
              <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-slate-100">
                <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-xl" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-[#FF6B00] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    Aplikasi Mobile
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                  Pasang Aplikasi OBAT HAUS
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Akses operasional & kasir lebih cepat langsung dari layar utama HP Anda tanpa repot membuka browser.
                </p>
              </div>
            </div>

            {/* Instruction block depending on Android or iOS */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              {isIos ? (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Cara Pasang di iPhone / iPad:
                  </p>
                  <ol className="text-[11px] text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                        1
                      </span>
                      <span>
                        Ketuk tombol Bagikan <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> di bilah Safari bawah.
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                        2
                      </span>
                      <span>
                        Pilih menu <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> <strong>Tambah ke Layar Utama</strong> (*Add to Home Screen*).
                      </span>
                    </li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Pasang Aplikasi di HP Sekarang (1-Klik)
                </button>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Buka menu titik tiga (⋮) di Chrome &gt; ketuk <strong>Install Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                  </span>
                </div>
              )}
            </div>

            <div className="mt-2 text-center">
              <button
                onClick={handleDismissBanner}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
