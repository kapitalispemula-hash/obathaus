'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Supplier } from '@/types/database';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { INITIAL_SUPPLIERS } from '@/lib/mock-data';

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supCode, setSupCode] = useState('');
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState('Tempo 14 Hari');
  const [supIsActive, setSupIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await dbService.getSuppliers();
      setSuppliers(list);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setSupCode(`SUP-${String(suppliers.length + 1).padStart(3, '0')}`);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupTerms('Tempo 14 Hari (Net 14)');
    setSupIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setSupCode(s.code);
    setSupName(s.name);
    setSupContact(s.contact_person || '');
    setSupPhone(s.phone || '');
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupTerms(s.payment_terms || 'Tempo 14 Hari');
    setSupIsActive(s.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supCode.trim() || !supName.trim()) {
      setFormError('Kode dan nama supplier wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingSupplier) {
        await dbService.updateSupplier(editingSupplier.id, {
          code: supCode.trim().toUpperCase(),
          name: supName.trim(),
          contact_person: supContact.trim() || null,
          phone: supPhone.trim() || null,
          email: supEmail.trim() || null,
          address: supAddress.trim() || null,
          payment_terms: supTerms.trim() || null,
          is_active: supIsActive,
        });
      } else {
        await dbService.createSupplier({
          code: supCode.trim().toUpperCase(),
          name: supName.trim(),
          contact_person: supContact.trim() || null,
          phone: supPhone.trim() || null,
          email: supEmail.trim() || null,
          address: supAddress.trim() || null,
          payment_terms: supTerms.trim() || null,
          is_active: supIsActive,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (s: Supplier) => {
    try {
      await dbService.updateSupplier(s.id, { is_active: !s.is_active });
      loadData();
    } catch (err) {
      console.error('Failed to toggle supplier status:', err);
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-heading truncate">Data Supplier Bahan Baku</h1>
              <p className="text-xs text-mutedtext">
                Kelola mitra pengadaan bahan baku, kontak PIC, alamat logistik, dan termin pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="w-full sm:w-auto justify-center px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Supplier Baru</span>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="bg-white p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold text-heading">
            Total {suppliers.length} Mitra Pemasok Terdaftar
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau PIC supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Perusahaan Supplier</th>
                  <th className="py-3 px-4">Kontak PIC</th>
                  <th className="py-3 px-4">No. Telepon & Email</th>
                  <th className="py-3 px-4">Alamat Gudang / Kantor</th>
                  <th className="py-3 px-4">Termin Bayar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">
                      {s.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-heading">{s.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-heading">
                      {s.contact_person || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-mutedtext">
                      <div className="space-y-0.5">
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3 h-3 text-mutedtext shrink-0" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3 h-3 text-mutedtext shrink-0" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-mutedtext max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-mutedtext shrink-0" />
                        <span>{s.address || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                        {s.payment_terms || 'Tempo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(s)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                          s.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-canvas text-mutedtext border border-borderline hover:bg-slate-200/60'
                        }`}
                      >
                        {s.is_active ? (
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
                        onClick={() => openEditModal(s)}
                        className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                        title="Edit Data Supplier"
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

        {/* Modal Supplier */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
                <h3 className="font-bold text-heading text-sm sm:text-base">
                  {editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-[#FAFAFA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Kode Supplier *
                    </label>
                    <input
                      type="text"
                      value={supCode}
                      onChange={(e) => setSupCode(e.target.value)}
                      placeholder="SUP-001"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Nama PIC / Sales
                    </label>
                    <input
                      type="text"
                      value={supContact}
                      onChange={(e) => setSupContact(e.target.value)}
                      placeholder="Bpk. Hendrawan"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Nama Perusahaan Supplier *
                  </label>
                  <input
                    type="text"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="PT Mandiri Prima Beverage"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      No. Telepon / WA
                    </label>
                    <input
                      type="text"
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      placeholder="0812-4112-9901"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      Email Supplier
                    </label>
                    <input
                      type="email"
                      value={supEmail}
                      onChange={(e) => setSupEmail(e.target.value)}
                      placeholder="sales@supplier.co.id"
                      className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Alamat Lengkap / Gudang Supplier
                  </label>
                  <textarea
                    rows={2}
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    placeholder="Kawasan Industri Makassar (KIMA) Kavling 14"
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Termin Pembayaran (Payment Terms)
                  </label>
                  <select
                    value={supTerms}
                    onChange={(e) => setSupTerms(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    <option value="Cash On Delivery (COD)">Cash On Delivery (COD)</option>
                    <option value="Tempo 7 Hari (Net 7)">Tempo 7 Hari (Net 7)</option>
                    <option value="Tempo 14 Hari (Net 14)">Tempo 14 Hari (Net 14)</option>
                    <option value="Tempo 30 Hari (Net 30)">Tempo 30 Hari (Net 30)</option>
                    <option value="Bayar di Muka (Advance Payment)">Bayar di Muka (Advance Payment)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="supActive"
                    checked={supIsActive}
                    onChange={(e) => setSupIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF6B00] focus:ring-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="supActive" className="text-xs font-medium text-heading cursor-pointer">
                    Supplier Aktif untuk Pengadaan PO
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderline">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-borderline text-mutedtext hover:text-heading hover:bg-[#FAFAFA] rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Supplier'}
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
