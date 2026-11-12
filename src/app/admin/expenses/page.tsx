'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { INITIAL_EXPENSE_CATEGORIES } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { ExpenseCategory, OperatingExpense, Outlet } from '@/types/database';
import { formatRupiah, formatDateTime } from '@/lib/format';
import { DateRangeCalendarPicker } from '@/components/common/DateRangeCalendarPicker';
import {
  ReceiptText,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  Search,
  Store,
  Filter,
  Building2,
} from 'lucide-react';

export default function AdminExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(INITIAL_EXPENSE_CATEGORIES);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedCat, setSelectedCat] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<OperatingExpense | null>(null);

  const [formCatId, setFormCatId] = useState('');
  const [formOutletId, setFormOutletId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exps, cats, outs] = await Promise.all([
        dbService.getOperatingExpenses(),
        dbService.getExpenseCategories(),
        dbService.getOutlets(),
      ]);
      setExpenses(exps);
      setCategories(cats);
      setOutlets(outs);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to local update events (e.g. from POS modal or other components)
    const handleLocalUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_expenses_updated', handleLocalUpdate);
    }

    // Subscribe to Supabase Realtime changes on operating_expenses
    let realtimeChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        realtimeChannel = supabase
          .channel('obathaus_admin_expenses_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'operating_expenses' },
            () => {
              loadData();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime expenses subscription error:', err);
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
  }, []);

  const openAddModal = () => {
    setEditingExp(null);
    setFormCatId(categories[0]?.id || '');
    setFormOutletId(selectedOutlet !== 'all' && selectedOutlet !== 'central' ? selectedOutlet : '');
    setFormTitle('');
    setFormAmount(500000);
    setFormDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }));
    setFormDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: OperatingExpense) => {
    setEditingExp(exp);
    setFormCatId(exp.category_id);
    setFormOutletId(exp.outlet_id || '');
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
      setFormError('Nominal biaya harus lebih besar dari 0.');
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
          outlet_id: formOutletId || null,
          title: formTitle.trim(),
          amount: formAmount,
          expense_date: formDate,
          description: formDesc.trim() || null,
        });
      } else {
        await dbService.createOperatingExpense({
          category_id: formCatId,
          outlet_id: formOutletId || null,
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
      setFormError(err.message || 'Gagal menyimpan pengeluaran.');
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
  const filtered = expenses.filter((e) => {
    const matchesSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(search.toLowerCase())) ||
      (e.outlet && e.outlet.name.toLowerCase().includes(search.toLowerCase()));

    const matchesOutlet =
      selectedOutlet === 'all' ||
      (selectedOutlet === 'central' && !e.outlet_id) ||
      e.outlet_id === selectedOutlet;

    const matchesCat = selectedCat === 'all' || e.category_id === selectedCat;

    const matchesDate =
      (!startDate || e.expense_date >= startDate) &&
      (!endDate || e.expense_date <= endDate);

    return matchesSearch && matchesOutlet && matchesCat && matchesDate;
  });

  const totalExpenseSum = filtered.reduce((acc, e) => acc + e.amount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Biaya Operasional Toko & Cabang
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Kelola seluruh pengeluaran sewa, utilitas, gaji barista, dan supplies di 7 cabang dan kantor pusat untuk menghitung laba bersih operasional.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>

        {/* Total Expense Summary Banner */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center font-bold shrink-0">
              <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-bold text-mutedtext uppercase tracking-wider truncate">
                Total Biaya Operasional Terfilter
              </p>
              <h2 className="text-lg sm:text-2xl font-black text-red-600 tabular-nums mt-0.5 truncate">
                {formatRupiah(totalExpenseSum)}
              </h2>
            </div>
          </div>
          <div className="text-xs text-mutedtext sm:text-right">
            <span className="font-bold text-heading">{filtered.length}</span> transaksi pengeluaran • Diakui otomatis pada laporan laba rugi masing-masing cabang.
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col md:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedtext" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul biaya, catatan, atau nama cabang..."
              className="w-full pl-10 pr-4 py-2 bg-canvas border border-borderline rounded-xl text-xs sm:text-sm text-heading placeholder:text-mutedtext focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
            {/* Visual Monthly Calendar Date Picker */}
            <DateRangeCalendarPicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              align="left"
              className="w-full sm:w-auto [&>button]:w-full [&>button]:justify-between"
            />

            {/* Outlet Filter Dropdown */}
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="w-full sm:w-auto bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            >
              <option value="all">🌐 Semua Cabang & Pusat</option>
              <option value="central">🏢 Kantor Pusat (Beban Umum)</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  📍 {o.code}: {o.name.replace('Obat Haus - ', '')}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full sm:w-auto bg-canvas border border-borderline text-heading text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
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
                  <th className="py-3.5 px-4">Cabang Outlet</th>
                  <th className="py-3.5 px-4">Judul Pengeluaran</th>
                  <th className="py-3.5 px-4">Kategori Biaya</th>
                  <th className="py-3.5 px-4 text-right">Nominal (IDR)</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Memuat data pengeluaran...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Belum ada catatan pengeluaran operasional yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((exp) => (
                    <tr key={exp.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-mutedtext whitespace-nowrap">
                        {exp.expense_date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {exp.outlet ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                            <Store className="w-3 h-3" />
                            <span>{exp.outlet.code}: {exp.outlet.name.replace('Obat Haus - ', '')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>Kantor Pusat / Umum</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-heading">
                        {exp.title}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-canvas border border-borderline text-heading">
                          {exp.category?.category_name || 'Operasional'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-red-600 tabular-nums whitespace-nowrap">
                        {formatRupiah(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-mutedtext text-xs max-w-xs truncate">
                        {exp.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Biaya"
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

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <h3 className="font-bold text-heading text-base">
                {editingExp ? 'Edit Biaya Operasional' : 'Catat Pengeluaran Baru'}
              </h3>
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

              {/* Outlet Allocation */}
              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Alokasi Cabang / Outlet *
                </label>
                <select
                  value={formOutletId}
                  onChange={(e) => setFormOutletId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  <option value="">🏢 Kantor Pusat (Beban Umum)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      📍 {o.code}: {o.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  placeholder="Contoh: Tagihan Listrik PLN & Air PDAM"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Nominal Biaya (IDR) *
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
                  Keterangan / Nomor Bukti
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  placeholder="Keterangan tambahan atau catatan kwitansi..."
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
                  {isSaving ? 'Menyimpan...' : 'Simpan Biaya'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
