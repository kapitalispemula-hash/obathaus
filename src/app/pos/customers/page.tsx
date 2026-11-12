'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { dbService } from '@/lib/services/database';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { OutletCustomer } from '@/types/database';
import { formatDateTime } from '@/lib/format';
import {
  Users,
  UserPlus,
  Phone,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  MessageCircle,
} from 'lucide-react';

function toWaHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `https://wa.me/${digits}`;
  return `https://wa.me/62${digits}`;
}

export default function PosCustomersPage() {
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();
  const outletId = activeOutlet?.id || user?.primary_outlet_id || 'd0000000-0000-0000-0000-000000000001';

  const [customers, setCustomers] = useState<OutletCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Input Pelanggan (Nama & No. Telepon / WA)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Edit Modal
  const [editingCustomer, setEditingCustomer] = useState<OutletCustomer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const list = await dbService.getCustomers(outletId);
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load outlet customers:', err);
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    loadCustomers();

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel(`pos-customers-${outletId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'outlet_customers', filter: `outlet_id=eq.${outletId}` },
          () => void loadCustomers()
        )
        .subscribe();
    }

    return () => {
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [loadCustomers, outletId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setFormError('Nama pelanggan wajib diisi.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setFormError('Nomor telepon / WhatsApp minimal 7 digit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await dbService.createCustomer({
        outlet_id: outletId,
        name: name.trim(),
        phone: phone.trim(),
        created_by: user?.id || null,
      });
      setName('');
      setPhone('');
      setSuccessMsg(`Pelanggan "${saved.name}" (${saved.phone}) berhasil disimpan.`);
      await loadCustomers();
      nameInputRef.current?.focus();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (c: OutletCustomer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);
    setIsUpdating(true);
    try {
      await dbService.updateCustomer(editingCustomer.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data pelanggan.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (c: OutletCustomer) => {
    if (!confirm(`Hapus pelanggan "${c.name}" (${c.phone})?`)) return;
    try {
      await dbService.deleteCustomer(c.id);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data pelanggan.');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q);
  });

  const outletLabel = activeOutlet?.name || 'Cabang POS';

  return (
    <CashierLayout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
      <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#FBFBFC]">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#ECEEF1] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#18181B] tracking-tight">
                    Database Pelanggan Outlet
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#FF6B00]">
                    {outletLabel}
                  </span>
                </div>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Catat nama dan nomor telepon/WhatsApp pelanggan cabang untuk kebutuhan promo &amp; CRM outlet
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadCustomers}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#ECEEF1] bg-white hover:bg-slate-50 text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF6B00]' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Input Pelanggan (Nama & Telepon/WA) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#ECEEF1] shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#ECEEF1] flex items-center gap-2.5 bg-orange-50/40">
                <UserPlus className="w-4.5 h-4.5 text-[#FF6B00]" />
                <div>
                  <h2 className="text-sm font-black text-[#18181B]">Input Pelanggan Baru</h2>
                  <p className="text-[11px] text-[#71717A]">Hanya Nama &amp; Nomor Telepon / WA</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#18181B] mb-1.5">
                    Nama Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Andi Wijaya"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-sm font-medium text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#18181B] mb-1.5">
                    Nomor Telepon / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-sm font-mono font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] focus:bg-white transition-all"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1">
                    Format `+62` otomatis dirapikan ke `08...` dan langsung tersimpan ke cabang ini.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-[#EA580C] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data Pelanggan'}</span>
                </button>
              </form>
            </div>

            {/* Tabel Pelanggan Cabang */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#ECEEF1] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#ECEEF1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-[#18181B]">
                    Pelanggan Terdaftar ({filteredCustomers.length})
                  </h2>
                  <p className="text-[11px] text-[#71717A]">Khusus cabang {outletLabel}</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau no. WA..."
                    className="w-full pl-9 pr-3 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#ECEEF1] bg-slate-50/70 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">No. Telepon / WA</th>
                      <th className="py-3 px-4">Waktu Input</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF1] text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#71717A]">
                          Memuat database pelanggan...
                        </td>
                      </tr>
                    ) : filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#71717A]">
                          Belum ada data pelanggan di cabang ini.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#18181B]">{c.name}</td>
                          <td className="py-3 px-4">
                            <a
                              href={toWaHref(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-mono font-semibold text-emerald-700 hover:underline"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{c.phone}</span>
                            </a>
                          </td>
                          <td className="py-3 px-4 text-[#71717A] whitespace-nowrap">
                            {formatDateTime(c.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                                title="Edit Pelanggan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Pelanggan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Pelanggan */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#ECEEF1] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#ECEEF1] flex items-center justify-between">
              <h3 className="font-bold text-[#18181B] text-sm">Edit Data Pelanggan</h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-[#18181B] rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {editError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#18181B] mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#18181B] mb-1">Nomor Telepon / WA *</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#ECEEF1] rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECEEF1]">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-[#ECEEF1] text-xs font-bold text-[#71717A] hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CashierLayout>
  );
}
