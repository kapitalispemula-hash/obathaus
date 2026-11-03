'use client';

import React, { useState, useEffect } from 'react';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { dbService } from '@/lib/services/database';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { ExpenseCategory, OperatingExpense } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import {
  ReceiptText,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  Search,
  Filter,
  Store,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export default function PosExpensesPage() {
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();

  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'today' | '7days'>('this_month');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<OperatingExpense | null>(null);

  const [formCatId, setFormCatId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const targetOutletId = activeOutlet?.id || user?.primary_outlet_id || '';

  const loadData = async () => {
    try {
      setLoading(true);
      const [allExps, cats] = await Promise.all([
        dbService.getOperatingExpenses({ outletId: targetOutletId || undefined }),
        dbService.getExpenseCategories(),
      ]);
      setExpenses(allExps);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load outlet expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to local update events
    const handleLocalUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_expenses_updated', handleLocalUpdate);
    }

    // Live WebSockets Realtime Channel for POS expenses
    let realtimeChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        realtimeChannel = supabase
          .channel('obathaus_pos_expenses_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'operating_expenses' },
            () => loadData()
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime POS expenses subscription error:', err);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_expenses_updated', handleLocalUpdate);
      }
      if (realtimeChannel && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          supabase.removeChannel(realtimeChannel);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [targetOutletId]);

  const openAddModal = () => {
    setEditingExp(null);
    setFormCatId(categories[0]?.id || '');
    setFormTitle('');
    setFormAmount(50000);
    // default today in Asia/Makassar
    setFormDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }));
    setFormDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: OperatingExpense) => {
    setEditingExp(exp);
    setFormCatId(exp.category_id);
    setFormTitle(exp.title);
    setFormAmount(exp.amount);
    setFormDate(exp.expense_date);
    setFormDesc(exp.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Judul pengeluaran wajib diisi.');
      return;
    }
    if (!formCatId) {
      setFormError('Kategori biaya wajib dipilih.');
      return;
    }
    if (formAmount <= 0) {
      setFormError('Nominal biaya harus lebih besar dari Rp 0.');
      return;
    }
    if (!formDate) {
      setFormError('Tanggal pengeluaran wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingExp) {
        await dbService.updateOperatingExpense(editingExp.id, {
          category_id: formCatId,
          outlet_id: targetOutletId || editingExp.outlet_id,
          title: formTitle.trim(),
          amount: formAmount,
          expense_date: formDate,
          description: formDesc.trim() || null,
        });
      } else {
        await dbService.createOperatingExpense({
          category_id: formCatId,
          outlet_id: targetOutletId,
          title: formTitle.trim(),
          amount: formAmount,
          expense_date: formDate,
          description: formDesc.trim() || null,
          created_by: user?.id || null,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan pengeluaran operasional.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (exp: OperatingExpense) => {
    if (confirm(`Hapus pengeluaran "${exp.title}" senilai ${formatRupiah(exp.amount)}?`)) {
      try {
        await dbService.deleteOperatingExpense(exp.id);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus pengeluaran.');
      }
    }
  };

  // Filtered List
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = selectedCat === 'all' || e.category_id === selectedCat;

    let matchesPeriod = true;
    if (periodFilter === 'today') {
      matchesPeriod = e.expense_date === todayStr;
    } else if (periodFilter === 'this_month') {
      matchesPeriod = e.expense_date.startsWith(currentMonthPrefix);
    } else if (periodFilter === '7days') {
      const expTime = new Date(e.expense_date).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      matchesPeriod = expTime >= sevenDaysAgo;
    }

    return matchesSearch && matchesCat && matchesPeriod;
  });

  const totalFilteredAmount = filtered.reduce((acc, e) => acc + e.amount, 0);
  const maxExpenseItem = filtered.reduce((max, e) => (e.amount > max ? e.amount : max), 0);

  return (
    <CashierLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#FAFAFA] space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                <Store className="w-3.5 h-3.5" />
                <span>{activeOutlet ? activeOutlet.name : 'Outlet Cabang'}</span>
              </span>
              <span className="text-xs text-mutedtext">• Operasional Kasir</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Biaya Operasional Cabang
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Input pengeluaran rutin cabang (es batu, gas LPG, galon, kresek, dll.). Laporan ini terhubung langsung ke panel Owner.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Cabang</span>
          </button>
        </div>

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-borderline shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-mutedtext uppercase tracking-wider">
                Total Biaya Terfilter
              </span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <ReceiptText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-red-600 mt-2 tabular-nums">
              {formatRupiah(totalFilteredAmount)}
            </div>
            <p className="text-[11px] text-mutedtext mt-1">
              {filtered.length} transaksi pengeluaran cabang
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-borderline shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-mutedtext uppercase tracking-wider">
                Pengeluaran Terbesar
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-heading mt-2 tabular-nums">
              {formatRupiah(maxExpenseItem)}
            </div>
            <p className="text-[11px] text-mutedtext mt-1">
              Item beban nominal tertinggi
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-borderline shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-mutedtext uppercase tracking-wider">
                Sinkronisasi Finansial
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1.5">
              <span>Terintegrasi ke Owner (P&L)</span>
            </div>
            <p className="text-[11px] text-mutedtext mt-1">
              Mengurangi laba kotor cabang pada rekap bulanan
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul pengeluaran atau catatan nota..."
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
                  {c.category_name}
                </option>
              ))}
            </select>

            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            >
              <option value="this_month">Bulan Ini</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="all">Semua Riwayat</option>
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Judul Pengeluaran</th>
                  <th className="py-3.5 px-4">Kategori Biaya</th>
                  <th className="py-3.5 px-4 text-right">Nominal (IDR)</th>
                  <th className="py-3.5 px-4">Keterangan / Bon</th>
                  <th className="py-3.5 px-4">Penginput</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Memuat pengeluaran operasional cabang...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Tidak ada catatan pengeluaran operasional yang cocok.
                    </td>
                  </tr>
                ) : (
                  filtered.map((exp) => (
                    <tr key={exp.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-mutedtext whitespace-nowrap">
                        {exp.expense_date}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-heading">
                        {exp.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-canvas border border-borderline text-heading whitespace-nowrap">
                          {exp.category?.category_name || 'Operasional'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-red-600 tabular-nums whitespace-nowrap">
                        {formatRupiah(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-mutedtext text-xs max-w-xs truncate">
                        {exp.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-mutedtext whitespace-nowrap">
                        {exp.creator?.full_name || 'Kasir Outlet'}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Catatan Biaya"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp)}
                            className="p-1.5 text-mutedtext hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Biaya"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Catat Pengeluaran Cabang */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-heading text-base">
                  {editingExp ? 'Edit Pengeluaran Cabang' : 'Catat Pengeluaran Cabang'}
                </h3>
                <p className="text-xs text-[#FF6B00] font-semibold mt-0.5">
                  📍 {activeOutlet ? activeOutlet.name : 'Outlet Ini'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors cursor-pointer"
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
                  Kategori Pengeluaran *
                </label>
                <select
                  value={formCatId}
                  onChange={(e) => setFormCatId(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Judul Pengeluaran *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Beli Es Batu Kristal 5 Kantong"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Nominal Biaya (Rp) *
                </label>
                <input
                  type="number"
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl font-black text-red-600 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Tanggal Pengeluaran *
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Catatan Tambahan / Nomor Bon
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Nota #0412 Toko Jaya Plastik, darurat untuk cup es"
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div className="pt-4 border-t border-borderline flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CashierLayout>
  );
}
