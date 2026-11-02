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

      const finalStoreName = storeName.trim() || 'Cafe POS';
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
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-2">
                          <TargetLogo className="w-10 h-10 mb-1" />
                          <span className="text-[10px] font-bold text-mutedtext">Default</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="text-xs font-bold text-heading truncate">
                        {logoPreview ? 'Logo Khusus Terpasang' : 'Logo Bawaan Sistem'}
                      </div>
                      <p className="text-[11px] text-mutedtext leading-relaxed">
                        {logoPreview
                          ? 'Logo ini sedang aktif dan ditampilkan di seluruh antarmuka cafe.'
                          : 'Belum ada file logo kustom. Sistem menggunakan tipografi Cafe POS.'}
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
                      {logoPreview ? (
                        <img src={logoPreview} alt="Favicon" className="w-full h-full object-contain" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                      )}
                    </div>
                    <span className="font-semibold truncate text-[11px] text-white/90">
                      {storeName || 'Cafe POS'} — Point of Sale & Financial Analytics
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

          {/* 2. Invoice & Receipt Settings */}
          <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs space-y-4">
            <h3 className="font-bold text-heading text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <span>Format Invoice & Struk Kasir</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-heading mb-1">Prefix Nomor Invoice</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="Contoh: INV"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] text-heading"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">Ukuran Kertas Thermal Printer</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['58mm', '80mm'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPaperSize(sz)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
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

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-heading mb-1">Header Pesan Struk</label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  placeholder="Selamat Datang di Cafe POS"
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-heading mb-1">Footer / Pesan Penutup Struk</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={2}
                  placeholder="Terima kasih atas kunjungan Anda!"
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
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
