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
  const [matMinStock, setMatMinStock] = useState<number>(100);
  const [matEstimatedCost, setMatEstimatedCost] = useState<number>(0);
  const [matIsActive, setMatIsActive] = useState(true);
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
    setMatMinStock(500);
    setMatEstimatedCost(150);
    setMatIsActive(true);
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
    setMatMinStock(m.minimum_stock);
    setMatEstimatedCost(m.estimated_unit_cost);
    setMatIsActive(m.is_active);
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
        await dbService.updateRawMaterial(editingMat.id, {
          code: matCode.trim().toUpperCase(),
          name: matName.trim(),
          sku: matSku.trim() || null,
          category_id: matCategoryId,
          standard_unit_id: matUnitId,
          minimum_stock: Number(matMinStock),
          estimated_unit_cost: Number(matEstimatedCost),
          is_active: matIsActive,
        });
      } else {
        await dbService.createRawMaterial({
          code: matCode.trim().toUpperCase(),
          name: matName.trim(),
          sku: matSku.trim() || null,
          category_id: matCategoryId,
          standard_unit_id: matUnitId,
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
                        <button
                          type="button"
                          onClick={() => openEditMatModal(m)}
                          className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                          title="Edit Bahan Baku"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
                      Satuan Resep *
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

                <div className="flex items-center gap-2.5 pt-1">
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

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
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
      </div>
    </AdminLayout>
  );
}
