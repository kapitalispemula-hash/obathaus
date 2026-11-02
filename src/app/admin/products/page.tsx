'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Category, Product } from '@/types/database';
import { formatRupiah, formatPercent } from '@/lib/format';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  XCircle,
  Coffee,
  X,
  AlertCircle,
  TrendingUp,
  Upload,
  Link as LinkIcon,
  Trash2,
  Loader2,
} from 'lucide-react';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '@/lib/mock-data';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCatId, setFormCatId] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formHpp, setFormHpp] = useState<number>(0);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        dbService.getProducts(),
        dbService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormCatId(categories[0]?.id || '');
    setFormDesc('');
    setFormSellingPrice(25000);
    setFormHpp(8500);
    setFormImageUrl('');
    setImagePreview(null);
    setSelectedFile(null);
    setImageInputMode('upload');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku || '');
    setFormCatId(prod.category_id);
    setFormDesc(prod.description || '');
    setFormSellingPrice(prod.selling_price);
    setFormHpp(prod.hpp);
    setFormImageUrl(prod.image_url || '');
    setImagePreview(prod.image_url || null);
    setSelectedFile(null);
    setImageInputMode('upload');
    setFormIsActive(prod.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('File yang dipilih harus berupa file gambar (JPG, PNG, atau WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran file melebihi batas maksimal 5MB.');
      return;
    }
    setFormError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama produk wajib diisi.');
      return;
    }
    if (!formCatId) {
      setFormError('Kategori produk wajib dipilih.');
      return;
    }
    if (formSellingPrice <= 0) {
      setFormError('Harga jual harus lebih besar dari 0.');
      return;
    }
    if (formHpp < 0) {
      setFormError('HPP tidak boleh negatif.');
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl: string | null = null;

      if (imageInputMode === 'upload') {
        if (selectedFile) {
          setIsUploadingImage(true);
          finalImageUrl = await dbService.uploadProductImage(selectedFile);
          setIsUploadingImage(false);
        } else {
          // If no new file selected, preserve current imagePreview
          finalImageUrl = imagePreview || null;
        }
      } else {
        finalImageUrl = formImageUrl.trim() || null;
      }

      if (editingProduct) {
        await dbService.updateProduct(editingProduct.id, {
          name: formName.trim(),
          sku: formSku.trim() || null,
          category_id: formCatId,
          description: formDesc.trim() || null,
          selling_price: formSellingPrice,
          hpp: formHpp,
          image_url: finalImageUrl,
          is_active: formIsActive,
        });
      } else {
        await dbService.createProduct({
          name: formName.trim(),
          sku: formSku.trim() || null,
          category_id: formCatId,
          description: formDesc.trim() || null,
          selling_price: formSellingPrice,
          hpp: formHpp,
          image_url: finalImageUrl,
          is_active: formIsActive,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  };

  const handleToggleActive = async (prod: Product) => {
    try {
      await dbService.archiveProduct(prod.id, !prod.is_active);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status produk.');
    }
  };

  const handleDeleteProduct = (prod: Product) => {
    setProductToDelete(prod);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await dbService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      if (isModalOpen && editingProduct?.id === productToDelete.id) {
        setIsModalOpen(false);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus produk.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Live profit calculation for modal preview
  const liveUnitGrossProfit = Math.max(0, formSellingPrice - formHpp);
  const liveMargin = formSellingPrice > 0 ? (liveUnitGrossProfit / formSellingPrice) * 100 : 0;

  // Filtered Products
  const filtered = (products || [])
    .filter((p) => Boolean(p && p.id && p.name))
    .filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const q = (search || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || sku.includes(q);
      const matchesCat = selectedCat === 'all' || p.category_id === selectedCat;
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && p.is_active) ||
        (selectedStatus === 'inactive' && !p.is_active);
      return matchesSearch && matchesCat && matchesStatus;
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Manajemen Produk & HPP Menu
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Atur harga jual, HPP acuan, laba kotor per unit, dan status ketersediaan di kasir.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama produk atau SKU..."
              className="w-full pl-10 pr-4 py-2 bg-canvas border border-borderline rounded-xl text-xs sm:text-sm text-heading placeholder:text-mutedtext focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif di Kasir</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Table of Products */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Menu Produk</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4 text-right">Harga Jual</th>
                  <th className="py-3.5 px-4 text-right">HPP</th>
                  <th className="py-3.5 px-4 text-right">Laba / Unit</th>
                  <th className="py-3.5 px-4 text-right">Margin</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-mutedtext">
                      Memuat daftar produk...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-mutedtext">
                      Tidak ada produk yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => {
                    const grossProfit = prod.selling_price - prod.hpp;
                    const margin = prod.selling_price > 0 ? (grossProfit / prod.selling_price) * 100 : 0;
                    return (
                      <tr key={prod.id} className="hover:bg-canvas/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#FAF5F4] border border-borderline overflow-hidden shrink-0 p-0.5 flex items-center justify-center">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-mutedtext">
                                  <Coffee className="w-4 h-4 text-[#FF6B00]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-heading">{prod.name}</div>
                              {prod.description && (
                                <p className="text-[11px] text-mutedtext truncate max-w-xs">
                                  {prod.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-mutedtext">
                          {prod.sku || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-canvas border border-borderline text-heading">
                            <CategoryIcon
                              iconName={prod.category?.icon_name}
                              categoryName={prod.category?.name}
                              className="w-3 h-3 text-[#FF6B00]"
                            />
                            <span>{prod.category?.name || 'Kategori'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#FF6B00] tabular-nums">
                          {formatRupiah(prod.selling_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-mutedtext tabular-nums">
                          {formatRupiah(prod.hpp)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                          {formatRupiah(grossProfit)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">
                          {formatPercent(margin)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(prod)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                              prod.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-canvas border border-borderline text-mutedtext hover:bg-slate-200/60'
                            }`}
                          >
                            {prod.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(prod)}
                              className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                              title="Edit Informasi Produk"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Hapus Menu Produk"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <h3 className="font-bold text-heading text-base">
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 bg-white">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Produk Menu *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Caramel Macchiato"
                    required
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Kode SKU
                  </label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Contoh: ESP-05"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Kategori Menu *
                  </label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-heading mb-1">
                    Deskripsi Produk
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Deskripsi singkat rasa atau bahan utama..."
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Harga Jual Pelanggan (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formSellingPrice || ''}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl font-black text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                  />
                </div>

                {/* HPP (Harga Pokok Penjualan) */}
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    HPP / Biaya Bahan per Unit (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formHpp}
                    onChange={(e) => setFormHpp(Number(e.target.value))}
                    min={0}
                    required
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl font-bold text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                  />
                </div>

                {/* Live Profit & Margin Indicator Box */}
                <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <TrendingUp className="w-4 h-4" />
                    <span>Laba Kotor per Unit: {formatRupiah(liveUnitGrossProfit)}</span>
                  </div>
                  <span className="font-black text-emerald-900 tabular-nums">
                    Gross Margin: {formatPercent(liveMargin)}
                  </span>
                </div>

                {/* Product Image: Upload / URL Option */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-heading">
                      Foto Produk (Gambar Menu)
                    </label>
                    <div className="flex items-center gap-1 bg-canvas p-0.5 rounded-lg border border-borderline">
                      <button
                        type="button"
                        onClick={() => setImageInputMode('upload')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          imageInputMode === 'upload'
                            ? 'bg-white text-[#FF6B00] shadow-2xs border border-borderline/60'
                            : 'text-mutedtext hover:text-heading'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageInputMode('url')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          imageInputMode === 'url'
                            ? 'bg-white text-[#FF6B00] shadow-2xs border border-borderline/60'
                            : 'text-mutedtext hover:text-heading'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        Tautan URL
                      </button>
                    </div>
                  </div>

                  {imageInputMode === 'upload' ? (
                    <div>
                      {imagePreview ? (
                        <div className="p-3 bg-canvas/70 rounded-xl border border-borderline flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl bg-white border border-borderline overflow-hidden shrink-0 shadow-2xs">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-heading truncate">
                                {selectedFile ? selectedFile.name : 'Foto Produk Terpasang'}
                              </div>
                              <div className="text-[11px] text-mutedtext mt-0.5">
                                {selectedFile
                                  ? `${(selectedFile.size / 1024).toFixed(0)} KB • Siap diunggah ke database`
                                  : 'Tersimpan di sistem'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 text-xs font-bold text-heading bg-white hover:bg-canvas border border-borderline rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Ganti
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="p-1.5 text-mutedtext hover:text-[#FF6B00] hover:bg-[#FFF7ED] rounded-lg transition-colors cursor-pointer"
                              title="Hapus Foto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                            isDragging
                              ? 'border-[#FF6B00] bg-[#FFF7ED]/50'
                              : 'border-borderline hover:border-[#FF6B00] bg-canvas/40 hover:bg-canvas/80'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center mx-auto mb-1.5">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div className="text-xs font-bold text-heading">
                            Pilih File Foto atau Tarik ke Sini
                          </div>
                          <div className="text-[10px] text-mutedtext mt-0.5">
                            Format didukung: JPG, PNG, WebP (Maksimal 5MB)
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={formImageUrl}
                        onChange={(e) => {
                          setFormImageUrl(e.target.value);
                          setImagePreview(e.target.value || null);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                      />
                      {formImageUrl && (
                        <div className="p-2.5 bg-canvas/60 rounded-xl border border-borderline flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white border border-borderline overflow-hidden shrink-0">
                            <img
                              src={formImageUrl}
                              alt="Preview URL"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="text-[11px] text-mutedtext truncate flex-1 font-mono">
                            {formImageUrl}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2 flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#FF6B00] rounded focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-heading cursor-pointer">
                    Aktifkan menu ini pada mesin kasir (POS)
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-borderline flex items-center justify-between gap-3">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleDeleteProduct(editingProduct);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Menu Ini</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploadingImage}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-70 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {(isSaving || isUploadingImage) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isUploadingImage
                      ? 'Mengunggah Foto...'
                      : isSaving
                      ? 'Menyimpan...'
                      : 'Simpan Produk'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-heading">Hapus Menu Produk?</h3>
              <p className="text-xs text-mutedtext leading-relaxed">
                Apakah Anda yakin ingin menghapus menu{' '}
                <strong className="text-heading font-bold">"{productToDelete.name}"</strong>
                {productToDelete.sku ? ` (${productToDelete.sku})` : ''}?
                Tindakan ini permanen dan menu tidak akan muncul lagi di kasir.
              </p>
            </div>

            <div className="bg-canvas p-3 rounded-xl border border-borderline flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-borderline overflow-hidden shrink-0 flex items-center justify-center">
                {productToDelete.image_url ? (
                  <img
                    src={productToDelete.image_url}
                    alt={productToDelete.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Coffee className="w-5 h-5 text-[#FF6B00]" />
                )}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-bold text-heading truncate">{productToDelete.name}</div>
                <div className="text-[11px] text-[#FF6B00] font-bold">
                  {formatRupiah(productToDelete.selling_price)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-borderline">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Produk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
