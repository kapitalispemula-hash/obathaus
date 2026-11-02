'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { AuditLog } from '@/types/database';
import { formatDateTime } from '@/lib/format';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  User,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Lock,
  Eye,
  X,
  Printer,
  ChevronRight,
  Database,
} from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await dbService.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entityType: entityFilter !== 'all' ? entityFilter : undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, entityFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.user?.full_name || '').toLowerCase().includes(q) ||
        (log.entity_id || '').toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q);

      return matchSearch;
    });
  }, [logs, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const shiftLogs = filteredLogs.filter(
      (l) => l.action === 'open_shift' || l.action === 'close_shift' || l.action === 'cash_movement'
    ).length;
    const voidLogs = filteredLogs.filter((l) => l.action === 'void_transaction').length;
    const stockLogs = filteredLogs.filter(
      (l) =>
        l.action === 'stock_opname_approved' ||
        l.action === 'dispatch_order' ||
        l.action === 'receive_goods'
    ).length;

    return { total, shiftLogs, voidLogs, stockLogs };
  }, [filteredLogs]);

  // Color mapping helper for action tags
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'void_transaction':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: AlertTriangle,
          label: 'VOID Transaksi',
        };
      case 'close_shift':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Lock,
          label: 'Tutup Shift',
        };
      case 'open_shift':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          label: 'Buka Shift',
        };
      case 'cash_movement':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: RotateCcw,
          label: 'Mutasi Kas Kasir',
        };
      case 'stock_opname_approved':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: ShieldCheck,
          label: 'Opname Disetujui',
        };
      default:
        return {
          bg: 'bg-zinc-50 text-zinc-700 border-zinc-200',
          icon: FileText,
          label: action.replace(/_/g, ' '),
        };
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#ECEEF1] shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-zinc-900 text-white uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#FF6B00]" />
                Immutable Audit Trail
              </span>
              <span className="text-xs text-[#71717A]">• Phase 5 Security & Governance</span>
            </div>
            <h1 className="text-2xl font-black text-[#18181B] tracking-tight mt-1">
              Jejak Audit & Integritas Sistem (Audit Logs)
            </h1>
            <p className="text-xs text-[#71717A] mt-0.5">
              Seluruh riwayat aksi krusial (buka/tutup shift, void transaksi kasir, mutasi petty cash, approval opname) dicatat permanen dan tidak dapat dimanipulasi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAuditLogs}
              className="px-4 py-2 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-[#71717A]" />
              <span>Refresh Log</span>
            </button>
          </div>
        </div>

        {/* 2. KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Total Rekaman Log
              </p>
              <h3 className="text-2xl font-black text-[#18181B] mt-1">
                {stats.total}{' '}
                <span className="text-xs font-semibold text-[#71717A]">aktivitas</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Integritas 100% Terenkripsi
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Aktivitas Shift & Kas
              </p>
              <h3 className="text-2xl font-black text-[#18181B] mt-1">
                {stats.shiftLogs}{' '}
                <span className="text-xs font-semibold text-[#71717A]">event</span>
              </h3>
              <p className="text-[11px] text-[#71717A] mt-1">
                Buka/tutup shift & kas kecil
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Pembatalan (Void)
              </p>
              <h3 className="text-2xl font-black text-red-600 mt-1">
                {stats.voidLogs}{' '}
                <span className="text-xs font-semibold text-[#71717A]">transaksi</span>
              </h3>
              <p className="text-[11px] text-red-600 font-bold mt-1">
                Koreksi & Pembatalan Kasir
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#ECEEF1] shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                Penyesuaian Persediaan
              </p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">
                {stats.stockLogs}{' '}
                <span className="text-xs font-semibold text-[#71717A]">event</span>
              </h3>
              <p className="text-[11px] text-purple-600 font-bold mt-1">
                Opname & Surat Jalan
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 3. Filters Toolbar */}
        <div className="bg-white p-4 rounded-3xl border border-[#ECEEF1] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Action Filter */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <Filter className="w-4 h-4 text-[#71717A]" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Jenis Aksi</option>
                <option value="open_shift">🟢 Buka Shift</option>
                <option value="close_shift">🔒 Tutup Shift & Rekonsiliasi</option>
                <option value="cash_movement">💵 Mutasi Kas Kasir (Petty Cash)</option>
                <option value="void_transaction">🔴 Pembatalan Transaksi (Void)</option>
                <option value="stock_opname_approved">📦 Persetujuan Opname Stok</option>
              </select>
            </div>

            {/* Entity Type Filter */}
            <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#ECEEF1] px-3 py-2 rounded-2xl text-xs font-bold text-[#18181B]">
              <Database className="w-4 h-4 text-[#71717A]" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Entitas Database</option>
                <option value="cashier_shift">cashier_shift</option>
                <option value="shift_cash_movement">shift_cash_movement</option>
                <option value="transaction">transaction</option>
                <option value="stock_opname">stock_opname</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari detail aksi / pengguna..."
              className="w-full pl-9 pr-4 py-2 bg-[#FAFAFA] border border-[#ECEEF1] rounded-2xl text-xs text-[#18181B] placeholder-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* 4. Main Audit Table */}
        <div className="bg-white rounded-3xl border border-[#ECEEF1] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] text-[#71717A] border-b border-[#ECEEF1] font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-5">Waktu Pencatatan</th>
                  <th className="py-4 px-4">Pengguna (Pelaku)</th>
                  <th className="py-4 px-4">Tindakan / Aksi</th>
                  <th className="py-4 px-4">Entitas & Target ID</th>
                  <th className="py-4 px-5">Detail Catatan Audit</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] text-[#18181B]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#71717A]">
                      <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat jejak audit sistem...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#71717A]">
                      <Lock className="w-10 h-10 text-[#D4D4D8] mx-auto mb-2" />
                      Tidak ada log audit yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badge = getActionBadge(log.action);
                    const ActionIcon = badge.icon;
                    return (
                      <tr key={log.id} className="hover:bg-[#FBFBFC] transition-colors">
                        <td className="py-4 px-5 font-mono text-[#71717A]">
                          <p className="font-bold text-[#18181B]">{formatDateTime(log.created_at)}</p>
                          <span className="text-[10px] text-[#A1A1AA]">ID: {log.id}</span>
                        </td>

                        <td className="py-4 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold text-xs uppercase">
                              {log.user?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-[#18181B]">{log.user?.full_name || 'System / Auto'}</p>
                              <p className="text-[10px] text-[#71717A] capitalize">
                                {log.user?.role?.replace('_', ' ') || 'Role: User'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border ${badge.bg}`}
                          >
                            <ActionIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono">
                          <p className="font-bold text-[#18181B]">{log.entity_type}</p>
                          <p className="text-[10px] text-[#71717A]">{log.entity_id}</p>
                        </td>

                        <td className="py-4 px-5 text-[#18181B] font-medium max-w-md">
                          <p className="line-clamp-2 text-xs">{log.details}</p>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="px-3 py-1.5 bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#18181B] text-[11px] font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#71717A]" />
                            <span>Inspeksi</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#ECEEF1] overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#ECEEF1] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#FF6B00]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#18181B] text-base">
                      Detail Jejak Audit (Audit Payload)
                    </h3>
                    <p className="text-xs text-[#71717A]">ID Event: {selectedLog.id}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:bg-[#F4F4F5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-[#ECEEF1] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#71717A] font-medium">Waktu Transaksi:</span>
                    <span className="font-black text-[#18181B]">{formatDateTime(selectedLog.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A] font-medium">Pelaksana (User):</span>
                    <span className="font-bold text-[#18181B]">
                      {selectedLog.user?.full_name} ({selectedLog.user?.email})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A] font-medium">Jenis Tindakan:</span>
                    <span className="font-bold text-[#FF6B00] uppercase">{selectedLog.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A] font-medium">Entitas Target:</span>
                    <span className="font-mono text-[#18181B]">{selectedLog.entity_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#71717A] font-medium">ID Target:</span>
                    <span className="font-mono text-[#18181B]">{selectedLog.entity_id}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#18181B] uppercase tracking-wider text-[11px] mb-1.5">
                    Catatan Deskripsi Lengkap:
                  </h4>
                  <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-[#ECEEF1] font-mono text-xs text-[#18181B] whitespace-pre-wrap leading-relaxed">
                    {selectedLog.details}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-[11px] leading-tight">
                    Catatan ini bersifat permanen (append-only) dan diverifikasi oleh sistem integritas Obat Haus.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#ECEEF1] flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
