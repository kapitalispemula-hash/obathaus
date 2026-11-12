'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import {
  attendanceService,
  getWitaDateStr,
  formatAttendanceTime,
} from '@/lib/services/attendance';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import {
  AttendanceShift,
  EmployeeProfile,
  AttendanceLog,
  Outlet,
  Warehouse,
  LocationType,
} from '@/types/database';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  QrCode,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Search,
  Filter,
  ExternalLink,
  Building2,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  X,
  Compass,
} from 'lucide-react';

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<'recap' | 'shifts' | 'gps' | 'employees' | 'qrcode'>('recap');
  const [loading, setLoading] = useState(false);

  // Data State
  const [shifts, setShifts] = useState<AttendanceShift[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filter State (Tab 1: Rekap)
  const [periodMode, setPeriodMode] = useState<'daily' | 'range' | 'all'>('daily');
  const [filterDate, setFilterDate] = useState<string>(() => getWitaDateStr());
  const [filterStartDate, setFilterStartDate] = useState<string>(() =>
    getWitaDateStr(new Date(Date.now() - 6 * 86400000))
  );
  const [filterEndDate, setFilterEndDate] = useState<string>(() => getWitaDateStr());
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');

  // Shift Modal State (Tab 2)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<AttendanceShift | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('16:00');
  const [shiftTolerance, setShiftTolerance] = useState<number>(15);
  const [isSavingShift, setIsSavingShift] = useState(false);

  // GPS Coordinates Modal State (Tab 3)
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [editingLocType, setEditingLocType] = useState<LocationType>('outlet');
  const [editingLocId, setEditingLocId] = useState<string>('');
  const [editingLocName, setEditingLocName] = useState<string>('');
  const [locLat, setLocLat] = useState<string>('');
  const [locLng, setLocLng] = useState<string>('');
  const [locRadius, setLocRadius] = useState<number>(100);
  const [isDetectingCurrentGps, setIsDetectingCurrentGps] = useState(false);
  const [gpsDetectionMsg, setGpsDetectionMsg] = useState<string | null>(null);
  const [isSavingGps, setIsSavingGps] = useState(false);

  // Employee Modal State (Tab 4)
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeProfile | null>(null);
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Barista');
  const [empLocType, setEmpLocType] = useState<LocationType>('outlet');
  const [empLocId, setEmpLocId] = useState('');
  const [empPin, setEmpPin] = useState('1234');
  const [empPhone, setEmpPhone] = useState('');
  const [empIsActive, setEmpIsActive] = useState(true);
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);
      const [shList, empList, logList, outList, whList] = await Promise.all([
        attendanceService.getShifts(),
        attendanceService.getEmployees(),
        attendanceService.getAllAttendanceLogs(),
        dbService.getOutlets(),
        dbService.getWarehouses(),
      ]);
      setShifts(shList);
      setEmployees(empList);
      setLogs(logList);
      setOutlets(outList);
      setWarehouses(whList);
    } catch (err) {
      console.error('Failed to load attendance admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    let channel: any = null;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      channel = supabase
        .channel('admin-attendance-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => void loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_profiles' }, () => void loadData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_shifts' }, () => void loadData())
        .subscribe();
    }

    return () => {
      if (channel && isSupabaseConfigured()) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // TAB 1: REKAP HANDLERS
  // --------------------------------------------------------------------------

  const periodLogs = logs.filter((log) => {
    if (periodMode === 'daily') {
      if (filterDate && log.date !== filterDate) return false;
    } else if (periodMode === 'range') {
      if (filterStartDate && log.date < filterStartDate) return false;
      if (filterEndDate && log.date > filterEndDate) return false;
    }

    const emp = employees.find((e) => e.id === log.employee_id);
    if (filterLocation !== 'all') {
      if (emp && emp.assigned_location_id !== filterLocation) return false;
    }

    if (searchEmployeeQuery.trim()) {
      const q = searchEmployeeQuery.toLowerCase();
      const nameMatch = emp ? emp.full_name.toLowerCase().includes(q) : false;
      const codeMatch = emp ? emp.employee_code.toLowerCase().includes(q) : false;
      if (!nameMatch && !codeMatch) return false;
    }

    return true;
  });

  const filteredLogs = periodLogs.filter((log) => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    return true;
  });

  // Periodic per-employee recap aggregation
  const employeeRecapRows = employees
    .filter((emp) => {
      if (filterLocation !== 'all' && emp.assigned_location_id !== filterLocation) return false;
      if (searchEmployeeQuery.trim()) {
        const q = searchEmployeeQuery.toLowerCase();
        if (
          !emp.full_name.toLowerCase().includes(q) &&
          !emp.employee_code.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    })
    .map((emp) => {
      const empLogs = periodLogs.filter((l) => l.employee_id === emp.id);
      const presentCount = empLogs.filter((l) => l.status === 'present').length;
      const lateCount = empLogs.filter((l) => l.status === 'late').length;
      const sickCount = empLogs.filter((l) => l.status === 'sick').length;
      const leaveCount = empLogs.filter((l) => l.status === 'leave').length;
      const alphaCount = empLogs.filter((l) => l.status === 'alpha').length;

      let totalMinutes = 0;
      empLogs.forEach((l) => {
        if (l.clock_in && l.clock_out) {
          const startMs = new Date(l.clock_in).getTime();
          const endMs = new Date(l.clock_out).getTime();
          if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
            totalMinutes += Math.round((endMs - startMs) / 60000);
          }
        }
      });

      const locName =
        emp.assigned_location_type === 'warehouse'
          ? warehouses.find((w) => w.id === emp.assigned_location_id)?.name || 'Gudang Pusat'
          : outlets.find((o) => o.id === emp.assigned_location_id)?.name || 'Cabang Outlet';

      return {
        emp,
        locName,
        presentCount,
        lateCount,
        sickCount,
        leaveCount,
        alphaCount,
        totalAttended: presentCount + lateCount,
        totalHoursText: `${Math.floor(totalMinutes / 60)}j ${totalMinutes % 60}m`,
      };
    });

  // Today metrics (WITA)
  const todayStr = getWitaDateStr();
  const todayLogs = logs.filter((l) => l.date === todayStr);
  const totalPresentToday = todayLogs.filter((l) => l.status === 'present').length;
  const totalLateToday = todayLogs.filter((l) => l.status === 'late').length;
  const totalSickOrLeaveToday = todayLogs.filter((l) => l.status === 'sick' || l.status === 'leave').length;
  const totalEmployeesCount = employees.filter((e) => e.is_active).length;
  const totalUnaccountedToday = Math.max(0, totalEmployeesCount - (totalPresentToday + totalLateToday + totalSickOrLeaveToday));

  // Export CSV
  const exportRecapCsv = () => {
    const headers = ['Tanggal', 'Kode Karyawan', 'Nama Lengkap', 'Jabatan', 'Lokasi Penempatan', 'Jam Masuk (WITA)', 'Jam Pulang (WITA)', 'Status', 'Jarak GPS (m)', 'Catatan'];
    const rows = filteredLogs.map((l) => {
      const emp = employees.find((e) => e.id === l.employee_id);
      let locName = '-';
      if (emp) {
        if (emp.assigned_location_type === 'warehouse') {
          locName = warehouses.find((w) => w.id === emp.assigned_location_id)?.name || 'Gudang';
        } else {
          locName = outlets.find((o) => o.id === emp.assigned_location_id)?.name || 'Outlet';
        }
      }
      return [
        l.date,
        emp?.employee_code || '-',
        `"${emp?.full_name || '-'}"`,
        `"${emp?.role_title || '-'}"`,
        `"${locName}"`,
        l.clock_in ? formatAttendanceTime(l.clock_in) : '-',
        l.clock_out ? formatAttendanceTime(l.clock_out) : '-',
        l.status,
        l.clock_in_distance_meters ?? '-',
        `"${l.notes || '-'}"`,
      ].join(',');
    });

    const periodSlug =
      periodMode === 'daily'
        ? filterDate
        : periodMode === 'range'
        ? `${filterStartDate}_${filterEndDate}`
        : 'semua';
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_absensi_obathaus_${periodSlug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --------------------------------------------------------------------------
  // TAB 2: SHIFT HANDLERS
  // --------------------------------------------------------------------------

  const openAddShiftModal = () => {
    setEditingShift(null);
    setShiftName('');
    setShiftStart('08:00');
    setShiftEnd('16:00');
    setShiftTolerance(15);
    setIsShiftModalOpen(true);
  };

  const openEditShiftModal = (sh: AttendanceShift) => {
    setEditingShift(sh);
    setShiftName(sh.name);
    setShiftStart(sh.start_time);
    setShiftEnd(sh.end_time);
    setShiftTolerance(sh.late_tolerance_minutes || 15);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;

    setIsSavingShift(true);
    try {
      await attendanceService.saveShift({
        id: editingShift ? editingShift.id : undefined,
        name: shiftName.trim(),
        start_time: shiftStart,
        end_time: shiftEnd,
        late_tolerance_minutes: shiftTolerance,
        is_active: true,
      });
      setIsShiftModalOpen(false);
      const updated = await attendanceService.getShifts();
      setShifts(updated);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan shift kerja.');
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Yakin ingin menghapus shift kerja ini?')) return;
    await attendanceService.deleteShift(id);
    const updated = await attendanceService.getShifts();
    setShifts(updated);
  };

  // --------------------------------------------------------------------------
  // TAB 3: GPS LOCATION HANDLERS
  // --------------------------------------------------------------------------

  const openGpsModal = (type: LocationType, id: string, name: string, lat?: number | null, lng?: number | null, rad?: number | null) => {
    setEditingLocType(type);
    setEditingLocId(id);
    setEditingLocName(name);
    setLocLat(lat !== null && lat !== undefined ? String(lat) : '');
    setLocLng(lng !== null && lng !== undefined ? String(lng) : '');
    setLocRadius(rad || 100);
    setGpsDetectionMsg(null);
    setIsGpsModalOpen(true);
  };

  const detectAdminCurrentGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsDetectionMsg('Browser tidak mendukung geolokasi GPS.');
      return;
    }

    setIsDetectingCurrentGps(true);
    setGpsDetectionMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocLat(pos.coords.latitude.toFixed(6));
        setLocLng(pos.coords.longitude.toFixed(6));
        setIsDetectingCurrentGps(false);
        setGpsDetectionMsg('Lokasi saat ini berhasil dideteksi dari GPS perangkat Anda!');
      },
      (err) => {
        setIsDetectingCurrentGps(false);
        setGpsDetectionMsg('Gagal mendeteksi lokasi. Pastikan izin GPS diaktifkan.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveGps = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(locLat);
    const lngNum = parseFloat(locLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Koordinat Latitude dan Longitude harus berupa angka desimal yang valid.');
      return;
    }

    setIsSavingGps(true);
    try {
      await attendanceService.updateLocationCoordinates(editingLocType, editingLocId, latNum, lngNum, locRadius);
      setIsGpsModalOpen(false);
      // Refresh outlets and warehouses
      const [outList, whList] = await Promise.all([dbService.getOutlets(), dbService.getWarehouses()]);
      setOutlets(outList);
      setWarehouses(whList);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan titik lokasi GPS.');
    } finally {
      setIsSavingGps(false);
    }
  };

  // --------------------------------------------------------------------------
  // TAB 4: EMPLOYEE HANDLERS
  // --------------------------------------------------------------------------

  const openAddEmpModal = () => {
    setEditingEmp(null);
    const nextCode = `EMP-0${employees.length + 1}`;
    setEmpCode(nextCode);
    setEmpName('');
    setEmpRole('Barista');
    setEmpLocType('outlet');
    setEmpLocId(outlets[0]?.id || '');
    setEmpPin('1234');
    setEmpPhone('');
    setEmpIsActive(true);
    setIsEmpModalOpen(true);
  };

  const openEditEmpModal = (emp: EmployeeProfile) => {
    setEditingEmp(emp);
    setEmpCode(emp.employee_code);
    setEmpName(emp.full_name);
    setEmpRole(emp.role_title);
    setEmpLocType(emp.assigned_location_type);
    setEmpLocId(emp.assigned_location_id);
    setEmpPin('');
    setEmpPhone(emp.phone || '');
    setEmpIsActive(emp.is_active);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode.trim() || !empName.trim() || !empLocId) {
      alert('Harap lengkapi data karyawan dan pilih unit penempatan.');
      return;
    }

    setIsSavingEmp(true);
    try {
      await attendanceService.saveEmployee({
        id: editingEmp ? editingEmp.id : undefined,
        employee_code: empCode.trim().toUpperCase(),
        full_name: empName.trim(),
        role_title: empRole,
        assigned_location_type: empLocType,
        assigned_location_id: empLocId,
        pin: editingEmp ? (empPin.trim() || undefined) : (empPin.trim() || '1234'),
        phone: empPhone.trim(),
        avatar_url: editingEmp?.avatar_url || null,
        is_active: empIsActive,
      });
      setIsEmpModalOpen(false);
      const updated = await attendanceService.getEmployees();
      setEmployees(updated);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan profil karyawan.');
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleDeleteEmp = async (id: string) => {
    if (!confirm('Yakin ingin menghapus karyawan ini dari sistem absensi?')) return;
    try {
      await attendanceService.deleteEmployee(id);
      const updated = await attendanceService.getEmployees();
      setEmployees(updated);
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus karyawan.');
    }
  };

  // --------------------------------------------------------------------------
  // TAB 5: PRINT POSTER
  // --------------------------------------------------------------------------
  const printQrPoster = () => {
    window.print();
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://obathaus.vercel.app/absen')}&margin=10`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
                Absensi &amp; Kehadiran Digital
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-[#FF6B00]">
                All-in-One Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-mutedtext mt-1">
              Pusat kendali kehadiran staf cabang outlet &amp; gudang logistik OBAT HAUS berbasis GPS Geofencing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-borderline text-heading text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
            <Link
              href="/absen"
              target="_blank"
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Buka Tampilan HP (/absen)</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* 5 Integrated Tabs Header */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-borderline shadow-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'recap', label: 'Rekap Kehadiran', icon: Calendar },
            { id: 'shifts', label: 'Shift Kerja', icon: Clock },
            { id: 'gps', label: 'Titik Lokasi GPS', icon: MapPin },
            { id: 'employees', label: 'Karyawan & PIN', icon: Users },
            { id: 'qrcode', label: 'QR Code Poster PWA', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'text-mutedtext hover:text-heading hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ==================================================================
            TAB 1: REKAP KEHADIRAN (MONITOR LIVE & RIWAYAT)
        ================================================================== */}
        {activeTab === 'recap' && (
          <div className="space-y-5 sm:space-y-6">
            {/* Live Today Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-borderline shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider block truncate">Hadir Tepat Waktu</span>
                <div className="text-lg sm:text-2xl font-black text-emerald-600">{totalPresentToday} <span className="text-xs font-bold text-slate-400">staf</span></div>
                <p className="text-[10px] text-mutedtext truncate">Lolos GPS &lt; 100m</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-borderline shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider block truncate">Terlambat Masuk</span>
                <div className="text-lg sm:text-2xl font-black text-amber-500">{totalLateToday} <span className="text-xs font-bold text-slate-400">staf</span></div>
                <p className="text-[10px] text-mutedtext truncate">Lewat toleransi</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-borderline shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider block truncate">Izin / Sakit</span>
                <div className="text-lg sm:text-2xl font-black text-purple-600">{totalSickOrLeaveToday} <span className="text-xs font-bold text-slate-400">staf</span></div>
                <p className="text-[10px] text-mutedtext truncate">Lapor owner</p>
              </div>

              <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-borderline shadow-xs space-y-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-mutedtext uppercase tracking-wider block truncate">Belum Absen</span>
                <div className="text-lg sm:text-2xl font-black text-slate-500">{totalUnaccountedToday} <span className="text-xs font-bold text-slate-400">staf</span></div>
                <p className="text-[10px] text-mutedtext truncate">Dari {totalEmployeesCount} staf</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-borderline shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
                <div className="flex items-center p-1 bg-canvas border border-borderline rounded-xl text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
                  {[
                    { id: 'daily', label: 'Harian' },
                    { id: 'range', label: 'Rentang Tanggal' },
                    { id: 'all', label: 'Semua Riwayat' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPeriodMode(m.id as 'daily' | 'range' | 'all')}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                        periodMode === m.id
                          ? 'bg-[#FF6B00] text-white shadow-2xs'
                          : 'text-mutedtext hover:text-heading'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {periodMode === 'daily' && (
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full sm:w-auto p-2 text-xs font-bold bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                  />
                )}

                {periodMode === 'range' && (
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="flex-1 sm:flex-initial p-2 text-xs font-bold bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                    <span className="text-xs text-mutedtext font-bold">s/d</span>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="flex-1 sm:flex-initial p-2 text-xs font-bold bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full sm:w-auto p-2 text-xs font-bold bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00] truncate"
                  >
                    <option value="all">Semua Lokasi</option>
                    <optgroup label="Cabang Outlet">
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Gudang Logistik">
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </optgroup>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:w-auto p-2 text-xs font-bold bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00] truncate"
                  >
                    <option value="all">Semua Status</option>
                    <option value="present">Hadir Tepat Waktu</option>
                    <option value="late">Terlambat</option>
                    <option value="sick">Sakit</option>
                    <option value="leave">Izin / Cuti</option>
                    <option value="alpha">Alpha</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                    placeholder="Cari nama / kode staf..."
                    className="pl-8 pr-3 py-2 text-xs bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-1 focus:ring-[#FF6B00] w-full"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={exportRecapCsv}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto sm:self-start lg:self-auto shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV / Excel</span>
              </button>
            </div>

            {/* Periodic Recap per Employee */}
            <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-borderline flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-heading uppercase tracking-wider">
                    Ringkasan Rekapitulasi Kehadiran per Karyawan
                  </h3>
                  <p className="text-[11px] text-mutedtext mt-0.5">
                    Periode: {periodMode === 'daily' ? filterDate : periodMode === 'range' ? `${filterStartDate} s/d ${filterEndDate}` : 'Seluruh Riwayat'} • Total {employeeRecapRows.length} karyawan
                  </p>
                </div>
              </div>

              {/* Mobile Recap Cards */}
              <div className="md:hidden divide-y divide-borderline">
                {employeeRecapRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-mutedtext">
                    Belum ada karyawan terdaftar sesuai filter.
                  </div>
                ) : (
                  employeeRecapRows.map((row) => (
                    <div key={row.emp.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {row.emp.avatar_url ? (
                            <img
                              src={row.emp.avatar_url}
                              alt={row.emp.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-borderline shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0">
                              {row.emp.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-heading truncate">{row.emp.full_name}</div>
                            <div className="text-[10px] text-mutedtext truncate">{row.locName}</div>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-black text-heading shrink-0">{row.totalHoursText}</span>
                      </div>

                      <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">Hadir: {row.presentCount}</div>
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">Telat: {row.lateCount}</div>
                        <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">Sakit: {row.sickCount}</div>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">Izin: {row.leaveCount}</div>
                        <div className="p-1.5 rounded-lg bg-red-50 text-red-700">Alpha: {row.alphaCount}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Recap Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderline bg-slate-50/60 text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                      <th className="py-2.5 px-4">Karyawan</th>
                      <th className="py-2.5 px-4">Penempatan</th>
                      <th className="py-2.5 px-3 text-center text-emerald-700">Hadir</th>
                      <th className="py-2.5 px-3 text-center text-amber-700">Telat</th>
                      <th className="py-2.5 px-3 text-center text-purple-700">Sakit</th>
                      <th className="py-2.5 px-3 text-center text-blue-700">Izin</th>
                      <th className="py-2.5 px-3 text-center text-red-700">Alpha</th>
                      <th className="py-2.5 px-4 text-right">Total Jam Kerja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline text-xs font-medium text-heading">
                    {employeeRecapRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-mutedtext">
                          Belum ada karyawan terdaftar sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      employeeRecapRows.map((row) => (
                        <tr key={row.emp.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {row.emp.avatar_url ? (
                                <img
                                  src={row.emp.avatar_url}
                                  alt={row.emp.full_name}
                                  className="w-8 h-8 rounded-full object-cover border border-borderline shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0">
                                  {row.emp.full_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-heading">{row.emp.full_name}</div>
                                <div className="text-[10px] text-mutedtext font-mono">
                                  {row.emp.employee_code} • {row.emp.role_title}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-mutedtext">{row.locName}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{row.presentCount}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">{row.lateCount}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-600">{row.sickCount}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">{row.leaveCount}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600">{row.alphaCount}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-heading">{row.totalHoursText}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance Logs List: Mobile Cards + Desktop Table */}
            <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
              {/* Mobile Logs Cards */}
              <div className="md:hidden divide-y divide-borderline">
                {filteredLogs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-mutedtext">
                    Tidak ada catatan absensi untuk filter yang dipilih.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const emp = employees.find((e) => e.id === log.employee_id);
                    let locName = '-';
                    if (emp) {
                      locName = emp.assigned_location_type === 'warehouse'
                        ? warehouses.find((w) => w.id === emp.assigned_location_id)?.name || 'Gudang Pusat'
                        : outlets.find((o) => o.id === emp.assigned_location_id)?.name || 'Cabang Outlet';
                    }
                    const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
                      present: { label: 'Tepat Waktu', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                      late: { label: 'Terlambat', bg: 'bg-amber-50', text: 'text-amber-700' },
                      sick: { label: 'Sakit', bg: 'bg-purple-50', text: 'text-purple-700' },
                      leave: { label: 'Izin', bg: 'bg-blue-50', text: 'text-blue-700' },
                      alpha: { label: 'Alpha', bg: 'bg-red-50', text: 'text-red-700' },
                    };
                    const badge = statusBadges[log.status] || { label: log.status, bg: 'bg-slate-100', text: 'text-slate-700' };

                    return (
                      <div key={log.id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {emp?.avatar_url ? (
                              <img src={emp.avatar_url} alt={emp.full_name} className="w-8 h-8 rounded-full object-cover border border-borderline shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0">
                                {(emp?.full_name || 'K').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-heading truncate">{emp?.full_name || 'Karyawan'}</div>
                              <div className="text-[10px] text-mutedtext truncate">{log.date} &bull; {locName}</div>
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-2 bg-canvas rounded-xl text-[11px] font-mono">
                          <div>
                            <span className="text-[10px] font-sans text-mutedtext block">Masuk</span>
                            <strong className="text-slate-800">{log.clock_in ? `${formatAttendanceTime(log.clock_in)} WITA` : '-'}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] font-sans text-mutedtext block">Pulang</span>
                            <strong className="text-slate-800">{log.clock_out ? `${formatAttendanceTime(log.clock_out)} WITA` : '-'}</strong>
                          </div>
                        </div>
                        {(log.clock_in_distance_meters !== null && log.clock_in_distance_meters !== undefined || log.notes) && (
                          <p className="text-[11px] text-mutedtext">
                            {log.clock_in_distance_meters !== null && log.clock_in_distance_meters !== undefined ? `Radar: ${log.clock_in_distance_meters}m ` : ''}
                            {log.notes ? `• ${log.notes}` : ''}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Logs Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderline bg-slate-50 text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Karyawan</th>
                      <th className="py-3 px-4">Unit Penempatan</th>
                      <th className="py-3 px-4">Jam Masuk</th>
                      <th className="py-3 px-4">Jam Pulang</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Jarak GPS / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline text-xs font-medium text-heading">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-mutedtext">
                          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          Tidak ada catatan absensi untuk filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const emp = employees.find((e) => e.id === log.employee_id);
                        let locName = '-';
                        let isWh = false;
                        if (emp) {
                          if (emp.assigned_location_type === 'warehouse') {
                            isWh = true;
                            locName = warehouses.find((w) => w.id === emp.assigned_location_id)?.name || 'Gudang Pusat';
                          } else {
                            locName = outlets.find((o) => o.id === emp.assigned_location_id)?.name || 'Cabang Outlet';
                          }
                        }

                        const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
                          present: { label: 'Tepat Waktu', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                          late: { label: 'Terlambat', bg: 'bg-amber-50', text: 'text-amber-700' },
                          sick: { label: 'Sakit', bg: 'bg-purple-50', text: 'text-purple-700' },
                          leave: { label: 'Izin', bg: 'bg-blue-50', text: 'text-blue-700' },
                          alpha: { label: 'Alpha', bg: 'bg-red-50', text: 'text-red-700' },
                        };
                        const badge = statusBadges[log.status] || { label: log.status, bg: 'bg-slate-100', text: 'text-slate-700' };

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-mutedtext">{log.date}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                {emp?.avatar_url ? (
                                  <img
                                    src={emp.avatar_url}
                                    alt={emp.full_name}
                                    className="w-8 h-8 rounded-full object-cover border border-borderline shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0">
                                    {(emp?.full_name || 'K').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-heading">{emp?.full_name || 'Karyawan'}</div>
                                  <div className="text-[11px] text-mutedtext flex items-center gap-1 mt-0.5">
                                    <span className="font-mono text-[#FF6B00] font-bold">{emp?.employee_code || '-'}</span>
                                    <span>•</span>
                                    <span>{emp?.role_title || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-xs truncate max-w-xs">
                                {isWh ? (
                                  <WarehouseIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                                <span className="truncate">{locName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {log.clock_in ? `${formatAttendanceTime(log.clock_in)} WITA` : '-'}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {log.clock_out ? `${formatAttendanceTime(log.clock_out)} WITA` : '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-mutedtext">
                              {log.clock_in_distance_meters !== null && log.clock_in_distance_meters !== undefined ? (
                                <span className="font-mono text-[11px] block">
                                  Radar: {log.clock_in_distance_meters}m
                                </span>
                              ) : null}
                              {log.notes && (
                                <span className="text-[11px] text-slate-600 italic block">{log.notes}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            TAB 2: SHIFT KERJA
        ================================================================== */}
        {activeTab === 'shifts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-heading">Master Shift Kerja</h3>
                <p className="text-xs text-mutedtext mt-0.5">Kelola jam kerja operasional dan batas toleransi keterlambatan.</p>
              </div>
              <button
                type="button"
                onClick={openAddShiftModal}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Shift Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shifts.map((s) => (
                <div key={s.id} className="p-5 bg-white rounded-2xl border border-borderline shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-heading">{s.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">
                        Aktif
                      </span>
                    </div>

                    <div className="p-3 bg-canvas rounded-xl text-center space-y-0.5">
                      <span className="text-[10px] text-mutedtext font-bold uppercase tracking-wider block">Jam Operasional</span>
                      <div className="text-xl font-black font-mono text-[#FF6B00]">
                        {s.start_time} - {s.end_time} <span className="text-xs">WITA</span>
                      </div>
                    </div>

                    <p className="text-xs text-mutedtext">
                      Toleransi keterlambatan: <strong>{s.late_tolerance_minutes} menit</strong> setelah jam mulai.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderline">
                    <button
                      type="button"
                      onClick={() => openEditShiftModal(s)}
                      className="p-1.5 rounded-lg text-mutedtext hover:text-heading hover:bg-slate-100 transition-colors"
                      title="Edit Shift"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteShift(s.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Hapus Shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================
            TAB 3: TITIK LOKASI GPS (OUTLETS & WAREHOUSES)
        ================================================================== */}
        {activeTab === 'gps' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base text-heading">Titik Lokasi GPS &amp; Radius Geofencing</h3>
              <p className="text-xs text-mutedtext mt-0.5">
                Atur koordinat Latitude &amp; Longitude untuk setiap cabang outlet dan gudang pusat. Staf hanya bisa absen jika berada dalam radius 100 meter dari titik ini.
              </p>
            </div>

            {/* Outlets GPS Table */}
            <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-borderline flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-heading flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#FF6B00]" />
                  Cabang Outlet ({outlets.length} Lokasi)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderline text-[11px] font-bold text-mutedtext uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-4">Kode</th>
                      <th className="py-2.5 px-4">Nama Cabang</th>
                      <th className="py-2.5 px-4">Koordinat GPS (Lat, Lng)</th>
                      <th className="py-2.5 px-4">Radius Maks</th>
                      <th className="py-2.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline text-xs font-medium text-heading">
                    {outlets.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-[#FF6B00]">{o.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-heading">{o.name}</div>
                          <div className="text-[11px] text-mutedtext truncate max-w-xs">{o.address || '-'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {o.latitude && o.longitude ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                              {o.latitude}, {o.longitude}
                            </span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                              ⚠️ Belum diatur
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {o.radius_meters || 100} meter
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openGpsModal('outlet', o.id, o.name, o.latitude, o.longitude, o.radius_meters)}
                            className="px-3 py-1.5 bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFEDD5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Atur Koordinat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warehouse GPS Table */}
            <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-borderline flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-heading flex items-center gap-2">
                  <WarehouseIcon className="w-4 h-4 text-blue-600" />
                  Gudang Logistik Pusat ({warehouses.length} Fasilitas)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderline text-[11px] font-bold text-mutedtext uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-4">Kode</th>
                      <th className="py-2.5 px-4">Nama Gudang</th>
                      <th className="py-2.5 px-4">Koordinat GPS (Lat, Lng)</th>
                      <th className="py-2.5 px-4">Radius Maks</th>
                      <th className="py-2.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline text-xs font-medium text-heading">
                    {warehouses.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{w.code}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-heading">{w.name}</div>
                          <div className="text-[11px] text-mutedtext truncate max-w-xs">{w.address || '-'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {w.latitude && w.longitude ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                              {w.latitude}, {w.longitude}
                            </span>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                              ⚠️ Belum diatur
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {w.radius_meters || 100} meter
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openGpsModal('warehouse', w.id, w.name, w.latitude, w.longitude, w.radius_meters)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Atur Koordinat
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            TAB 4: KARYAWAN & PIN
        ================================================================== */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-heading">Daftar Karyawan &amp; Hak Akses Absensi</h3>
                <p className="text-xs text-mutedtext mt-0.5">Kelola Employee ID, PIN 4-digit, dan penempatan cabang/gudang.</p>
              </div>
              <button
                type="button"
                onClick={openAddEmpModal}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Karyawan Baru</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-borderline bg-slate-50 text-[11px] font-bold text-mutedtext uppercase tracking-wider">
                      <th className="py-3 px-4">ID Karyawan</th>
                      <th className="py-3 px-4">Nama Lengkap</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Unit Penempatan</th>
                      <th className="py-3 px-4">PIN Absen</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline text-xs font-medium text-heading">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-mutedtext text-xs">
                          Belum ada data karyawan terdaftar. Klik tombol <strong>+ Tambah Karyawan Baru</strong> di atas untuk menambahkan karyawan.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => {
                        let locLabel = '-';
                        if (emp.assigned_location_type === 'warehouse') {
                          locLabel = warehouses.find((w) => w.id === emp.assigned_location_id)?.name || 'Gudang Pusat';
                        } else {
                          locLabel = outlets.find((o) => o.id === emp.assigned_location_id)?.name || 'Cabang Outlet';
                        }

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#FF6B00]">{emp.employee_code}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                {emp.avatar_url ? (
                                  <img
                                    src={emp.avatar_url}
                                    alt={emp.full_name}
                                    className="w-8 h-8 rounded-full object-cover border border-borderline shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0">
                                    {emp.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-heading">{emp.full_name}</div>
                                  <div className="text-[11px] text-mutedtext font-mono">{emp.phone || '-'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{emp.role_title}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-xs truncate max-w-xs block font-bold text-heading">
                                {locLabel}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              •••• <span className="text-[10px] text-emerald-600 font-sans font-bold">Tersandi</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${emp.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                {emp.is_active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditEmpModal(emp)}
                                  className="p-1.5 rounded-lg text-mutedtext hover:text-heading hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Edit Karyawan"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmp(emp.id)}
                                  className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Hapus Karyawan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            TAB 5: QR CODE & POSTER PWA
        ================================================================== */}
        {activeTab === 'qrcode' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-heading">Poster QR Code Absensi Karyawan</h3>
                <p className="text-xs text-mutedtext mt-0.5">
                  Cetak poster A4 ini dan tempelkan di bar outlet atau meja admin gudang agar karyawan tinggal scan untuk mulai absen.
                </p>
              </div>
              <button
                type="button"
                onClick={printQrPoster}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Poster A4</span>
              </button>
            </div>

            {/* Poster Preview Card */}
            <div className="max-w-md mx-auto bg-white border-2 border-slate-900 rounded-3xl p-8 shadow-2xl text-center space-y-6 select-none print:m-0 print:border-none print:shadow-none">
              <div className="space-y-2">
                <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto shadow-md border border-slate-100 p-1 bg-white">
                  <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-2xl" />
                </div>
                <h2 className="text-2xl font-black text-[#18181B] tracking-tight uppercase">
                  OBAT <span className="text-[#FF6B00]">HAUS</span>
                </h2>
                <div className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider">
                  Absensi Digital Karyawan
                </div>
              </div>

              {/* Scannable QR Code */}
              <div className="p-4 bg-white border-2 border-dashed border-[#FF6B00] rounded-3xl inline-block shadow-inner mx-auto">
                <img
                  src={qrImageUrl}
                  alt="QR Code Absen OBAT HAUS"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-800 text-sm">
                  Arahkan Kamera HP / Google Lens ke QR Code di atas
                </p>
                <ol className="text-[11px] text-slate-500 space-y-1 text-left list-decimal pl-6">
                  <li>Scan QR code atau buka link: <strong>https://obathaus.vercel.app/absen</strong></li>
                  <li>Masukkan <strong>ID Karyawan</strong> dan <strong>PIN 4-digit</strong> Anda.</li>
                  <li>Pastikan GPS HP aktif &amp; tekan tombol <strong>Absen Masuk / Pulang</strong>.</li>
                </ol>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Operational System Management • Sulawesi Barat
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
            MODAL: SHIFT ADD / EDIT
        ================================================================== */}
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-borderline p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-borderline pb-3">
                <h3 className="font-bold text-sm text-heading">
                  {editingShift ? 'Edit Shift Kerja' : 'Tambah Shift Kerja Baru'}
                </h3>
                <button onClick={() => setIsShiftModalOpen(false)} className="text-mutedtext hover:text-heading">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Nama Shift *</label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="Contoh: Shift Pagi Outlet"
                    required
                    className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Jam Masuk *</label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Jam Pulang *</label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Toleransi Keterlambatan (Menit)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={shiftTolerance}
                    onChange={(e) => setShiftTolerance(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-mono font-bold focus:outline-none focus:border-[#FF6B00]"
                  />
                  <p className="text-[10px] text-mutedtext mt-1">
                    Lewat dari menit ini, sistem otomatis menandai status kehadiran sebagai &quot;Terlambat&quot;.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-borderline text-xs font-bold text-mutedtext hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingShift}
                    className="flex-1 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    {isSavingShift ? 'Menyimpan...' : 'Simpan Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================================
            MODAL: GPS COORDINATES ATUR LOKASI
        ================================================================== */}
        {isGpsModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-borderline p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-borderline pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="font-bold text-sm text-heading">Atur Titik GPS Geofencing</h3>
                </div>
                <button onClick={() => setIsGpsModalOpen(false)} className="text-mutedtext hover:text-heading">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-xs font-bold text-[#FF6B00] block">{editingLocName}</span>
                <p className="text-[11px] text-mutedtext">
                  Tentukan titik tengah dan radius absensi untuk lokasi ini.
                </p>
              </div>

              {/* Quick Detect Current Location Button */}
              <button
                type="button"
                onClick={detectAdminCurrentGps}
                disabled={isDetectingCurrentGps}
                className="w-full py-2.5 px-3 bg-[#FFF7ED] hover:bg-[#FFEDD5] border border-[#FED7AA] text-[#C2410C] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Compass className={`w-4 h-4 ${isDetectingCurrentGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingCurrentGps ? 'Membaca GPS...' : '📍 Ambil Titik Lokasi Saya Saat Ini'}</span>
              </button>

              {gpsDetectionMsg && (
                <p className="text-[11px] text-emerald-600 font-medium text-center">
                  {gpsDetectionMsg}
                </p>
              )}

              <form onSubmit={handleSaveGps} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Latitude *</label>
                    <input
                      type="text"
                      value={locLat}
                      onChange={(e) => setLocLat(e.target.value)}
                      placeholder="-3.432100"
                      required
                      className="w-full text-xs font-mono font-bold p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Longitude *</label>
                    <input
                      type="text"
                      value={locLng}
                      onChange={(e) => setLocLng(e.target.value)}
                      placeholder="119.345600"
                      required
                      className="w-full text-xs font-mono font-bold p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Radius Maksimal (Meter)</label>
                  <input
                    type="number"
                    min={20}
                    max={500}
                    value={locRadius}
                    onChange={(e) => setLocRadius(parseInt(e.target.value, 10) || 100)}
                    className="w-full text-xs font-mono font-bold p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                  />
                  <p className="text-[10px] text-mutedtext mt-1">Standar toleransi F&amp;B yang direkomendasikan adalah 100 meter.</p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGpsModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-borderline text-xs font-bold text-mutedtext hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingGps}
                    className="flex-1 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    {isSavingGps ? 'Menyimpan...' : 'Simpan Koordinat'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================================
            MODAL: EMPLOYEE ADD / EDIT
        ================================================================== */}
        {isEmpModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-borderline p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-borderline pb-3">
                <h3 className="font-bold text-sm text-heading">
                  {editingEmp ? 'Edit Data Karyawan Absen' : 'Tambah Karyawan Baru'}
                </h3>
                <button onClick={() => setIsEmpModalOpen(false)} className="text-mutedtext hover:text-heading">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEmp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">ID Karyawan *</label>
                    <input
                      type="text"
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                      placeholder="EMP-01"
                      required
                      className="w-full text-xs font-mono font-bold uppercase p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">
                      PIN Absen (4-6 Angka) {editingEmp ? '(Opsional)' : '*'}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={empPin}
                      onChange={(e) => setEmpPin(e.target.value)}
                      placeholder={editingEmp ? 'Kosongkan jika tetap PIN lama' : '1234'}
                      required={!editingEmp}
                      className="w-full text-xs font-mono font-bold p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-heading mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    required
                    className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Jabatan / Role</label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-semibold focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="Head Barista">Head Barista</option>
                      <option value="Barista">Barista</option>
                      <option value="Kasir Outlet">Kasir Outlet</option>
                      <option value="Kitchen / Cook">Kitchen / Cook</option>
                      <option value="Staf Logistik Gudang">Staf Logistik Gudang</option>
                      <option value="Kurir / Dispatch">Kurir / Dispatch</option>
                      <option value="Helper & Cleaner">Helper &amp; Cleaner</option>
                      <option value="Supervisor Outlet">Supervisor Outlet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="0812-3456-7890"
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Tipe Unit Penempatan</label>
                    <select
                      value={empLocType}
                      onChange={(e) => {
                        const val = e.target.value as LocationType;
                        setEmpLocType(val);
                        setEmpLocId(val === 'warehouse' ? (warehouses[0]?.id || '') : (outlets[0]?.id || ''));
                      }}
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-semibold focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="outlet">Cabang Outlet</option>
                      <option value="warehouse">Gudang Logistik</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-heading mb-1">Pilih Lokasi Tetap *</label>
                    <select
                      value={empLocId}
                      onChange={(e) => setEmpLocId(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-semibold focus:outline-none focus:border-[#FF6B00]"
                    >
                      {empLocType === 'warehouse'
                        ? warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)
                        : outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="empActive"
                    checked={empIsActive}
                    onChange={(e) => setEmpIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#FF6B00] border-borderline"
                  />
                  <label htmlFor="empActive" className="text-xs font-medium text-heading cursor-pointer">
                    Karyawan Berstatus Aktif
                  </label>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmpModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-borderline text-xs font-bold text-mutedtext hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEmp}
                    className="flex-1 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    {isSavingEmp ? 'Menyimpan...' : 'Simpan Karyawan'}
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
