'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  X,
  Share,
  PlusSquare,
  Smartphone,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';

const ADMIN_INSTALL_DISMISSED_SESSION_KEY = 'obathaus_admin_install_popup_dismissed';

export function AdminInstallPromptModal() {
  const { settings } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showManualAndroidSteps, setShowManualAndroidSteps] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent || '';
    const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const iosCheck = /iPhone|iPad|iPod/i.test(ua) || isIpadOs;
    const androidCheck = /Android/i.test(ua);
    const mobileCheck = iosCheck || androidCheck || /Mobile|Tablet/i.test(ua);

    setIsIos(iosCheck);

    // Grab any already captured beforeinstallprompt event
    if ((window as any).__pwaDeferredPrompt) {
      setDeferredPrompt((window as any).__pwaDeferredPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaDeferredPrompt = e;
    };

    const handlePromptAvailable = () => {
      if ((window as any).__pwaDeferredPrompt) {
        setDeferredPrompt((window as any).__pwaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
      (window as any).__pwaDeferredPrompt = null;
    };

    const handleManualOpen = () => {
      setShowManualAndroidSteps(false);
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-admin-install-modal', handleManualOpen);

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (mobileCheck) {
      try {
        const dismissed = sessionStorage.getItem(ADMIN_INSTALL_DISMISSED_SESSION_KEY);
        if (!dismissed) {
          timer = setTimeout(() => {
            setIsOpen(true);
          }, 700);
        }
      } catch {
        timer = setTimeout(() => {
          setIsOpen(true);
        }, 700);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-admin-install-modal', handleManualOpen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(ADMIN_INSTALL_DISMISSED_SESSION_KEY, '1');
    } catch {}
  };

  const handleInstallClick = async () => {
    const prompt =
      deferredPrompt ||
      (typeof window !== 'undefined' ? (window as any).__pwaDeferredPrompt : null);

    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsOpen(false);
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__pwaDeferredPrompt = null;
        }
        return;
      } catch (err) {
        console.warn('Admin install prompt error:', err);
      }
    }

    // Fallback when browser hasn't fired native prompt (e.g. iOS Safari or Android in-app browser)
    if (!isIos) {
      setShowManualAndroidSteps(true);
    }
  };

  if (!isOpen || isInstalled) return null;

  const logoSrc = settings?.logo_url || '/logo.png';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-3 sm:p-4 lg:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Install Panel Admin OBAT HAUS"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-[#ECEEF1] p-5 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
          aria-label="Tutup pop up install"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Logo */}
        <div className="flex items-start gap-3.5 pr-7">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#ECEEF1] bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
            <img src={logoSrc} alt="OBAT HAUS" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
              <Smartphone className="w-3 h-3" />
              {isIos ? 'Aplikasi iOS' : 'Aplikasi Android'}
            </span>
            <h3 className="text-sm font-black text-[#18181B] mt-1 leading-snug">
              Install Panel Admin OBAT HAUS
            </h3>
            <p className="text-[11px] text-[#71717A] leading-relaxed mt-0.5">
              Tambahkan ke layar utama HP untuk akses cepat omzet, transaksi, shift, dan absensi.
            </p>
          </div>
        </div>

        {/* Platform Action Area */}
        <div className="mt-4 pt-3.5 border-t border-[#ECEEF1] space-y-3">
          {isIos ? (
            <div className="bg-[#FAFAFA] rounded-2xl p-3.5 border border-[#ECEEF1] space-y-2">
              <p className="text-xs font-extrabold text-[#18181B] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
                Cara Pasang di iPhone / iPad (Safari):
              </p>
              <ol className="text-[11px] text-[#52525B] space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#18181B] text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    1
                  </span>
                  <span>
                    Ketuk ikon Bagikan <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> di bilah Safari bawah.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#18181B] text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    2
                  </span>
                  <span>
                    Pilih <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#18181B]" /> <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>).
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-2xl text-xs font-black shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {deferredPrompt ? 'Install Aplikasi Sekarang (1-Klik)' : 'Install Panel Admin ke HP'}
                </span>
              </button>

              {(showManualAndroidSteps || !deferredPrompt) && (
                <div className="bg-[#FAFAFA] rounded-2xl p-3 border border-[#ECEEF1] space-y-1.5 text-[11px] text-[#52525B]">
                  <div className="font-bold text-[#18181B] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Panduan Install Android (Chrome):</span>
                  </div>
                  <p className="leading-relaxed">
                    Jika dialog otomatis tidak muncul, ketuk menu <MoreVertical className="w-3.5 h-3.5 inline text-[#18181B]" /> di pojok kanan atas Chrome lalu pilih{' '}
                    <strong>Install Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-[11px] font-bold text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
