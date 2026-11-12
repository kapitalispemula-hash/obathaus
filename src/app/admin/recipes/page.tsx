'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Recipe, Product, RawMaterial, RecipeItem, Category, Unit, UnitConversion } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import { convertUnitQuantity, enrichUnitConversions, getCompatibleUnits, roundStockQty } from '@/lib/unit-conversion';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  X,
  Layers,
  UtensilsCrossed,
  Sparkles,
  TrendingUp,
  Percent,
  DollarSign,
  Coffee,
  Info,
} from 'lucide-react';
import {
  INITIAL_RECIPES,
  INITIAL_PRODUCTS,
  INITIAL_RAW_MATERIALS,
  INITIAL_UNITS,
  INITIAL_UNIT_CONVERSIONS,
} from '@/lib/mock-data';

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_RAW_MATERIALS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [conversions, setConversions] = useState<UnitConversion[]>(INITIAL_UNIT_CONVERSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [servingSize, setServingSize] = useState('1 Cup 16oz');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [recipeItems, setRecipeItems] = useState<{
    raw_material_id: string;
    quantity: number;
    unit_id: string;
  }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail Modal
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rcpList, prodList, matList, catList, unitList, convList] = await Promise.all([
        dbService.getRecipes(),
        dbService.getProducts(),
        dbService.getRawMaterials(),
        dbService.getCategories(),
        dbService.getUnits(),
        dbService.getUnitConversions(),
      ]);
      setRecipes(rcpList);
      setProducts(prodList);
      setMaterials(matList);
      setCategories(catList);
      setUnits(unitList);
      setConversions(enrichUnitConversions(unitList, convList));
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRecipeId(null);
    // Find first product without recipe or fallback to first product
    const prodWithoutRecipe = products.find((p) => !recipes.some((r) => r.product_id === p.id)) || products[0];
    setSelectedProductId(prodWithoutRecipe?.id || '');
    setServingSize('1 Cup 16oz');
    setInstructions('1. Takar bahan sesuai porsi standar\n2. Campur bahan secara higienis\n3. Sajikan dingin/hangat dalam cup Obat Haus.');
    setNotes('Resep standar racikan Obat Haus');
    setRecipeItems([
      {
        raw_material_id: materials[0]?.id || '',
        quantity: 15,
        unit_id: materials[0]?.standard_unit_id || 'unit-gram',
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: Recipe) => {
    setEditingRecipeId(rec.id);
    setSelectedProductId(rec.product_id);
    setServingSize(rec.serving_size || '1 Cup 16oz');
    setInstructions(rec.instructions || '');
    setNotes(rec.notes || '');
    setRecipeItems(
      (rec.items || []).map((itm) => ({
        raw_material_id: itm.raw_material_id,
        quantity: itm.quantity,
        unit_id: itm.unit_id,
      }))
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    if (materials.length === 0) return;
    const firstMat = materials[0];
    setRecipeItems([
      ...recipeItems,
      {
        raw_material_id: firstMat.id,
        quantity: 1,
        unit_id: firstMat.standard_unit_id,
      },
    ]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx: number, field: string, value: any) => {
    const updated = [...recipeItems];
    if (field === 'raw_material_id') {
      const mat = materials.find((m) => m.id === value);
      updated[idx] = {
        ...updated[idx],
        raw_material_id: value,
        unit_id: mat?.standard_unit_id || updated[idx].unit_id,
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setRecipeItems(updated);
  };

  // Live calculation of recipe HPP & Margin (supports unit conversion e.g. kg -> gram)
  const getConvertedCostInfo = (rawMaterialId: string, quantity: number, recipeUnitId: string) => {
    const mat = materials.find((m) => m.id === rawMaterialId);
    const baseUnitCost = mat?.estimated_unit_cost || 0;
    const stdUnitId = mat?.standard_unit_id || recipeUnitId;
    const { convertedQuantity: stdQty, factor, matched } = convertUnitQuantity(
      quantity,
      recipeUnitId,
      stdUnitId,
      conversions
    );
    const unitCostInRecipeUnit = baseUnitCost * factor;
    const subtotal = quantity * unitCostInRecipeUnit;
    return { mat, stdUnitId, stdQty, factor, matched, unitCostInRecipeUnit, subtotal };
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const liveCalculatedHpp = recipeItems.reduce((acc, itm) => {
    const { subtotal } = getConvertedCostInfo(itm.raw_material_id, itm.quantity, itm.unit_id);
    return acc + subtotal;
  }, 0);

  const liveSellingPrice = selectedProduct?.selling_price || 0;
  const liveGrossProfit = liveSellingPrice - liveCalculatedHpp;
  const liveMarginPercentage =
    liveSellingPrice > 0 ? Math.round((liveGrossProfit / liveSellingPrice) * 1000) / 10 : 0;

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProductId) {
      setFormError('Pilih produk menu terlebih dahulu.');
      return;
    }
    if (recipeItems.length === 0) {
      setFormError('Tambahkan minimal 1 jenis bahan baku dalam resep.');
      return;
    }
    for (const itm of recipeItems) {
      if (itm.quantity <= 0) {
        setFormError('Kuantitas takaran bahan harus lebih besar dari 0.');
        return;
      }
    }

    try {
      setIsSaving(true);
      const itemsPayload: RecipeItem[] = recipeItems.map((itm, idx) => {
        const { unitCostInRecipeUnit, subtotal } = getConvertedCostInfo(
          itm.raw_material_id,
          itm.quantity,
          itm.unit_id
        );
        return {
          id: `rcpi-${Date.now()}-${idx}`,
          recipe_id: editingRecipeId || '',
          raw_material_id: itm.raw_material_id,
          quantity: itm.quantity,
          unit_id: itm.unit_id,
          unit_cost: Number(unitCostInRecipeUnit.toFixed(2)),
          total_cost: Number(subtotal.toFixed(2)),
        };
      });

      await dbService.saveRecipe({
        id: editingRecipeId || undefined,
        product_id: selectedProductId,
        serving_size: servingSize,
        instructions,
        notes,
        status: 'active',
        items: itemsPayload,
      });

      setFeedback(
        editingRecipeId
          ? `Resep menu "${selectedProduct?.name}" berhasil diperbarui.`
          : `Resep menu baru untuk "${selectedProduct?.name}" berhasil disimpan!`
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan resep');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecipe = async (id: string, name?: string) => {
    if (!confirm(`Yakin ingin menghapus resep untuk menu "${name || 'ini'}"?`)) return;
    try {
      await dbService.deleteRecipe(id);
      setFeedback('Resep menu berhasil dihapus.');
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus resep: ${err.message || err}`);
    }
  };

  // Metrics calculation
  const totalRecipes = recipes.length;
  const avgMargin =
    totalRecipes > 0
      ? Math.round(
          recipes.reduce((acc, r) => acc + (r.gross_margin_percentage || 0), 0) / totalRecipes
        )
      : 0;
  const avgHpp =
    totalRecipes > 0
      ? Math.round(recipes.reduce((acc, r) => acc + (r.total_estimated_hpp || 0), 0) / totalRecipes)
      : 0;

  const filteredRecipes = recipes.filter((r) => {
    const prod = r.product;
    const matchQuery =
      (prod?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod?.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.serving_size || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory =
      selectedCategory === 'all' || prod?.category_id === selectedCategory;

    return matchQuery && matchCategory;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center font-bold shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">
                Resep Menu & HPP Riil (Bill of Materials)
              </h1>
              <p className="text-xs text-subtle mt-0.5">
                Konfigurasi takaran bahan baku resep per cup, kalkulasi otomatis HPP, dan simulasi margin keuntungan
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Resep Menu Baru</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1 rounded-md"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 1. Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Total Resep</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shrink-0">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-dark">{totalRecipes} Resep</div>
            <div className="text-[10px] sm:text-xs text-subtle mt-0.5 truncate">Terhubung POS kasir</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Margin Rata-rata</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-700">{avgMargin}%</div>
            <div className="text-[10px] sm:text-xs text-emerald-600 font-medium mt-0.5 truncate">Margin laba kotor</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">HPP Rata-rata</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-blue-700 truncate">{formatRupiah(avgHpp)}</div>
            <div className="text-[10px] sm:text-xs text-subtle mt-0.5 truncate">Biaya bahan per cup</div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-medium text-subtle uppercase tracking-wider truncate">Stok Engine POS</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-black text-purple-700">Aktif & Sinkron</div>
            <div className="text-[10px] sm:text-xs text-purple-600 font-medium mt-0.5 truncate">Auto-debit bahan</div>
          </div>
        </div>

        {/* 2. Controls & Search */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk menu atau porsi..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#FF6B00]"
            >
              <option value="all">Semua Kategori Menu</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-subtle font-medium">
            Menampilkan <strong className="text-dark">{filteredRecipes.length}</strong> resep menu
          </div>
        </div>

        {/* 3. Recipes List Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/50 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                  <th className="py-3.5 px-5">Produk Menu</th>
                  <th className="py-3.5 px-4">Porsi / Takaran</th>
                  <th className="py-3.5 px-4 text-center">Bahan Baku (BOM)</th>
                  <th className="py-3.5 px-4 text-right">HPP Bahan Baku</th>
                  <th className="py-3.5 px-4 text-right">Harga Jual</th>
                  <th className="py-3.5 px-4 text-center">Margin Laba Kotor</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle">
                      Memuat daftar resep menu Obat Haus...
                    </td>
                  </tr>
                ) : filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle">
                      Belum ada resep yang terdaftar untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((rec) => {
                    const prod = rec.product;
                    const hpp = rec.total_estimated_hpp || 0;
                    const sellingPrice = prod?.selling_price || 0;
                    const margin = rec.gross_margin_percentage || 0;

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            {prod?.image_url ? (
                              <img
                                src={prod.image_url}
                                alt={prod.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00] shrink-0">
                                <Coffee className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-dark">{prod?.name || 'Menu'}</div>
                              <div className="text-xs text-subtle">
                                SKU: {prod?.sku || '-'} • {prod?.category?.name || 'Minuman'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-medium text-slate-700">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {rec.serving_size || '1 Cup 16oz'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {rec.items?.length || 0} Bahan Baku
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-slate-800">
                          {formatRupiah(hpp)}
                        </td>

                        <td className="py-4 px-4 text-right font-bold text-dark">
                          {formatRupiah(sellingPrice)}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              margin >= 70
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : margin >= 50
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <TrendingUp className="w-3 h-3" />
                            {margin}%
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingRecipe(rec)}
                              title="Lihat Rincian Resep & SOP"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(rec)}
                              title="Edit Takaran Resep"
                              className="p-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecipe(rec.id, prod?.name)}
                              title="Hapus Resep"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
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

        {/* 4. Modal Create / Edit Recipe */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-5 border-b border-borderline flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark">
                      {editingRecipeId ? 'Edit Resep & Takaran Bahan' : 'Buat Resep Menu Baru'}
                    </h3>
                    <p className="text-xs text-subtle">
                      Tentukan takaran bahan baku (BOM) per cup untuk pemotongan stok otomatis di kasir
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-subtle hover:text-dark p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveRecipe} className="p-6 overflow-y-auto space-y-5 flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Pilih Produk Menu <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      disabled={!!editingRecipeId}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] disabled:bg-slate-100"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatRupiah(p.selling_price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Ukuran Porsi / Saji <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="Contoh: 1 Cup 16oz atau 1 Shot 30ml"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                {/* Ingredients Bill of Materials */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Daftar Bahan Baku Racikan (BOM)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="text-xs text-[#FF6B00] hover:text-[#EA580C] font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Bahan
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Bahan Baku</th>
                          <th className="py-2.5 px-3 text-right w-28">Kuantitas</th>
                          <th className="py-2.5 px-3 text-center w-28">Satuan Resep</th>
                          <th className="py-2.5 px-3 text-right w-28">Biaya/Unit</th>
                          <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                          <th className="py-2.5 px-2 text-center w-12">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recipeItems.map((itm, idx) => {
                          const { mat, stdUnitId, stdQty, matched, unitCostInRecipeUnit, subtotal } =
                            getConvertedCostInfo(itm.raw_material_id, itm.quantity, itm.unit_id);
                          const compatibleUnits = getCompatibleUnits(stdUnitId, units, conversions);
                          const isDifferentUnit = itm.unit_id !== stdUnitId;

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <select
                                  value={itm.raw_material_id}
                                  onChange={(e) =>
                                    handleIngredientChange(idx, 'raw_material_id', e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#FF6B00]"
                                >
                                  {materials.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.sku})
                                    </option>
                                  ))}
                                </select>
                                {isDifferentUnit && matched && (
                                  <div className="text-[10px] text-emerald-700 font-medium mt-1">
                                    Konversi stok: potong {roundStockQty(stdQty, 4).toLocaleString('id-ID', { maximumFractionDigits: 4 })}{' '}
                                    {mat?.standard_unit?.symbol || ''} per cup
                                  </div>
                                )}
                              </td>

                              <td className="py-2 px-3 text-right align-top">
                                <input
                                  type="number"
                                  min={0.001}
                                  step="any"
                                  value={itm.quantity}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      idx,
                                      'quantity',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right font-bold focus:ring-1 focus:ring-[#FF6B00]"
                                />
                              </td>

                              <td className="py-2 px-3 text-center align-top">
                                {compatibleUnits.length > 1 ? (
                                  <select
                                    value={itm.unit_id}
                                    onChange={(e) =>
                                      handleIngredientChange(idx, 'unit_id', e.target.value)
                                    }
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
                                  >
                                    {compatibleUnits.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.symbol} ({u.name})
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="inline-block py-1.5 font-medium text-slate-500">
                                    {mat?.standard_unit?.symbol || '-'}
                                  </span>
                                )}
                              </td>

                              <td className="py-2 px-3 text-right text-slate-500 align-top">
                                <div className="py-1">{formatRupiah(unitCostInRecipeUnit)}</div>
                              </td>

                              <td className="py-2 px-3 text-right font-bold text-slate-800 align-top">
                                <div className="py-1">{formatRupiah(subtotal)}</div>
                              </td>

                              <td className="py-2 px-2 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientRow(idx)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Real-Time Live Profit Simulator Card */}
                <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-subtle block">Harga Jual Menu:</span>
                    <strong className="text-dark text-sm">{formatRupiah(liveSellingPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-subtle block">Total HPP Bahan (BOM):</span>
                    <strong className="text-rose-700 text-sm">{formatRupiah(liveCalculatedHpp)}</strong>
                  </div>
                  <div>
                    <span className="text-subtle block">Estimasi Laba Kotor:</span>
                    <strong className="text-emerald-700 text-sm">{formatRupiah(liveGrossProfit)}</strong>
                  </div>
                  <div>
                    <span className="text-subtle block">Margin Keuntungan:</span>
                    <span className="inline-flex items-center gap-1 font-black text-sm text-[#FF6B00]">
                      <Percent className="w-3.5 h-3.5" />
                      {liveMarginPercentage}%
                    </span>
                  </div>
                </div>

                {/* SOP Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    SOP / Petunjuk Pembuatan Barista
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Langkah-langkah pembuatan (misal: urutan menuang sirup, steaming susu, topping)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-borderline flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Resep Menu'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Modal Detail Resep (Read Only) */}
        {viewingRecipe && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="px-6 py-5 border-b border-borderline flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark">{viewingRecipe.product?.name || 'Resep Menu'}</h3>
                    <p className="text-xs text-subtle">
                      Porsi: {viewingRecipe.serving_size || '1 Cup 16oz'} • Versi {viewingRecipe.version}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRecipe(null)}
                  className="text-subtle hover:text-dark p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Profit bar */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-subtle block mb-1">Harga Jual:</span>
                    <strong className="text-sm text-dark">
                      {formatRupiah(viewingRecipe.product?.selling_price || 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-subtle block mb-1">Total HPP:</span>
                    <strong className="text-sm text-rose-700">
                      {formatRupiah(viewingRecipe.total_estimated_hpp || 0)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-subtle block mb-1">Laba Kotor:</span>
                    <strong className="text-sm text-emerald-700">
                      {formatRupiah(
                        (viewingRecipe.product?.selling_price || 0) -
                          (viewingRecipe.total_estimated_hpp || 0)
                      )}
                    </strong>
                  </div>
                  <div>
                    <span className="text-subtle block mb-1">Margin:</span>
                    <strong className="text-sm text-[#FF6B00]">
                      {viewingRecipe.gross_margin_percentage}%
                    </strong>
                  </div>
                </div>

                {/* Ingredients table */}
                <div>
                  <span className="font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                    Rincian Komposisi Bahan:
                  </span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Bahan Baku</th>
                          <th className="py-2 px-3 text-right">Takaran</th>
                          <th className="py-2 px-3 text-right">Biaya Satuan</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingRecipe.items?.map((itm) => {
                          const mat = itm.raw_material;
                          const stdUnitId = mat?.standard_unit_id || itm.unit_id;
                          const recipeSymbol = itm.unit?.symbol || mat?.standard_unit?.symbol || '';
                          const { convertedQuantity: stdQty, matched } = convertUnitQuantity(
                            itm.quantity,
                            itm.unit_id,
                            stdUnitId,
                            conversions
                          );
                          const isConverted = itm.unit_id !== stdUnitId && matched;

                          return (
                            <tr key={itm.id}>
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {mat?.name || 'Bahan'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                <div>
                                  {itm.quantity.toLocaleString('id-ID', { maximumFractionDigits: 3 })} {recipeSymbol}
                                </div>
                                {isConverted && (
                                  <div className="text-[10px] font-medium text-emerald-700">
                                    potong stok: {roundStockQty(stdQty, 4).toLocaleString('id-ID', { maximumFractionDigits: 4 })}{' '}
                                    {mat?.standard_unit?.symbol || ''}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-500">
                                {formatRupiah(itm.unit_cost || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                {formatRupiah(itm.total_cost || 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SOP */}
                {viewingRecipe.instructions && (
                  <div>
                    <span className="font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                      Petunjuk SOP Barista:
                    </span>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed">
                      {viewingRecipe.instructions}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setViewingRecipe(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
