'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Outlet, Warehouse } from '@/types/database';
import { useOutlet } from '@/lib/outlet-context';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Store,
  Warehouse as WarehouseIcon,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Search,
  Receipt,
  FileText,
} from 'lucide-react';
import { INITIAL_OUTLETS, INITIAL_WAREHOUSES } from '@/lib/mock-data';

export default function AdminOutletsPage() {
  const { refreshOutlets } = useOutlet();
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(INITIAL_WAREHOUSES);
  const [activeTab, setActiveTab] = useState<'outlets' | 'warehouse'>('outlets');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State Outlet
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [outletCode, setOutletCode] = useState('');
  const [outletName, setOutletName] = useState('');
  const [outletAddress, setOutletAddress] = useState('');
  const [outletPhone, setOutletPhone] = useState('');
  const [outletIsActive, setOutletIsActive] = useState(true);
  const [outletInvoicePrefix, setOutletInvoicePrefix] = useState('');
  const [outletReceiptHeader, setOutletReceiptHeader] = useState('');
  const [outletReceiptFooter, setOutletReceiptFooter] = useState('');
  const [outletFormError, setOutletFormError] = useState<string | null>(null);
  const [isSavingOutlet, setIsSavingOutlet] = useState(false);

  // Modal State Warehouse
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseCode, setWarehouseCode] = useState('');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehousePhone, setWarehousePhone] = useState('');
  const [warehouseIsActive, setWarehouseIsActive] = useState(true);
  const [warehouseFormError, setWarehouseFormError] = useState<string | null>(null);
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outList, whList] = await Promise.all([
        dbService.getOutlets(),
        dbService.getWarehouses(),
      ]);
      setOutlets(outList);
      setWarehouses(whList);
    } catch (err) {
      console.error('Failed to load outlets/warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Outlet Handlers ---
  const openAddOutletModal = () => {
    setEditingOutlet(null);
    const nextNum = outlets.length + 1;
    const code = `OUT-0${nextNum}`;
    setOutletCode(code);
    setOutletName('');
    setOutletAddress('');
    setOutletPhone('');
    setOutletIsActive(true);
    setOutletInvoicePrefix(`INV-OB0${nextNum}`);
    setOutletReceiptHeader('');
    setOutletReceiptFooter('');
    setOutletFormError(null);
    setIsOutletModalOpen(true);
  };

  const openEditOutletModal = (item: Outlet) => {
    setEditingOutlet(item);
    setOutletCode(item.code);
    setOutletName(item.name);
    setOutletAddress(item.address || '');
    setOutletPhone(item.phone || '');
    setOutletIsActive(item.is_active);
    setOutletInvoicePrefix(item.invoice_prefix || '');
    setOutletReceiptHeader(item.receipt_header || '');
    setOutletReceiptFooter(item.receipt_footer || '');
    setOutletFormError(null);
    setIsOutletModalOpen(true);
  };

  const handleSaveOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutletFormError(null);

    if (!outletCode.trim() || !outletName.trim()) {
      setOutletFormError('Kode dan nama cabang outlet wajib diisi.');
      return;
    }

    setIsSavingOutlet(true);
    try {
      const payload: Partial<Outlet> = {
        code: outletCode.trim().toUpperCase(),
        name: outletName.trim(),
        address: outletAddress.trim() || null,
        phone: outletPhone.trim() || null,
        is_active: outletIsActive,
        invoice_prefix: outletInvoicePrefix.trim().toUpperCase() || null,
        receipt_header: outletReceiptHeader.trim() || null,
        receipt_footer: outletReceiptFooter.trim() || null,
      };

      if (editingOutlet) {
        await dbService.updateOutlet(editingOutlet.id, payload);
      } else {
        await dbService.createOutlet(payload);
      }
      setIsOutletModalOpen(false);
      await loadData();
      await refreshOutlets();
    } catch (err: any) {
      setOutletFormError(err.message || 'Gagal menyimpan outlet.');
    } finally {
      setIsSavingOutlet(false);
    }
  };

  const handleToggleOutletStatus = async (item: Outlet) => {
    try {
      await dbService.updateOutlet(item.id, { is_active: !item.is_active });
      await loadData();
      await refreshOutlets();
    } catch (err) {
      console.error('Failed to toggle outlet status:', err);
    }
  };

  // --- Warehouse Handlers ---
  const openEditWarehouseModal = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setWarehouseCode(wh.code);
    setWarehouseName(wh.name);
    setWarehouseAddress(wh.address || '');
    setWarehousePhone(wh.phone || '');
    setWarehouseIsActive(wh.is_active);
    setWarehouseFormError(null);
    setIsWarehouseModalOpen(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarehouseFormError(null);

    if (!warehouseName.trim()) {
      setWarehouseFormError('Nama gudang pusat wajib diisi.');
      return;
    }

    setIsSavingWarehouse(true);
    try {
      if (editingWarehouse) {
        await dbService.updateWarehouse(editingWarehouse.id, {
          code: warehouseCode.trim().toUpperCase(),
          name: warehouseName.trim(),
          address: warehouseAddress.trim() || null,
          phone: warehousePhone.trim() || null,
          is_active: warehouseIsActive,
        });
      }
      setIsWarehouseModalOpen(false);
      await loadData();
      await refreshOutlets();
    } catch (err: any) {
      setWarehouseFormError(err.message || 'Gagal menyimpan gudang.');
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const filteredOutlets = outlets.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.address && o.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">Manajemen Cabang & Gudang</h1>
              <p className="text-xs text-mutedtext">
                Kelola jaringan 7 outlet Obat Haus dan 1 gudang pusat logistik Kota Makassar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'outlets' && (
              <button
                type="button"
                onClick={openAddOutletModal}
                className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Cabang Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-borderline shadow-2xs">
          <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('outlets')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'outlets'
                  ? 'bg-white text-[#FF6B00] shadow-xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Daftar Cabang Outlet ({outlets.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('warehouse')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'warehouse'
                  ? 'bg-white text-[#FF6B00] shadow-xs'
                  : 'text-mutedtext hover:text-heading'
              }`}
            >
              <WarehouseIcon className="w-4 h-4" />
              <span>Gudang Pusat ({warehouses.length})</span>
            </button>
          </div>

          {activeTab === 'outlets' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode atau nama cabang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
              />
            </div>
          )}
        </div>

        {/* Tab Content: Outlets */}
        {activeTab === 'outlets' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Kode</th>
                    <th className="py-3 px-4">Nama Cabang Outlet</th>
                    <th className="py-3 px-4">Alamat Lokasi</th>
                    <th className="py-3 px-4">No. Telepon / PIC</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {filteredOutlets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-mutedtext">
                        Tidak ada cabang yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredOutlets.map((outlet) => (
                      <tr key={outlet.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                          <p>{outlet.code}</p>
                          {outlet.invoice_prefix && (
                            <span className="text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 block w-fit mt-0.5" title="Prefix Invoice Cabang">
                              {outlet.invoice_prefix}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-heading">{outlet.name}</span>
                            {outlet.code === 'OUT-01' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                                Flagship Store
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-mutedtext max-w-xs truncate">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-mutedtext shrink-0" />
                            <span>{outlet.address || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-mutedtext">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-mutedtext shrink-0" />
                            <span>{outlet.phone || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleOutletStatus(outlet)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                              outlet.is_active
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-[#FAFAFA] text-mutedtext hover:bg-slate-200/60 border border-borderline'
                            }`}
                          >
                            {outlet.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-mutedtext" />
                                <span>Nonaktif</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => openEditOutletModal(outlet)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Cabang"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Central Warehouse */}
        {activeTab === 'warehouse' && (
          <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
            <div className="p-5 border-b border-borderline flex items-center justify-between">
              <div>
                <h3 className="font-bold text-heading text-sm">Gudang Logistik Utama Obat Haus</h3>
                <p className="text-xs text-mutedtext">
                  Titik pusat penyimpanan bahan baku, penerimaan PO supplier, dan distribusi surat jalan ke 7 outlet
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Kode Gudang</th>
                    <th className="py-3 px-4">Nama Fasilitas Gudang</th>
                    <th className="py-3 px-4">Alamat Fasilitas</th>
                    <th className="py-3 px-4">No. Telepon / Pengawas</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {warehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {wh.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-heading">{wh.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-mutedtext shrink-0" />
                          <span>{wh.address || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-mutedtext shrink-0" />
                          <span>{wh.phone || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Operasional Aktif</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openEditWarehouseModal(wh)}
                          className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                          title="Edit Gudang"
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

        {/* Modal Outlet Add / Edit */}
        {isOutletModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-borderline overflow-hidden flex flex-col max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between shrink-0 bg-white">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  {editingOutlet ? 'Edit Data Cabang Outlet' : 'Tambah Cabang Outlet Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOutletModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveOutlet} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {outletFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{outletFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Kode Cabang (Contoh: OUT-08) *
                  </label>
                  <input
                    type="text"
                    value={outletCode}
                    onChange={(e) => setOutletCode(e.target.value)}
                    placeholder="OUT-08"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Cabang Outlet *
                  </label>
                  <input
                    type="text"
                    value={outletName}
                    onChange={(e) => setOutletName(e.target.value)}
                    placeholder="Obat Haus - BTP Tamalanrea"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Alamat Lengkap Cabang
                  </label>
                  <textarea
                    rows={2}
                    value={outletAddress}
                    onChange={(e) => setOutletAddress(e.target.value)}
                    placeholder="Jl. Tamalanrea Raya Blok M No. 15, Makassar"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nomor Telepon / WhatsApp Outlet
                  </label>
                  <input
                    type="text"
                    value={outletPhone}
                    onChange={(e) => setOutletPhone(e.target.value)}
                    placeholder="0811-4401-008"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                {/* Section Format Invoice & Struk Cabang */}
                <div className="pt-3 border-t border-borderline space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#FF6B00]" />
                    <span className="text-xs font-black text-heading uppercase tracking-wider">
                      Format Invoice & Struk Kasir Khusus Cabang
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Prefix Nomor Invoice Cabang (Contoh: INV-HSD)
                    </label>
                    <input
                      type="text"
                      value={outletInvoicePrefix}
                      onChange={(e) => setOutletInvoicePrefix(e.target.value.toUpperCase())}
                      placeholder="INV-HSD"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                    <p className="text-[10px] text-mutedtext mt-0.5">
                      Nomor nota kasir di cabang ini akan menggunakan prefix ini (misal: {outletInvoicePrefix || 'INV-XXX'}-20261102-0001).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Header Khusus Struk Kasir Cabang (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={outletReceiptHeader}
                      onChange={(e) => setOutletReceiptHeader(e.target.value)}
                      placeholder="Obat Haus - Cabang Hasanuddin&#10;Kopi, Teh & Minuman Segar"
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Footer Khusus Struk Kasir Cabang (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={outletReceiptFooter}
                      onChange={(e) => setOutletReceiptFooter(e.target.value)}
                      placeholder="Terima kasih atas kunjungan Anda!&#10;Follow IG: @obathaus.hasanuddin"
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="outletActive"
                    checked={outletIsActive}
                    onChange={(e) => setOutletIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF6B00] focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="outletActive" className="text-xs font-medium text-heading cursor-pointer">
                    Cabang Outlet Beroperasi Aktif
                  </label>
                </div>
                </div>

                <div className="px-6 py-3.5 bg-slate-50 border-t border-borderline flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOutletModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingOutlet}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingOutlet ? 'Menyimpan...' : 'Simpan Cabang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Warehouse Edit */}
        {isWarehouseModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-borderline overflow-hidden flex flex-col max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between shrink-0 bg-white">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  Edit Data Gudang Pusat
                </h3>
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWarehouse} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {warehouseFormError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{warehouseFormError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Kode Gudang
                  </label>
                  <input
                    type="text"
                    value={warehouseCode}
                    onChange={(e) => setWarehouseCode(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Gudang Logistik *
                  </label>
                  <input
                    type="text"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Alamat Fasilitas Gudang
                  </label>
                  <textarea
                    rows={2}
                    value={warehouseAddress}
                    onChange={(e) => setWarehouseAddress(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nomor Kontak Operasional
                  </label>
                  <input
                    type="text"
                    value={warehousePhone}
                    onChange={(e) => setWarehousePhone(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                </div>

                <div className="px-6 py-3.5 bg-slate-50 border-t border-borderline flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsWarehouseModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingWarehouse}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingWarehouse ? 'Menyimpan...' : 'Simpan Gudang'}
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
