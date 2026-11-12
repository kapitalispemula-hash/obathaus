'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { Outlet, OutletCustomer } from '@/types/database';
import { formatDateTime } from '@/lib/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Search,
  Building2,
  Download,
  FileSpreadsheet,
  FileText,
  Upload,
  Plus,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
} from 'lucide-react';

function toWaHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `https://wa.me/62${digits.slice(1)}`;
  if (digits.startsWith('62')) return `https://wa.me/${digits}`;
  return `https://wa.me/62${digits}`;
}

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const { settings } = useCart();

  const [customers, setCustomers] = useState<OutletCustomer[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Customer Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OutletCustomer | null>(null);
  const [formOutletId, setFormOutletId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // Import Excel Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importOutletId, setImportOutletId] = useState('');
  const [importRows, setImportRows] = useState<
    { outlet_id: string; outlet_name: string; name: string; phone: string }[]
  >([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [custList, outList] = await Promise.all([
        dbService.getCustomers(),
        dbService.getOutlets(),
      ]);
      setCustomers(custList);
      setOutlets(outList);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setFeedback({ type: 'error', text: err.message || 'Gagal memuat data pelanggan.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel('admin-outlet-customers')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'outlet_customers' }, () => {
          void loadData();
        })
        .subscribe();
    }

    return () => {
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  const filteredCustomers = customers.filter((c) => {
    const matchOutlet = selectedOutletId === 'all' || c.outlet_id === selectedOutletId;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchOutlet;
    const outletName = (c.outlet?.name || '').toLowerCase();
    const creatorName = (c.creator?.full_name || '').toLowerCase();
    return (
      matchOutlet &&
      (c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        outletName.includes(q) ||
        creatorName.includes(q))
    );
  });

  const selectedOutletObj = outlets.find((o) => o.id === selectedOutletId);
  const selectedOutletLabel =
    selectedOutletId === 'all'
      ? 'Semua Outlet (Konsolidasi)'
      : selectedOutletObj?.name || 'Outlet Cabang';

  const todayWita = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  const todayCount = filteredCustomers.filter((c) => {
    const d = new Date(c.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    return d === todayWita;
  }).length;

  const activeBranchesWithCustomers = new Set(customers.map((c) => c.outlet_id)).size;

  // =========================================================================
  // DOWNLOAD EXCEL (.xlsx)
  // =========================================================================
  const handleDownloadExcel = () => {
    if (filteredCustomers.length === 0) {
      setFeedback({ type: 'error', text: 'Tidak ada data pelanggan untuk diunduh.' });
      return;
    }

    const sheetData = filteredCustomers.map((c, idx) => ({
      No: idx + 1,
      'Nama Pelanggan': c.name,
      'No. Telepon / WA': c.phone,
      'Outlet / Cabang': c.outlet?.name || outlets.find((o) => o.id === c.outlet_id)?.name || '-',
      'Diinput Oleh': c.creator?.full_name || 'Kasir',
      'Tanggal Input': formatDateTime(c.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 18 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Database Pelanggan');

    const slug =
      selectedOutletId === 'all'
        ? 'Semua_Cabang'
        : (selectedOutletObj?.code || selectedOutletObj?.name || 'Cabang').replace(/\s+/g, '_');
    const dateSlug = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Database_Pelanggan_${slug}_${dateSlug}.xlsx`);
  };

  // =========================================================================
  // DOWNLOAD PDF (.pdf)
  // =========================================================================
  const handleDownloadPDF = () => {
    if (filteredCustomers.length === 0) {
      setFeedback({ type: 'error', text: 'Tidak ada data pelanggan untuk diunduh.' });
      return;
    }

    const doc = new jsPDF();
    const store = settings?.store_name || 'Obat Haus';

    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text(`${store} - Database Pelanggan`, 14, 18);

    doc.setFontSize(9.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`Filter Outlet: ${selectedOutletLabel} | Total: ${filteredCustomers.length} pelanggan`, 14, 25);
    doc.text(`Dicetak: ${formatDateTime(new Date())}`, 14, 30);

    const rows = filteredCustomers.map((c, idx) => [
      String(idx + 1),
      c.name,
      c.phone,
      (c.outlet?.name || outlets.find((o) => o.id === c.outlet_id)?.name || '-').replace('Obat Haus - ', ''),
      c.creator?.full_name || 'Kasir',
      formatDateTime(c.created_at),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['No', 'Nama Pelanggan', 'No. Telepon / WA', 'Outlet / Cabang', 'Diinput Oleh', 'Tanggal Input']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [255, 107, 0], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 42 },
        2: { cellWidth: 32 },
        3: { cellWidth: 40 },
        4: { cellWidth: 28 },
        5: { cellWidth: 30 },
      },
    });

    const slug =
      selectedOutletId === 'all'
        ? 'Semua_Cabang'
        : (selectedOutletObj?.code || selectedOutletObj?.name || 'Cabang').replace(/\s+/g, '_');
    const dateSlug = new Date().toISOString().slice(0, 10);
    doc.save(`Database_Pelanggan_${slug}_${dateSlug}.pdf`);
  };

  // =========================================================================
  // IMPORT EXCEL (.xlsx / .csv)
  // =========================================================================
  const openImportModal = () => {
    const defaultOutlet =
      selectedOutletId !== 'all' ? selectedOutletId : outlets[0]?.id || '';
    setImportOutletId(defaultOutlet);
    setImportRows([]);
    setImportFileName('');
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    const defaultOutletName =
      outlets.find((o) => o.id === (importOutletId || outlets[0]?.id))?.name ||
      'Obat Haus - Cabang Utama';
    const sampleRows = [
      {
        'Nama Pelanggan': 'Budi Santoso',
        'No. Telepon / WA': '081234567890',
        'Outlet / Cabang': defaultOutletName,
      },
      {
        'Nama Pelanggan': 'Siti Aminah',
        'No. Telepon / WA': '082198765432',
        'Outlet / Cabang': defaultOutletName,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pelanggan');
    XLSX.writeFile(wb, 'Template_Import_Pelanggan_ObatHaus.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        setImportError('File Excel tidak memiliki sheet.');
        return;
      }

      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[firstSheet], {
        defval: '',
      });

      if (rawJson.length === 0) {
        setImportError('File kosong atau tidak ada baris data.');
        return;
      }

      const fallbackOutletId = importOutletId || outlets[0]?.id || '';
      const parsed: { outlet_id: string; outlet_name: string; name: string; phone: string }[] = [];

      for (const row of rawJson) {
        const lowerMap: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          lowerMap[k.trim().toLowerCase()] = v;
        }

        const rawName =
          lowerMap['nama pelanggan'] ??
          lowerMap['nama'] ??
          lowerMap['name'] ??
          lowerMap['customer'] ??
          lowerMap['pelanggan'] ??
          '';
        const rawPhone =
          lowerMap['no. telepon / wa'] ??
          lowerMap['no. telepon'] ??
          lowerMap['no telepon'] ??
          lowerMap['telepon'] ??
          lowerMap['telp'] ??
          lowerMap['no. wa'] ??
          lowerMap['no wa'] ??
          lowerMap['whatsapp'] ??
          lowerMap['wa'] ??
          lowerMap['no hp'] ??
          lowerMap['hp'] ??
          lowerMap['phone'] ??
          '';
        const rawOutlet =
          lowerMap['outlet / cabang'] ??
          lowerMap['outlet'] ??
          lowerMap['cabang'] ??
          lowerMap['nama outlet'] ??
          lowerMap['kode outlet'] ??
          '';

        const nameStr = String(rawName || '').trim();
        const phoneStr = String(rawPhone || '').trim();
        if (!nameStr && !phoneStr) continue;

        let matchedOutlet = outlets.find((o) => {
          const needle = String(rawOutlet || '').trim().toLowerCase();
          if (!needle) return false;
          return (
            o.id.toLowerCase() === needle ||
            o.code.toLowerCase() === needle ||
            o.name.toLowerCase() === needle ||
            o.name.toLowerCase().includes(needle)
          );
        });
        if (!matchedOutlet) {
          matchedOutlet = outlets.find((o) => o.id === fallbackOutletId) || outlets[0];
        }

        if (matchedOutlet && nameStr && phoneStr) {
          parsed.push({
            outlet_id: matchedOutlet.id,
            outlet_name: matchedOutlet.name,
            name: nameStr,
            phone: phoneStr,
          });
        }
      }

      if (parsed.length === 0) {
        setImportError(
          'Tidak ditemukan kolom valid. Pastikan ada kolom "Nama Pelanggan" dan "No. Telepon / WA".'
        );
        setImportRows([]);
        return;
      }

      setImportRows(parsed);
    } catch (err: any) {
      setImportError(err.message || 'Gagal membaca file Excel.');
      setImportRows([]);
    }
  };

  const handleConfirmImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await dbService.importCustomersBulk(
        importRows.map((r) => ({
          outlet_id: r.outlet_id,
          name: r.name,
          phone: r.phone,
          created_by: user?.id || null,
        }))
      );
      setIsImportModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Import selesai: ${result.inserted} pelanggan baru ditambahkan${
          result.skipped > 0 ? `, ${result.skipped} dilewati (duplikat / tidak valid)` : ''
        }.`,
      });
      await loadData();
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor data pelanggan.');
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // ADD / EDIT / DELETE HANDLERS
  // =========================================================================
  const openAddModal = () => {
    setEditingCustomer(null);
    setFormOutletId(selectedOutletId !== 'all' ? selectedOutletId : outlets[0]?.id || '');
    setFormName('');
    setFormPhone('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (c: OutletCustomer) => {
    setEditingCustomer(c);
    setFormOutletId(c.outlet_id);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSavingForm(true);
    try {
      if (editingCustomer) {
        await dbService.updateCustomer(editingCustomer.id, {
          outlet_id: formOutletId,
          name: formName,
          phone: formPhone,
        });
        setFeedback({ type: 'success', text: `Data pelanggan "${formName.trim()}" diperbarui.` });
      } else {
        await dbService.createCustomer({
          outlet_id: formOutletId,
          name: formName,
          phone: formPhone,
          created_by: user?.id || null,
        });
        setFeedback({ type: 'success', text: `Pelanggan "${formName.trim()}" berhasil ditambahkan.` });
      }
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleDelete = async (c: OutletCustomer) => {
    if (!confirm(`Hapus pelanggan "${c.name}" (${c.phone})?`)) return;
    try {
      await dbService.deleteCustomer(c.id);
      setFeedback({ type: 'success', text: `Pelanggan "${c.name}" berhasil dihapus.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menghapus data pelanggan.' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-borderline shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#FF6B00] border border-orange-200 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-dark tracking-tight">
                Database Pelanggan Multi-Outlet
              </h1>
              <p className="text-xs text-subtle mt-0.5">
                Rekap data nama &amp; nomor telepon/WA pelanggan yang diinput oleh kasir seluruh cabang
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openImportModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-borderline text-dark text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Excel</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Download Excel</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-rose-700" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pelanggan</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="font-bold hover:underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">
                Pelanggan ({selectedOutletId === 'all' ? 'Semua Cabang' : 'Cabang Terpilih'})
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF6B00]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-dark">{filteredCustomers.length} Orang</div>
            <div className="text-xs text-subtle mt-0.5 truncate">{selectedOutletLabel}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">
                Input Baru Hari Ini
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">{todayCount} Orang</div>
            <div className="text-xs text-subtle mt-0.5">Zona waktu WITA</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-borderline shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-subtle uppercase tracking-wider">
                Cabang Aktif Menginput
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-dark">
              {activeBranchesWithCustomers} / {outlets.length || 0} Cabang
            </div>
            <div className="text-xs text-subtle mt-0.5">Total database: {customers.length} kontak</div>
          </div>
        </div>

        {/* Filter Outlet Switcher Pills */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-borderline shadow-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setSelectedOutletId('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedOutletId === 'all'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Semua Outlet</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedOutletId === 'all' ? 'bg-white text-[#FF6B00]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {customers.length}
              </span>
            </button>

            {outlets.map((outlet) => {
              const count = customers.filter((c) => c.outlet_id === outlet.id).length;
              const isSelected = selectedOutletId === outlet.id;
              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => setSelectedOutletId(outlet.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                  }`}
                >
                  <span>{outlet.name.replace('Obat Haus - ', '')}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white text-[#FF6B00]' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Bar + Search */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama pelanggan, no. WA, atau kasir..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
              />
            </div>

            <select
              value={selectedOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-[#FF6B00]"
            >
              <option value="all">Semua Outlet ({customers.length})</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-borderline bg-white hover:bg-slate-50 text-xs font-bold text-dark cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF6B00]' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderline bg-slate-50/60 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-14">No</th>
                  <th className="py-3.5 px-4">Nama Pelanggan</th>
                  <th className="py-3.5 px-4">No. Telepon / WA</th>
                  <th className="py-3.5 px-4">Outlet / Cabang</th>
                  <th className="py-3.5 px-4">Diinput Oleh</th>
                  <th className="py-3.5 px-4">Tanggal Input</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle text-xs">
                      Memuat database pelanggan...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-subtle text-xs">
                      Belum ada data pelanggan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 text-xs text-subtle font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-dark">{c.name}</td>
                      <td className="py-3.5 px-4">
                        <a
                          href={toWaHref(c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{c.phone}</span>
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-[#FF6B00] border border-orange-200/70">
                          {c.outlet?.name || outlets.find((o) => o.id === c.outlet_id)?.name || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {c.creator?.full_name || 'Kasir Outlet'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-subtle whitespace-nowrap">
                        {formatDateTime(c.created_at)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                            title="Edit Pelanggan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Pelanggan"
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

      {/* Modal Tambah / Edit Pelanggan */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
              <h3 className="font-bold text-dark text-sm sm:text-base">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Data Pelanggan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-dark rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-dark mb-1">Outlet / Cabang *</label>
                <select
                  value={formOutletId}
                  onChange={(e) => setFormOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-borderline rounded-xl text-xs font-semibold text-dark focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-dark mb-1">Nama Pelanggan *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full px-3.5 py-2.5 bg-white border border-borderline rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-dark mb-1">No. Telepon / WhatsApp *</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3.5 py-2.5 bg-white border border-borderline rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderline">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-borderline text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingForm}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSavingForm ? 'Menyimpan...' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel Pelanggan */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-borderline overflow-hidden">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between">
              <div>
                <h3 className="font-bold text-dark text-sm sm:text-base">
                  Import Database Pelanggan (Excel / CSV)
                </h3>
                <p className="text-[11px] text-subtle">
                  Unggah file .xlsx, .xls, atau .csv dengan kolom Nama Pelanggan &amp; No. Telepon / WA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-dark rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {importError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-dark mb-1">
                  Outlet Default (jika file tidak menyertakan kolom Outlet)
                </label>
                <select
                  value={importOutletId}
                  onChange={(e) => setImportOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-borderline rounded-xl text-xs font-semibold text-dark"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs text-slate-600">
                  Belum punya format kolomnya? Unduh contoh template Excel:
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold text-[#FF6B00] shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Template .xlsx</span>
                </button>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#FF6B00] bg-slate-50/70 hover:bg-orange-50/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-[#FF6B00]" />
                  <span className="text-xs font-bold text-dark">
                    {importFileName ? `File dipilih: ${importFileName}` : 'Klik untuk pilih file Excel (.xlsx / .xls / .csv)'}
                  </span>
                </button>
              </div>

              {importRows.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="font-bold">
                    Siap mengimpor {importRows.length} baris data pelanggan:
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-0.5 text-[11px] font-mono">
                    {importRows.slice(0, 5).map((r, i) => (
                      <div key={i}>
                        • {r.name} ({r.phone}) → {r.outlet_name.replace('Obat Haus - ', '')}
                      </div>
                    ))}
                    {importRows.length > 5 && (
                      <div className="italic text-emerald-700">
                        ...dan {importRows.length - 5} data lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderline">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-borderline text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting || importRows.length === 0}
                  className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? 'Mengimpor...' : `Import ${importRows.length || ''} Data`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
