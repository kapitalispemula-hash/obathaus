'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { INITIAL_STORE_SETTINGS } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { StoreSettings } from '@/types/database';
import { TargetLogo } from '@/components/common/TargetLogo';
import {
  Store,
  Receipt,
  Percent,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Save,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Trash2,
  Globe,
  Coffee,
  Loader2,
  Sparkles,
  Printer,
  Smartphone,
  Download,
  Share2,
  ExternalLink,
  CalendarCheck,
  QrCode,
} from 'lucide-react';

function updateBrowserFavicon(iconUrl: string) {
  if (typeof document === 'undefined' || !iconUrl) return;
  const selectors = ["link[rel*='icon']", "link[rel='shortcut icon']", "link[rel='apple-touch-icon']"];
  let updated = false;
  selectors.forEach((sel) => {
    const el = document.querySelector(sel) as HTMLLinkElement | null;
    if (el) {
      el.href = iconUrl;
      updated = true;
    }
  });
  if (!updated) {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.href = iconUrl;
    document.head.appendChild(newLink);
  }
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { refreshSettings } = useCart();
  const [settings, setSettings] = useState<StoreSettings | null>(INITIAL_STORE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Logo & Favicon Management State
  const [logoUrl, setLogoUrl] = useState<string | null>(INITIAL_STORE_SETTINGS.logo_url || null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [storeName, setStoreName] = useState(INITIAL_STORE_SETTINGS.store_name);
  const [tagline, setTagline] = useState(INITIAL_STORE_SETTINGS.tagline || '');
  const [address, setAddress] = useState(INITIAL_STORE_SETTINGS.address);
  const [phone, setPhone] = useState(INITIAL_STORE_SETTINGS.phone);
  const [email, setEmail] = useState(INITIAL_STORE_SETTINGS.email);
  const [timezone, setTimezone] = useState(INITIAL_STORE_SETTINGS.timezone);

  const [invoicePrefix, setInvoicePrefix] = useState(INITIAL_STORE_SETTINGS.invoice_prefix);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(INITIAL_STORE_SETTINGS.receipt_paper_size);
  const [receiptHeader, setReceiptHeader] = useState(INITIAL_STORE_SETTINGS.receipt_header);
  const [receiptFooter, setReceiptFooter] = useState(INITIAL_STORE_SETTINGS.receipt_footer);

  const [taxPercentage, setTaxPercentage] = useState<number>(INITIAL_STORE_SETTINGS.tax_percentage);
  const [isTaxInclusive, setIsTaxInclusive] = useState(INITIAL_STORE_SETTINGS.is_tax_inclusive);
  const [discountEnabled, setDiscountEnabled] = useState(INITIAL_STORE_SETTINGS.discount_enabled);
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState<number>(INITIAL_STORE_SETTINGS.max_discount_percentage);

  // Demo Reset Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // PWA Install State
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);

  const handleInstallAndroid = async () => {
    setInstallStatusMsg(null);
    const prompt = typeof window !== 'undefined' ? (window as any).__pwaDeferredPrompt : null;
    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setInstallStatusMsg('Aplikasi berhasil dipasang di perangkat Anda!');
          (window as any).__pwaDeferredPrompt = null;
        }
      } catch (err) {
        console.warn('Install error:', err);
      }
    } else {
      const isStand = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
      if (isStand) {
        setInstallStatusMsg('Aplikasi Obat Haus sudah terpasang di perangkat ini.');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-pwa-install-modal'));
      }
      setInstallStatusMsg('Banner pop-up instalasi telah dibuka. Jika tidak muncul otomatis, ketuk menu titik tiga (⋮) di Chrome > "Install Aplikasi".');
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const s = await dbService.getStoreSettings();
        setSettings(s);
        setStoreName(s.store_name);
        setTagline(s.tagline || '');
        setAddress(s.address);
        setPhone(s.phone);
        setEmail(s.email);
        setTimezone(s.timezone);

        // Logo
        setLogoUrl(s.logo_url || null);
        setLogoPreview(s.logo_url || null);
        if (s.logo_url) {
          updateBrowserFavicon(s.logo_url);
        }

        setInvoicePrefix(s.invoice_prefix);
        setPaperSize(s.receipt_paper_size);
        setReceiptHeader(s.receipt_header);
        setReceiptFooter(s.receipt_footer);

        setTaxPercentage(s.tax_percentage);
        setIsTaxInclusive(s.is_tax_inclusive);
        setDiscountEnabled(s.discount_enabled);
        setMaxDiscountPercentage(s.max_discount_percentage);
      } catch (err) {
        console.error('Failed to load store settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleLogoFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('File logo harus berupa file gambar (PNG, JPG, SVG, WebP, atau ICO).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file logo maksimal 5MB.');
      return;
    }
    setErrorMsg(null);
    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUrl(dataUrl);
      updateBrowserFavicon(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (val: string) => {
    setLogoUrl(val);
    setLogoPreview(val || null);
    setLogoFile(null);
    if (val.trim()) {
      updateBrowserFavicon(val.trim());
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
    setLogoPreview(null);
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
    updateBrowserFavicon('/favicon.ico');
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(false);
    setIsSaving(true);

    try {
      let finalLogo: string | null = logoUrl;

      if (logoInputMode === 'upload' && logoFile) {
        setIsUploadingLogo(true);
        finalLogo = await dbService.uploadStoreLogo(logoFile);
        setIsUploadingLogo(false);
      } else if (logoInputMode === 'url') {
        finalLogo = logoUrl ? logoUrl.trim() : null;
      } else {
        finalLogo = logoPreview || logoUrl || null;
      }

      const finalStoreName = storeName.trim() || 'OBATHAUS - Operational System Management';
      await dbService.updateStoreSettings({
        store_name: finalStoreName,
        tagline: tagline.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logo_url: finalLogo || null,
        timezone,
        invoice_prefix: invoicePrefix.trim().toUpperCase(),
        receipt_paper_size: paperSize,
        receipt_header: receiptHeader.trim(),
        receipt_footer: receiptFooter.trim(),
        tax_percentage: taxPercentage,
        is_tax_inclusive: isTaxInclusive,
        discount_enabled: discountEnabled,
        max_discount_percentage: maxDiscountPercentage,
      });

      if (finalLogo) {
        updateBrowserFavicon(finalLogo);
      } else {
        updateBrowserFavicon('/favicon.ico');
      }

      await refreshSettings();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan pengaturan toko.');
    } finally {
      setIsSaving(false);
      setIsUploadingLogo(false);
    }
  };

  const handleExecuteResetDemo = async () => {
    if (!user) return;
    setIsResetting(true);
    setResetSuccessMsg(null);
    try {
      const res = await dbService.resetDemoData(user.id);
      setIsResetting(false);
      setIsResetModalOpen(false);
      setResetSuccessMsg(res.message);
      await refreshSettings();
      // Reload current settings inputs
      const s = await dbService.getStoreSettings();
      setStoreName(s.store_name);
      setTagline(s.tagline || '');
      setAddress(s.address);
      setPhone(s.phone);
      setEmail(s.email);
      setLogoUrl(s.logo_url || null);
      setLogoPreview(s.logo_url || null);
      setTimeout(() => setResetSuccessMsg(null), 5000);
    } catch (err: any) {
      setIsResetting(false);
      alert(err.message || 'Gagal mereset data demo.');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-mutedtext">Memuat konfigurasi toko...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Pengaturan Toko & Konfigurasi Sistem
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Kelola logo toko, favicon URL bar, profil bisnis, format invoice, ukuran struk kasir, dan kebijakan pajak.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving || isUploadingLogo}
            className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-70 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            {isSaving || isUploadingLogo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving || isUploadingLogo ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">
                Nama cafe &quot;{storeName}&quot;, logo, dan seluruh konfigurasi berhasil disimpan!
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Tersimpan
            </span>
          </div>
        )}

        {resetSuccessMsg && (
          <div className="p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl text-[#FF6B00] text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#FF6B00] shrink-0" />
            <span>{resetSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs sm:text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* ========================================================
              0. Store Logo & Browser Favicon (URL Bar) Card
          ======================================================== */}
          <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderline">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center font-bold">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-heading text-base flex items-center gap-2">
                    <span>Logo Cafe & Favicon Browser (URL Bar)</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                      <Sparkles className="w-2.5 h-2.5" />
                      Multi-Panel Sync
                    </span>
                  </h3>
                  <p className="text-xs text-mutedtext">
                    Logo ini otomatis diterapkan di Header aplikasi, Sidebar, Struk pembayaran, Login, dan sebagai ikon Favicon pada Tab & URL Bar peramban.
                  </p>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1 bg-canvas p-1 rounded-xl border border-borderline self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLogoInputMode('upload')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    logoInputMode === 'upload'
                      ? 'bg-white text-[#FF6B00] shadow-xs'
                      : 'text-mutedtext hover:text-heading'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputMode('url')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    logoInputMode === 'url'
                      ? 'bg-white text-[#FF6B00] shadow-xs'
                      : 'text-mutedtext hover:text-heading'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Tautan URL</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Previews */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-canvas rounded-2xl border border-borderline space-y-3">
                  <span className="text-[11px] font-bold text-mutedtext uppercase tracking-wider block">
                    Pratinjau Logo Aktif
                  </span>

                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-white border border-borderline p-2 flex items-center justify-center overflow-hidden shadow-xs shrink-0 relative group">
                      <img
                        src={logoPreview || '/logo.png'}
                        alt="Logo Preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="text-xs font-bold text-heading truncate">
                        Logo Resmi OBAT HAUS Aktif
                      </div>
                      <p className="text-[11px] text-mutedtext leading-relaxed">
                        Logo ini aktif di seluruh sistem, nota struk kasir, thumbnail sosial media, dan ikon aplikasi HP.
                      </p>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer pt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus / Reset Logo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Simulated URL Bar / Browser Tab Preview */}
                <div className="p-3.5 bg-white rounded-xl border border-borderline shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-mutedtext uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Pratinjau di Tab & URL Bar Browser:</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-[#18181B] text-white rounded-xl text-xs shadow-inner">
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-0.5">
                      <img src={logoPreview || '/logo.png'} alt="Favicon" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-semibold truncate text-[11px] text-white/90">
                      {storeName || 'OBATHAUS'} — Operational System Management
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Upload / URL Input */}
              <div className="lg:col-span-7">
                {logoInputMode === 'upload' ? (
                  <div className="space-y-2">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(true);
                      }}
                      onDragLeave={() => setIsDraggingLogo(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleLogoFileSelect(file);
                      }}
                      onClick={() => logoFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDraggingLogo
                          ? 'border-[#FF6B00] bg-[#FFF7ED]/60'
                          : 'border-borderline hover:border-[#FF6B00] bg-canvas/40 hover:bg-canvas/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center mx-auto mb-2 border border-[#FED7AA]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-heading">
                        Klik untuk Pilih File Logo atau Tarik ke Sini
                      </div>
                      <div className="text-[11px] text-mutedtext mt-1">
                        Format didukung: PNG (transparan), SVG, WebP, JPG, atau ICO (Maksimal 5MB)
                      </div>
                      <button
                        type="button"
                        className="mt-3 px-3 py-1.5 text-xs font-bold text-[#FF6B00] bg-white border border-[#FED7AA] hover:bg-[#FFF7ED] rounded-xl shadow-2xs transition-colors pointer-events-none"
                      >
                        Pilih dari Komputer
                      </button>
                    </div>

                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoFileSelect(file);
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-canvas rounded-2xl border border-borderline">
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1.5">
                        Tautan URL Gambar Logo / Favicon
                      </label>
                      <input
                        type="url"
                        value={logoUrl || ''}
                        onChange={(e) => handleLogoUrlChange(e.target.value)}
                        placeholder="https://example.com/logo-cafe.png"
                        className="w-full text-xs sm:text-sm p-2.5 bg-white border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                      />
                    </div>
                    <p className="text-[11px] text-mutedtext">
                      Masukkan URL langsung ke gambar logo (format .png, .jpg, .svg, atau .ico). Logo akan langsung dipratinjau dan otomatis disinkronkan ke tab peramban.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Store Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs space-y-4">
            <h3 className="font-bold text-heading text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
              <span>Profil Bisnis & Lokasi</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Nama Cafe *</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] font-bold text-heading"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">Tagline Slogan</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-heading mb-1">Alamat Lengkap Toko</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">Zona Waktu Operasional</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] font-semibold text-heading"
                >
                  <option value="Asia/Makassar">Asia/Makassar (WITA) - Default PRD</option>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Standar Printer Struk Kasir */}
          <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs space-y-4">
            <h3 className="font-bold text-heading text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <span>Standar Printer Struk Kasir (Thermal Paper)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-heading mb-1.5">Ukuran Kertas Thermal Printer Toko</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['58mm', '80mm'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPaperSize(sz)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        paperSize === sz
                          ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
                          : 'bg-canvas text-heading border-borderline hover:bg-slate-200/50'
                      }`}
                    >
                      Format {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3.5 text-xs text-[#9A3412] leading-relaxed w-full">
                  <span className="font-bold block mb-0.5">ℹ️ Pengaturan Struk & Prefix Invoice Khusus Cabang</span>
                  Format prefix nomor nota, header, dan footer struk kasir kini diatur secara independen per cabang di menu <strong>Cabang &amp; Gudang</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* 2.1. Dedicated App Download & PWA Mobile Section */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-700/60 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-md border border-slate-700 bg-black/20">
                  <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg sm:text-xl tracking-tight text-white">
                      Aplikasi Mobile OBAT HAUS
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#FF6B00] text-white tracking-wider">
                      Android &amp; iOS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Progressive Web App (PWA) resmi untuk kasir tablet, smartphone staf, dan owner.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallAndroid}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install Aplikasi (Android)</span>
                </button>
                <a
                  href="/pos"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Web App</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Android Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#FF6B00]">
                      <Smartphone className="w-5 h-5" />
                      <h4 className="font-bold text-sm text-white">Panduan &amp; Install Android (Chrome)</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-[#FF8A3D] text-[10px] font-black uppercase tracking-wider border border-orange-500/30">
                      Disarankan
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pasang langsung aplikasi POS &amp; Operasional Obat Haus ke layar utama Android Anda dengan 1-klik tanpa perlu lewat Play Store.
                  </p>
                </div>

                {/* Direct Action Button for Android */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleInstallAndroid}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#FF6B00] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Install Aplikasi Android Sekarang (1-Klik)</span>
                  </button>

                  {installStatusMsg && (
                    <div className="p-2.5 bg-orange-950/60 border border-orange-500/40 rounded-xl text-orange-200 text-[11px] leading-tight text-center">
                      {installStatusMsg}
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium w-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Ikon Logo Resmi Obat Haus otomatis terpasang di HP</span>
                  </div>
                </div>
              </div>

              {/* iOS Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center gap-2.5 text-sky-400">
                  <Smartphone className="w-5 h-5" />
                  <h4 className="font-bold text-sm text-white">Panduan Pengguna iPhone / iPad (Safari)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Buka link <strong>https://obathaus.vercel.app</strong> di browser Safari. Ketuk tombol Bagikan <strong>(ikon kotak panah ke atas [↑])</strong> di bilah bawah, lalu gulir ke bawah dan pilih <strong>&quot;Tambah ke Layar Utama&quot;</strong> (<em>Add to Home Screen</em>).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Berjalan full screen selayaknya aplikasi iOS native</span>
                </div>
              </div>

              {/* Attendance App Card for Employees */}
              <div className="md:col-span-2 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-xl bg-orange-500/20 text-[#FF8A3D] shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2 flex-wrap">
                        <span>Aplikasi Absensi Karyawan Mobile-First</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF6B00] text-white">
                          /absen
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Khusus staf barista, kitchen, kasir, dan gudang. Login cepat PIN 4-digit &amp; validasi GPS Geofencing radius 100 meter.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <a
                    href="/absen"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Buka Web App Absen</span>
                  </a>
                  <a
                    href="/admin/attendance"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Cetak Poster QR</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tax & Discounts Policy */}
          <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs space-y-4">
            <h3 className="font-bold text-heading text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
              <span>Kebijakan Pajak (PPN) & Diskon Kasir</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Tarif Pajak PPN (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-mutedtext">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">Maksimal Diskon Kasir (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxDiscountPercentage}
                    onChange={(e) => setMaxDiscountPercentage(Number(e.target.value))}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-mutedtext">
                    %
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="isTaxInclusive"
                    checked={isTaxInclusive}
                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B00] rounded focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="isTaxInclusive" className="text-xs font-bold text-heading cursor-pointer">
                    Harga Jual Produk Sudah Termasuk Pajak (Tax Inclusive)
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="discountEnabled"
                    checked={discountEnabled}
                    onChange={(e) => setDiscountEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B00] rounded focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="discountEnabled" className="text-xs font-bold text-heading cursor-pointer">
                    Aktifkan Fitur Input Diskon Manual pada Keranjang Kasir
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || isUploadingLogo}
              className="px-6 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-70 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSaving || isUploadingLogo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isSaving || isUploadingLogo ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan'}</span>
            </button>
          </div>
        </form>

        {/* 4. Demo Data Management Card (PRD DEMO-001 - DEMO-005) */}
        <div className="p-6 rounded-2xl bg-white border border-borderline shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-canvas border border-borderline text-heading">
                <RotateCcw className="w-3 h-3 text-[#FF6B00]" />
                <span>Demo Data Engine</span>
              </div>
              <h3 className="text-base font-bold text-heading">
                Kembalikan Data Demo ke Kondisi Awal (Reset)
              </h3>
              <p className="text-xs text-mutedtext leading-relaxed max-w-2xl">
                Fitur ini akan mengembalikan data sistem ke kondisi demonstrasi yang bersih: 8 kategori lengkap, 36 menu produk dengan foto, 30 hari riwayat transaksi realistis, dan pengeluaran operasional simulasi.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2 bg-heading hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Reset Data Demo
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-heading text-base">Konfirmasi Reset Data Demo</h3>
              <p className="text-xs text-mutedtext mt-2 leading-relaxed">
                Apakah Anda yakin ingin mengatur ulang data demonstrasi? Seluruh transaksi baru yang dibuat selama uji coba akan disetel ulang kembali ke dataset simulasi 30 hari.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl border border-borderline cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteResetDemo}
                disabled={isResetting}
                className="flex-1 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                {isResetting ? 'Mereset Data...' : 'Ya, Reset Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
