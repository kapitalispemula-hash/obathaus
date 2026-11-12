'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Unit, UnitConversion, UnitType } from '@/types/database';
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { INITIAL_UNITS, INITIAL_UNIT_CONVERSIONS } from '@/lib/mock-data';

export default function AdminUnitsPage() {
  const [activeTab, setActiveTab] = useState<'units' | 'conversions'>('units');
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [conversions, setConversions] = useState<UnitConversion[]>(INITIAL_UNIT_CONVERSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Unit Modal
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [unitType, setUnitType] = useState<UnitType>('weight');
  const [unitFormError, setUnitFormError] = useState<string | null>(null);
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Conversion Modal
  const [isConvModalOpen, setIsConvModalOpen] = useState(false);
  const [fromUnitId, setFromUnitId] = useState('');
  const [toUnitId, setToUnitId] = useState('');
  const [convFactor, setConvFactor] = useState<number>(1000);
  const [convFormError, setConvFormError] = useState<string | null>(null);
  const [isSavingConv, setIsSavingConv] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uList, cList] = await Promise.all([
        dbService.getUnits(),
        dbService.getUnitConversions(),
      ]);
      setUnits(uList);
      setConversions(cList);
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddUnitModal = () => {
    setEditingUnit(null);
    setUnitCode('');
    setUnitName('');
    setUnitSymbol('');
    setUnitType('weight');
    setUnitFormError(null);
    setIsUnitModalOpen(true);
  };

  const openEditUnitModal = (u: Unit) => {
    setEditingUnit(u);
    setUnitCode(u.code);
    setUnitName(u.name);
    setUnitSymbol(u.symbol);
    setUnitType(u.unit_type);
    setUnitFormError(null);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnitFormError(null);

    if (!unitCode.trim() || !unitName.trim() || !unitSymbol.trim()) {
      setUnitFormError('Kode, nama, dan simbol satuan wajib diisi.');
      return;
    }

    setIsSavingUnit(true);
    try {
      if (editingUnit) {
        await dbService.updateUnit(editingUnit.id, {
          code: unitCode.trim().toUpperCase(),
          name: unitName.trim(),
          symbol: unitSymbol.trim(),
          unit_type: unitType,
        });
      } else {
        await dbService.createUnit({
          code: unitCode.trim().toUpperCase(),
          name: unitName.trim(),
          symbol: unitSymbol.trim(),
          unit_type: unitType,
        });
      }
      setIsUnitModalOpen(false);
      loadData();
    } catch (err: any) {
      setUnitFormError(err.message || 'Gagal menyimpan satuan.');
    } finally {
      setIsSavingUnit(false);
    }
  };

  const openAddConvModal = () => {
    setFromUnitId(units[1]?.id || units[0]?.id || '');
    setToUnitId(units[0]?.id || '');
    setConvFactor(1000);
    setConvFormError(null);
    setIsConvModalOpen(true);
  };

  const handleSaveConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvFormError(null);

    if (fromUnitId === toUnitId) {
      setConvFormError('Satuan asal dan tujuan tidak boleh sama.');
      return;
    }

    if (convFactor <= 0) {
      setConvFormError('Faktor konversi harus lebih besar dari 0.');
      return;
    }

    setIsSavingConv(true);
    try {
      await dbService.createUnitConversion({
        from_unit_id: fromUnitId,
        to_unit_id: toUnitId,
        conversion_factor: Number(convFactor),
      });
      setIsConvModalOpen(false);
      loadData();
    } catch (err: any) {
      setConvFormError(err.message || 'Gagal menambahkan aturan konversi.');
    } finally {
      setIsSavingConv(false);
    }
  };

  const handleDeleteConv = async (id: string) => {
    if (!confirm('Hapus aturan konversi ini?')) return;
    try {
      await dbService.deleteUnitConversion(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete conversion:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Satuan & Konversi Satuan</h1>
              <p className="text-xs text-mutedtext">
                Kamus satuan standar resep (gram, ml, pcs) dan faktor konversi pengadaan barang (kg, liter, pack, karton)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'units' ? (
              <button
                type="button"
                onClick={openAddUnitModal}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Satuan Baru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddConvModal}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aturan Konversi</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-borderline shadow-2xs overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('units')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'units'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'text-mutedtext hover:text-heading'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Master Satuan ({units.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conversions')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'conversions'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'text-mutedtext hover:text-heading'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Faktor Konversi ({conversions.length})</span>
          </button>
        </div>

        {/* Tab 1: Units Table */}
        {activeTab === 'units' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Kode Satuan</th>
                    <th className="py-3 px-4">Nama Satuan</th>
                    <th className="py-3 px-4 text-center">Simbol Display</th>
                    <th className="py-3 px-4 text-center">Tipe Fisik</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                        {u.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-heading">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-heading">
                        <span className="px-2 py-0.5 rounded bg-[#FAFAFA] border border-borderline">
                          {u.symbol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.unit_type === 'weight'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : u.unit_type === 'volume'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {u.unit_type === 'weight' ? 'Berat (Massa)' : u.unit_type === 'volume' ? 'Volume Cair' : 'Kuantitas (Pcs)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditUnitModal(u)}
                          className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                          title="Edit Satuan"
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

        {/* Tab 2: Conversions Table */}
        {activeTab === 'conversions' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="p-5 border-b border-borderline">
              <h3 className="font-bold text-heading text-sm">Tabel Pengali Konversi Bahan</h3>
              <p className="text-xs text-mutedtext">
                Digunakan sistem saat penerimaan barang dari supplier dalam kuantitas besar untuk dipecah ke satuan gramasi resep outlet
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Satuan Asal (Pengadaan)</th>
                    <th className="py-3 px-4 text-center">Simbol Konversi</th>
                    <th className="py-3 px-4">Satuan Target (Resep)</th>
                    <th className="py-3 px-4 text-right">Faktor Pengali Otomatis</th>
                    <th className="py-3 px-4">Rumus Kalkulasi</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {conversions.map((conv) => {
                    const fromUnit = units.find((u) => u.id === conv.from_unit_id);
                    const toUnit = units.find((u) => u.id === conv.to_unit_id);

                    return (
                      <tr key={conv.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-heading font-mono">
                            1 {fromUnit?.name || conv.from_unit_id} ({fromUnit?.symbol})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#FF6B00]">
                          <ArrowRight className="w-4 h-4 inline" />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-heading font-mono">
                            {toUnit?.name || conv.to_unit_id} ({toUnit?.symbol})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#FF6B00] text-sm">
                          = {conv.conversion_factor.toLocaleString()} {toUnit?.symbol}
                        </td>
                        <td className="py-3.5 px-4 text-mutedtext text-[11px] font-mono">
                          1 {fromUnit?.symbol} = {conv.conversion_factor} {toUnit?.symbol}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteConv(conv.id)}
                            className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Aturan Konversi"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Modal Unit */}
        {isUnitModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  {editingUnit ? 'Edit Satuan Standar' : 'Tambah Satuan Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
                {unitFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{unitFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Kode Satuan *
                    </label>
                    <input
                      type="text"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      placeholder="GRM"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Simbol *
                    </label>
                    <input
                      type="text"
                      value={unitSymbol}
                      onChange={(e) => setUnitSymbol(e.target.value)}
                      placeholder="g"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Satuan Lengkap *
                  </label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Gram"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Kategori Fisik
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as UnitType)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    <option value="weight">Berat / Massa (Gram, Kg, Ton)</option>
                    <option value="volume">Volume Cair (Mililiter, Liter)</option>
                    <option value="piece">Kuantitas Buah / Kemasan (Pcs, Pack, Dus)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingUnit}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingUnit ? 'Menyimpan...' : 'Simpan Satuan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Conversion */}
        {isConvModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  Tambah Aturan Konversi Satuan
                </h3>
                <button
                  type="button"
                  onClick={() => setIsConvModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveConversion} className="p-6 space-y-4">
                {convFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{convFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Satuan Pengadaan (Dari Satuan Besar) *
                  </label>
                  <select
                    value={fromUnitId}
                    onChange={(e) => setFromUnitId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Faktor Pengali (Berapa Banyak Isi di Dalamnya) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={convFactor}
                    onChange={(e) => setConvFactor(Number(e.target.value))}
                    placeholder="Contoh: 1000 atau 50"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                  <p className="text-[11px] text-mutedtext mt-1">
                    Contoh: 1 Kilogram = 1000 Gram, 1 Pack = 50 Pcs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Satuan Resep / Target (Ke Satuan Kecil) *
                  </label>
                  <select
                    value={toUnitId}
                    onChange={(e) => setToUnitId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
                  <button
                    type="button"
                    onClick={() => setIsConvModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConv}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingConv ? 'Menyimpan...' : 'Simpan Konversi'}
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
