'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { RawMaterial, RawMaterialCategory, Unit } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Layers,
  Search,
  CheckCircle,
  XCircle,
  Scale,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  INITIAL_RAW_MATERIALS,
  INITIAL_RAW_MATERIAL_CATEGORIES,
  INITIAL_UNITS,
} from '@/lib/mock-data';

export default function AdminRawMaterialsPage() {
  const [activeTab, setActiveTab] = useState<'materials' | 'categories'>('materials');
  const [materials, setMaterials] = useState<RawMaterial[]>(INITIAL_RAW_MATERIALS);
  const [categories, setCategories] = useState<RawMaterialCategory[]>(INITIAL_RAW_MATERIAL_CATEGORIES);
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Modal State Material
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [editingMat, setEditingMat] = useState<RawMaterial | null>(null);
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matSku, setMatSku] = useState('');
  const [matCategoryId, setMatCategoryId] = useState('');
  const [matUnitId, setMatUnitId] = useState('');
  const [matPackSize, setMatPackSize] = useState<number>(1);
  const [matRecipeUnitId, setMatRecipeUnitId] = useState<string>('');
  const [matMinStock, setMatMinStock] = useState<number>(100);
  const [matEstimatedCost, setMatEstimatedCost] = useState<number>(0);
  const [matIsActive, setMatIsActive] = useState(true);
  const [syncMinToOutlets, setSyncMinToOutlets] = useState(true);
  const [matFormError, setMatFormError] = useState<string | null>(null);
  const [isSavingMat, setIsSavingMat] = useState(false);

  // Modal State Category
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<RawMaterialCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catIsActive, setCatIsActive] = useState(true);
  const [catFormError, setCatFormError] = useState<string | null>(null);
  const [isSavingCat, setIsSavingCat] = useState(false);

  // Delete State Material
  const [materialToDelete, setMaterialToDelete] = useState<RawMaterial | null>(null);
  const [isDeletingMat, setIsDeletingMat] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [matList, catList, unitList] = await Promise.all([
        dbService.getRawMaterials(),
        dbService.getRawMaterialCategories(),
        dbService.getUnits(),
      ]);
      setMaterials(matList);
      setCategories(catList);
      setUnits(unitList);
    } catch (err) {
      console.error('Failed to load raw materials data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Material Modal Handlers
  const openAddMatModal = () => {
    setEditingMat(null);
    setMatCode(`RAW-${materials.length + 101}`);
    setMatName('');
    setMatSku('');
    setMatCategoryId(categories[0]?.id || '');
    setMatUnitId(units[0]?.id || '11111111-0000-0000-0000-000000000001');
    setMatPackSize(1);
    setMatRecipeUnitId('');
    setMatMinStock(100);
    setMatEstimatedCost(150);
    setMatIsActive(true);
    setSyncMinToOutlets(true);
    setMatFormError(null);
    setIsMatModalOpen(true);
  };

  const openEditMatModal = (m: RawMaterial) => {
    setEditingMat(m);
    setMatCode(m.code);
    setMatName(m.name);
    setMatSku(m.sku || '');
    setMatCategoryId(m.category_id);
    setMatUnitId(m.standard_unit_id);
    setMatPackSize(m.pack_size || 1);
    setMatRecipeUnitId(m.recipe_unit_id || '');
    setMatMinStock(m.minimum_stock);
    setMatEstimatedCost(m.estimated_unit_cost);
    setMatIsActive(m.is_active);
    setSyncMinToOutlets(true);
    setMatFormError(null);
    setIsMatModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatFormError(null);

    if (!matCode.trim() || !matName.trim()) {
      setMatFormError('Kode dan nama bahan baku wajib diisi.');
      return;
    }

    if (!matCategoryId) {
      setMatFormError('Pilih kategori bahan baku terlebih dahulu. Jika belum ada kategori, buat kategori terlebih dahulu pada tab "Kategori Bahan".');
      return;
    }

    if (!matUnitId) {
      setMatFormError('Pilih satuan resep standar (unit).');
      return;
    }

    setIsSavingMat(true);
    try {
      if (editingMat) {
        await dbService.updateRawMaterial(
          editingMat.id,
          {
            code: matCode.trim().toUpperCase(),
            name: matName.trim(),
            sku: matSku.trim() || null,
            category_id: matCategoryId,
            standard_unit_id: matUnitId,
            pack_size: Math.max(1, Number(matPackSize) || 1),
            recipe_unit_id: matRecipeUnitId && matRecipeUnitId !== matUnitId ? matRecipeUnitId : null,
            minimum_stock: Math.max(0, Number(matMinStock) || 0),
            estimated_unit_cost: Number(matEstimatedCost),
            is_active: matIsActive,
          },
          { syncOutletMinimums: syncMinToOutlets }
        );
      } else {
        await dbService.createRawMaterial({
          code: matCode.trim().toUpperCase(),
          name: matName.trim(),
          sku: matSku.trim() || null,
          category_id: matCategoryId,
          standard_unit_id: matUnitId,
          pack_size: Math.max(1, Number(matPackSize) || 1),
          recipe_unit_id: matRecipeUnitId && matRecipeUnitId !== matUnitId ? matRecipeUnitId : null,
          minimum_stock: Number(matMinStock),
          estimated_unit_cost: Number(matEstimatedCost),
          is_active: matIsActive,
        });
      }
      setIsMatModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMatFormError(err.message || 'Gagal menyimpan bahan baku.');
    } finally {
      setIsSavingMat(false);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    try {
      setIsDeletingMat(true);
      await dbService.deleteRawMaterial(materialToDelete.id);
      setMaterialToDelete(null);
      if (isMatModalOpen && editingMat?.id === materialToDelete.id) {
        setIsMatModalOpen(false);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error deleting raw material:', err);
      alert(err.message || 'Gagal menghapus bahan baku dari database.');
    } finally {
      setIsDeletingMat(false);
    }
  };

  // Category Modal Handlers
  const openAddCatModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setCatIsActive(true);
    setCatFormError(null);
    setIsCatModalOpen(true);
  };

  const openEditCatModal = (c: RawMaterialCategory) => {
    setEditingCat(c);
    setCatName(c.name);
    setCatDesc(c.description || '');
    setCatIsActive(c.is_active);
    setCatFormError(null);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError(null);

    if (!catName.trim()) {
      setCatFormError('Nama kategori wajib diisi.');
      return;
    }

    setIsSavingCat(true);
    try {
      if (editingCat) {
        await dbService.updateRawMaterialCategory(editingCat.id, {
          name: catName.trim(),
          description: catDesc.trim() || null,
          is_active: catIsActive,
        });
      } else {
        await dbService.createRawMaterialCategory({
          name: catName.trim(),
          description: catDesc.trim() || null,
          is_active: catIsActive,
        });
      }
      setIsCatModalOpen(false);
      loadData();
    } catch (err: any) {
      setCatFormError(err.message || 'Gagal menyimpan kategori bahan.');
    } finally {
      setIsSavingCat(false);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.sku && m.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === 'all' || m.category_id === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Master Bahan Baku & Kategori</h1>
              <p className="text-xs text-mutedtext">
                Kelola katalog bahan baku, satuan dasar resep, dan batas minimum stok untuk seluruh outlet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'materials' ? (
              <button
                type="button"
                onClick={openAddMatModal}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Bahan Baku</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddCatModal}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori Bahan</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-2 rounded-2xl border border-borderline shadow-2xs">
          <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'materials'
                  ? 'bg-white text-[#FF6B00] shadow-xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Daftar Bahan ({materials.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeTab === 'categories'
                  ? 'bg-white text-[#FF6B00] shadow-xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Kategori ({categories.length})</span>
            </button>
          </div>

          {activeTab === 'materials' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs font-medium text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Materials Table */}
        {activeTab === 'materials' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Kode & SKU</th>
                    <th className="py-3 px-4">Nama Bahan Baku</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Satuan Dasar</th>
                    <th className="py-3 px-4 text-right">Stok Minimum</th>
                    <th className="py-3 px-4 text-right">Est. Biaya Satuan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold text-[#FF6B00]">{m.code}</span>
                        {m.sku && <p className="text-[11px] text-mutedtext">{m.sku}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-heading">{m.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F4F5] text-heading border border-borderline">
                          {m.category?.name || 'Umum'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-[#FF6B00] font-mono font-bold text-[11px] border border-orange-100">
                          {m.standard_unit?.symbol || 'g'} ({m.standard_unit?.name || 'Gram'})
                        </span>
                        {m.pack_size && m.pack_size > 1 && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            isi {m.pack_size.toLocaleString('id-ID')} {m.recipe_unit?.symbol || (units.find((u) => u.id === m.recipe_unit_id)?.symbol) || 'pcs'}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-heading">
                        {m.minimum_stock.toLocaleString()} {m.standard_unit?.symbol || ''}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-mutedtext">
                        {formatRupiah(m.estimated_unit_cost)} / {m.standard_unit?.symbol || 'satuan'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-canvas text-mutedtext border border-borderline'
                          }`}
                        >
                          {m.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditMatModal(m)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Bahan Baku"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setMaterialToDelete(m)}
                            className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Bahan Baku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Categories Table */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Nama Kategori</th>
                    <th className="py-3 px-4">Deskripsi / Contoh Bahan</th>
                    <th className="py-3 px-4 text-center">Jumlah Bahan Terdaftar</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {categories.map((c) => {
                    const count = materials.filter((m) => m.category_id === c.id).length;
                    return (
                      <tr key={c.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-heading">{c.name}</td>
                        <td className="py-3.5 px-4 text-mutedtext">{c.description || '-'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-mono font-bold text-heading px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-borderline">
                            {count} bahan
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              c.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-canvas text-mutedtext border border-borderline'
                            }`}
                          >
                            {c.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => openEditCatModal(c)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Kategori"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Material */}
        {isMatModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  {editingMat ? 'Edit Master Bahan Baku' : 'Tambah Bahan Baku Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
                {matFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{matFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Kode Bahan *
                    </label>
                    <input
                      type="text"
                      value={matCode}
                      onChange={(e) => setMatCode(e.target.value)}
                      placeholder="MAT-01"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      SKU Bahan
                    </label>
                    <input
                      type="text"
                      value={matSku}
                      onChange={(e) => setMatSku(e.target.value)}
                      placeholder="RAW-MAT-001"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Bahan Baku *
                  </label>
                  <input
                    type="text"
                    value={matName}
                    onChange={(e) => setMatName(e.target.value)}
                    placeholder="Bubuk Matcha Uji Premium"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Kategori Bahan *
                    </label>
                    <select
                      value={matCategoryId}
                      onChange={(e) => setMatCategoryId(e.target.value)}
                      required
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    >
                      {categories.length === 0 ? (
                        <option value="" disabled>
                          -- Belum ada kategori, buat di tab Kategori --
                        </option>
                      ) : (
                        categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Satuan Stok / Gudang *
                    </label>
                    <select
                      value={matUnitId}
                      onChange={(e) => setMatUnitId(e.target.value)}
                      required
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-bold text-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    >
                      {units.length === 0 ? (
                        <option value="" disabled>
                          -- Belum ada satuan --
                        </option>
                      ) : (
                        units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.symbol})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Kolom Input Isi per Satuan (Pack Size / Rasio Konversi Bebas Semua Satuan) */}
                <div className="bg-[#FFF7ED] p-3.5 rounded-xl border border-[#FED7AA] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-heading">
                      Konversi Isi Satuan (Rasio Resep)
                    </label>
                    {matPackSize > 1 && matRecipeUnitId && matRecipeUnitId !== matUnitId ? (
                      <span className="text-[11px] font-bold text-[#FF6B00] bg-orange-100/90 px-2 py-0.5 rounded-md font-mono">
                        1 {units.find((u) => u.id === matUnitId)?.symbol || 'satuan'} = {matPackSize.toLocaleString('id-ID')} {units.find((u) => u.id === matRecipeUnitId)?.symbol || 'satuan'}
                      </span>
                    ) : matPackSize > 1 ? (
                      <span className="text-[11px] font-bold text-[#FF6B00] bg-orange-100/90 px-2 py-0.5 rounded-md font-mono">
                        1 {units.find((u) => u.id === matUnitId)?.symbol || 'satuan'} = {matPackSize.toLocaleString('id-ID')} pcs
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Jumlah Isi Kemasan:
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={matPackSize}
                        onChange={(e) => setMatPackSize(Math.max(1, Number(e.target.value) || 1))}
                        placeholder="Misal: 800, 500, 750, 1000"
                        className="w-full text-xs sm:text-sm p-2 bg-white border border-[#FED7AA] rounded-xl text-heading font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Satuan Isi / Takaran Resep:
                      </label>
                      <select
                        value={matRecipeUnitId}
                        onChange={(e) => setMatRecipeUnitId(e.target.value)}
                        className="w-full text-xs sm:text-sm p-2 bg-white border border-[#FED7AA] rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
                      >
                        <option value="">-- Sama dengan Satuan Stok --</option>
                        {units
                          .filter((u) => u.id !== matUnitId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-mutedtext leading-relaxed">
                    💡 Contoh: Bubuk Cokelat diisi <strong>800 Gram</strong>, Bubuk Matcha diisi <strong>500 Gram</strong>, Sirup diisi <strong>750 ml</strong>, Sedotan diisi <strong>500 pcs</strong>. Konversi ini melekat khusus pada bahan ini sehingga tidak akan bentrok dengan bahan lain.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Batas Min. Stok (Peringatan)
                    </label>
                    <input
                      type="number"
                      value={matMinStock}
                      onChange={(e) => setMatMinStock(Number(e.target.value))}
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Est. Biaya per Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      value={matEstimatedCost}
                      onChange={(e) => setMatEstimatedCost(Number(e.target.value))}
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="matActive"
                      checked={matIsActive}
                      onChange={(e) => setMatIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF6B00] focus:ring-[#FF6B00] border-borderline"
                    />
                    <label htmlFor="matActive" className="text-xs font-medium text-heading cursor-pointer">
                      Bahan Baku Aktif Digunakan di Resep
                    </label>
                  </div>

                  {editingMat && (
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/70">
                      <input
                        type="checkbox"
                        id="syncMinToOutlets"
                        checked={syncMinToOutlets}
                        onChange={(e) => setSyncMinToOutlets(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-[#FF6B00] focus:ring-[#FF6B00] border-orange-300"
                      />
                      <label htmlFor="syncMinToOutlets" className="text-xs text-heading cursor-pointer leading-snug">
                        <span className="font-semibold block">Terapkan Batas Min. Stok ini ke semua cabang</span>
                        <span className="text-[11px] text-mutedtext">
                          Otomatis menyamakan batas aman seluruh outlet/cabang (menimpa pengaturan khusus cabang).
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-borderline">
                  {editingMat ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMaterialToDelete(editingMat);
                        setIsMatModalOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Bahan</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMatModalOpen(false)}
                      className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMat}
                      className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSavingMat ? 'Menyimpan...' : 'Simpan Bahan'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Category */}
        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  {editingCat ? 'Edit Kategori Bahan' : 'Tambah Kategori Bahan Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                {catFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{catFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Kategori Bahan *
                  </label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Contoh: Bubuk Minuman & Powder"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Deskripsi / Catatan Bahan
                  </label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Contoh: Seluruh varian matcha, cokelat, taro, red velvet"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="catActive"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF6B00] focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="catActive" className="text-xs font-medium text-heading cursor-pointer">
                    Kategori Bahan Aktif
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCat}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingCat ? 'Menyimpan...' : 'Simpan Kategori'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Konfirmasi Hapus Bahan Baku */}
        {materialToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-heading text-sm sm:text-base">
                    Hapus Bahan Baku?
                  </h3>
                  <p className="text-xs text-mutedtext mt-1 leading-relaxed">
                    Bahan baku ini akan <span className="font-semibold text-red-600">dihapus permanen dari database</span> beserta data persediaan terkait di gudang dan seluruh outlet cabang. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              {/* Box Detail Bahan */}
              <div className="p-3.5 bg-canvas border border-borderline rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-borderline flex items-center justify-center shrink-0 text-[#FF6B00] font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-heading truncate">
                    {materialToDelete.name}
                  </div>
                  <div className="text-[11px] text-mutedtext flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-[#FF6B00] font-bold">{materialToDelete.code}</span>
                    <span>•</span>
                    <span>{materialToDelete.standard_unit?.symbol || 'satuan'}</span>
                    {materialToDelete.pack_size && materialToDelete.pack_size > 1 && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600">isi {materialToDelete.pack_size.toLocaleString('id-ID')} pcs</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-borderline">
                <button
                  type="button"
                  onClick={() => setMaterialToDelete(null)}
                  disabled={isDeletingMat}
                  className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMaterial}
                  disabled={isDeletingMat}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  {isDeletingMat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDeletingMat ? 'Menghapus...' : 'Ya, Hapus Bahan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
