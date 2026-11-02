'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Category, Product } from '@/types/database';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Coffee,
  CheckCircle,
  XCircle,
  LayoutGrid,
} from 'lucide-react';
import { CategoryIcon, AVAILABLE_CATEGORY_ICONS } from '@/components/common/CategoryIcon';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '@/lib/mock-data';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('Coffee');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        dbService.getCategories(),
        dbService.getProducts(),
      ]);
      setCategories(cats);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormIcon('Coffee');
    setFormOrder(categories.length + 1);
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || '');
    setFormIcon(cat.icon_name || 'Coffee');
    setFormOrder(cat.sort_order);
    setFormIsActive(cat.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama kategori wajib diisi.');
      return;
    }

    const slug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    setIsSaving(true);
    try {
      if (editingCategory) {
        await dbService.updateCategory(editingCategory.id, {
          name: formName.trim(),
          slug,
          description: formDesc.trim() || null,
          icon_name: formIcon,
          sort_order: formOrder,
          is_active: formIsActive,
        });
      } else {
        await dbService.createCategory({
          name: formName.trim(),
          slug,
          description: formDesc.trim() || null,
          icon_name: formIcon,
          sort_order: formOrder,
          is_active: formIsActive,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan kategori.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const prodCount = products.filter((p) => p.category_id === cat.id).length;
    if (prodCount > 0) {
      alert(`Kategori "${cat.name}" memiliki ${prodCount} produk aktif. Harap pindahkan produk ke kategori lain terlebih dahulu.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
      try {
        await dbService.deleteCategory(cat.id);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus kategori.');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Manajemen Kategori Menu
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Kelola kategori produk dan urutan tab filter yang tampil di halaman kasir POS.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori Baru</span>
          </button>
        </div>

        {/* Live Visual Preview of Categories (Matching Fast Food Menu Category Style) */}
        <div className="bg-white p-5 rounded-3xl border border-borderline shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-mutedtext">
              Preview Kartu Kategori di Layar Kasir (Menu Category)
            </span>
            <span className="text-[11px] font-bold text-[#FF6B00]">Live Menu Category Preview</span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            <div className="min-w-[80px] w-[80px] h-[92px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-[#FF6B00] text-white shadow-md shadow-orange-500/25 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-center leading-tight">All</span>
            </div>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="min-w-[80px] w-[80px] h-[92px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-white border border-[#F0F0F0] text-[#71717A] shadow-xs shrink-0 px-1"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FAFAFA] flex items-center justify-center text-[#71717A]">
                  <CategoryIcon
                    iconName={cat.icon_name}
                    categoryName={cat.name}
                    className="w-4 h-4"
                  />
                </div>
                <span className="text-[11px] font-bold text-center leading-tight line-clamp-1">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Urutan</th>
                  <th className="py-3.5 px-4">Nama Kategori</th>
                  <th className="py-3.5 px-4">Slug URL</th>
                  <th className="py-3.5 px-4">Deskripsi</th>
                  <th className="py-3.5 px-4 text-center">Jumlah Produk</th>
                  <th className="py-3.5 px-4 text-center">Status POS</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Memuat kategori...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Belum ada kategori yang dibuat.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => {
                    const prodCount = products.filter((p) => p.category_id === cat.id).length;
                    return (
                      <tr key={cat.id} className="hover:bg-canvas/60 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-mutedtext">
                          {cat.sort_order}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center shrink-0">
                              <CategoryIcon
                                iconName={cat.icon_name}
                                categoryName={cat.name}
                                className="w-4 h-4"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-heading">{cat.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-mutedtext">
                          {cat.slug}
                        </td>
                        <td className="py-3 px-4 text-mutedtext text-xs max-w-xs truncate">
                          {cat.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-heading">
                          {prodCount} menu
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.is_active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-canvas border border-borderline text-mutedtext'
                            }`}
                          >
                            {cat.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(cat)}
                              className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors"
                              title="Edit Kategori"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Hapus Kategori"
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

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <h3 className="font-bold text-heading text-base">
                {editingCategory ? 'Edit Kategori Menu' : 'Tambah Kategori Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 bg-white">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Coffee, Pastry, Non-Coffee"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Slug URL (Otomatis jika dikosongkan)
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="contoh: coffee"
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Urutan Tampilan di POS
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1.5">
                  Ikon Kategori Menu (Vektor Profesional)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-canvas rounded-xl border border-borderline max-h-44 overflow-y-auto">
                  {AVAILABLE_CATEGORY_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = formIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormIcon(item.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#FF6B00] text-[#FF6B00] shadow-xs ring-2 ring-[#FF6B00]/20'
                            : 'bg-white/60 border-borderline text-mutedtext hover:text-heading hover:bg-white'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] font-semibold truncate max-w-[50px]">
                          {item.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Deskripsi Kategori
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan singkat kategori..."
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#FF6B00] rounded focus:ring-[#FF6B00] border-borderline"
                />
                <label htmlFor="catActive" className="text-xs font-bold text-heading cursor-pointer">
                  Tampilkan tab kategori ini di layar kasir (POS)
                </label>
              </div>

              <div className="pt-4 border-t border-borderline flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
