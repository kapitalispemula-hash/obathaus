'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Users,
  LogOut,
  Key,
  RefreshCw,
  FileText,
  HeartPulse,
  Compass,
  ShieldCheck,
  ChevronRight,
  Smartphone,
  Lock,
  Building2,
  Warehouse as WarehouseIcon,
  X,
  Send,
  CalendarDays,
  Coffee,
  Check,
  ChevronLeft,
} from 'lucide-react';
import {
  attendanceService,
  calculateDistanceMeters,
} from '@/lib/services/attendance';
import {
  EmployeeProfile,
  AttendanceLog,
  AttendanceShift,
} from '@/types/database';

const SAVED_EMP_ID_KEY = 'obathaus_active_employee_id';
const ONBOARDING_SEEN_KEY = 'obathaus_attendance_onboarding_seen';

export default function MobileAttendancePage() {
  // Navigation & App Shell State
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'history' | 'account'>('home');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Authenticated Employee
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);

  // Login Form State
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Home Screen / Attendance State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);
  const [shifts, setShifts] = useState<AttendanceShift[]>([]);
  const [locationTarget, setLocationTarget] = useState<{
    name: string;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number;
  } | null>(null);

  // GPS State
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Action Loading & Modals
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Sick/Leave Modal State
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceType, setAbsenceType] = useState<'sick' | 'leave'>('sick');
  const [absenceNotes, setAbsenceNotes] = useState('');

  // History Tab State
  const [employeeLogs, setEmployeeLogs] = useState<AttendanceLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Change PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // INITIALIZATION & REAL-TIME CLOCK
  // --------------------------------------------------------------------------

  useEffect(() => {
    // 1. Clock timer
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 2. Check onboarding
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (!seen) setHasSeenOnboarding(false);

    // 3. Check existing logged-in employee session
    async function initSession() {
      try {
        const savedEmpId = localStorage.getItem(SAVED_EMP_ID_KEY);
        if (savedEmpId) {
          const emps = await attendanceService.getEmployees();
          const match = emps.find((e) => e.id === savedEmpId && e.is_active);
          if (match) {
            setCurrentEmployee(match);
          }
        }
      } catch (err) {
        console.warn('Init session error:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    initSession();
    return () => clearInterval(timer);
  }, []);

  // When currentEmployee is active, load today's log & location & shifts
  useEffect(() => {
    if (!currentEmployee) return;

    async function loadEmployeeData() {
      try {
        const [today, shiftList, loc] = await Promise.all([
          attendanceService.getTodayAttendance(currentEmployee!.id),
          attendanceService.getShifts(),
          attendanceService.getLocationTarget(
            currentEmployee!.assigned_location_type,
            currentEmployee!.assigned_location_id
          ),
        ]);
        setTodayLog(today);
        setShifts(shiftList);
        setLocationTarget(loc);

        // Fetch GPS
        refreshGps(loc);
      } catch (err) {
        console.warn('Error loading employee attendance data:', err);
      }
    }

    loadEmployeeData();
  }, [currentEmployee]);

  // When switching to History tab, load logs
  useEffect(() => {
    if (activeTab === 'history' && currentEmployee) {
      loadHistory();
    }
  }, [activeTab, currentEmployee]);

  const loadHistory = async () => {
    if (!currentEmployee) return;
    setIsLoadingLogs(true);
    try {
      const logs = await attendanceService.getAllAttendanceLogs({ employeeId: currentEmployee.id });
      setEmployeeLogs(logs);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // --------------------------------------------------------------------------
  // GPS REFRESH
  // --------------------------------------------------------------------------

  const refreshGps = (locTarget = locationTarget) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Browser tidak mendukung pendeteksi lokasi GPS.');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserGps({ lat, lng });
        setIsGettingGps(false);

        if (locTarget && locTarget.latitude !== null && locTarget.longitude !== null && locTarget.latitude !== 0) {
          const dist = calculateDistanceMeters(lat, lng, locTarget.latitude, locTarget.longitude);
          setGpsDistance(dist);
        } else {
          setGpsDistance(0); // If admin hasn't set coordinates yet, treat as within premises
        }
      },
      (err) => {
        setIsGettingGps(false);
        console.warn('GPS Error:', err.message);
        setGpsError('Izin GPS belum diaktifkan. Harap izinkan akses lokasi di browser HP Anda.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // --------------------------------------------------------------------------

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCode.trim() || !loginPin) {
      setLoginError('Harap masukkan ID Karyawan dan PIN 4-digit.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await attendanceService.loginEmployee(loginCode, loginPin);
      if (res.success && res.employee) {
        setCurrentEmployee(res.employee);
        if (rememberMe) {
          localStorage.setItem(SAVED_EMP_ID_KEY, res.employee.id);
        } else {
          localStorage.removeItem(SAVED_EMP_ID_KEY);
        }
        setLoginCode('');
        setLoginPin('');
      } else {
        setLoginError(res.error || 'Login gagal.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SAVED_EMP_ID_KEY);
    setCurrentEmployee(null);
    setTodayLog(null);
    setUserGps(null);
    setGpsDistance(null);
    setActiveTab('home');
  };

  // --------------------------------------------------------------------------
  // CLOCK IN / CLOCK OUT HANDLERS
  // --------------------------------------------------------------------------

  const handleClockIn = async () => {
    if (!currentEmployee) return;
    if (!userGps) {
      refreshGps();
      setActionErrorMsg('Sedang membaca koordinat GPS Anda. Silakan coba tekan lagi dalam 2 detik.');
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await attendanceService.clockIn(currentEmployee.id, userGps.lat, userGps.lng);
      if (res.success && res.log) {
        setTodayLog(res.log);
        setActionSuccessMsg(`Absen Masuk Berhasil! ${res.log.status === 'late' ? 'Status: Terlambat' : 'Status: Tepat Waktu'}.`);
      } else {
        setActionErrorMsg(res.error || 'Gagal melakukan absen masuk.');
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayLog) return;

    setIsSubmittingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await attendanceService.clockOut(todayLog.id);
      if (res.success && res.log) {
        setTodayLog(res.log);
        setActionSuccessMsg('Absen Pulang Berhasil! Terima kasih atas kerja keras Anda hari ini.');
      } else {
        setActionErrorMsg(res.error || 'Gagal melakukan absen pulang.');
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!absenceNotes.trim()) {
      setActionErrorMsg('Harap masukkan keterangan/alasan.');
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMsg(null);

    try {
      const res = await attendanceService.reportAbsence(
        currentEmployee.id,
        absenceType,
        absenceNotes.trim()
      );
      if (res.success && res.log) {
        setTodayLog(res.log);
        setIsAbsenceModalOpen(false);
        setAbsenceNotes('');
        setActionSuccessMsg(`Laporan ${absenceType === 'sick' ? 'Sakit' : 'Izin'} berhasil direkam.`);
      } else {
        setActionErrorMsg(res.error || 'Gagal merekam ketidakhadiran.');
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee || !newPin.trim()) return;
    if (newPin.trim().length < 4) {
      setPinChangeMsg('PIN minimal harus 4 digit.');
      return;
    }

    try {
      const updated = await attendanceService.saveEmployee({
        ...currentEmployee,
        pin: newPin.trim(),
      });
      setCurrentEmployee(updated);
      setPinChangeMsg('PIN berhasil diperbarui!');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setNewPin('');
        setPinChangeMsg(null);
      }, 1200);
    } catch {
      setPinChangeMsg('Gagal memperbarui PIN.');
    }
  };

  // Quick Account Switcher Helper for Demo / Testing
  const quickSwitchAccount = (code: string) => {
    setLoginCode(code);
    setLoginPin('1234');
  };

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // --------------------------------------------------------------------------

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            Memuat Absensi OBAT HAUS...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: ONBOARDING SCREEN
  // --------------------------------------------------------------------------

  if (!hasSeenOnboarding && !currentEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between p-6 max-w-md mx-auto select-none">
        <div className="pt-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto shadow-2xl border border-white/20 p-1 bg-white/5 backdrop-blur-md">
            <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              OBAT <span className="text-[#FF6B00]">HAUS</span>
            </h1>
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#FF8A3D] mt-1">
              Digital Attendance System
            </p>
          </div>
        </div>

        <div className="space-y-4 my-auto py-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-[#FF6B00] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Validasi GPS Radius 100m</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Absen masuk & pulang terverifikasi otomatis sesuai koordinat cabang atau gudang Anda.</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Login Cepat ID + PIN</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Akses mandiri langsung dari HP Anda tanpa perlu akun kasir atau email rumit.</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Riwayat Kehadiran Mandiri</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Pantau shift kerja harian, jam lembur, dan rekap bulanan Anda secara transparan.</p>
            </div>
          </div>
        </div>

        <div className="pb-6">
          <button
            onClick={() => {
              setHasSeenOnboarding(true);
              localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
            }}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-sm font-extrabold rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <span>Mulai Absen Sekarang</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: LOGIN SCREEN (ID + PIN)
  // --------------------------------------------------------------------------

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center px-4 sm:px-6 max-w-md mx-auto select-none py-8">
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto shadow-lg border border-white/10 p-1 bg-white/5">
            <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              OBAT <span className="text-[#FF6B00]">HAUS</span>
            </h2>
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[#FF8A3D] text-[10px] font-extrabold uppercase tracking-widest">
              Absensi Digital Karyawan
            </div>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white">Masuk Akun Kehadiran</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Masukkan ID Karyawan dan PIN 4-digit Anda.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                ID Karyawan (Contoh: EMP-01)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="EMP-01"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold uppercase text-sm focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                PIN Keamanan (4-Digit)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm tracking-widest focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF6B00] bg-slate-950 border-slate-700 focus:ring-[#FF6B00]"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-300 font-medium cursor-pointer">
                Ingat akun di HP ini
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-[#FF6B00] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Absensi</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Account Switcher Chips for Field Testing */}
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-bold">
              Akun Cepat (Klik untuk uji coba):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { code: 'EMP-01', name: 'Budi (Barista)' },
                { code: 'EMP-02', name: 'Siti (Kasir)' },
                { code: 'EMP-03', name: 'Andi (Gudang)' },
              ].map((acc) => (
                <button
                  key={acc.code}
                  type="button"
                  onClick={() => quickSwitchAccount(acc.code)}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-[#FF6B00] text-[10px] text-slate-300 font-medium truncate cursor-pointer text-center"
                >
                  <span className="font-bold text-[#FF8A3D] block">{acc.code}</span>
                  <span className="truncate block">{acc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/pos"
            className="text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
          >
            ← Buka Kasir POS Utama
          </Link>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: AUTHENTICATED MOBILE APP SHELL (4 TABS)
  // --------------------------------------------------------------------------

  const maxAllowedRadius = locationTarget?.radius_meters || 100;
  const isWithinGps = gpsDistance !== null ? gpsDistance <= maxAllowedRadius : false;
  const isAlreadyClockedIn = Boolean(todayLog && todayLog.clock_in);
  const isAlreadyClockedOut = Boolean(todayLog && todayLog.clock_out);
  const isReportedAbsence = Boolean(todayLog && (todayLog.status === 'sick' || todayLog.status === 'leave'));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between max-w-md mx-auto shadow-2xl relative select-none">
      {/* 1. TOP MOBILE HEADER */}
      <header className="px-5 pt-4 pb-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden p-0.5 bg-slate-800 border border-slate-700">
            <img src="/logo.png" alt="OBAT HAUS" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <h3 className="font-black text-xs text-white uppercase tracking-tight">OBAT HAUS</h3>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#FF6B00]">
              Absensi Mobile
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-300 font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
            {currentEmployee.employee_code}
          </span>
          <button
            onClick={() => refreshGps()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Segarkan GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin text-[#FF6B00]' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT DEPENDING ON TAB */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Alerts / Feedback */}
        {actionSuccessMsg && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionErrorMsg && (
          <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-2xl text-red-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="text-red-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 1: HOME (ABSEN MASUK / PULANG)
        ------------------------------------------------------------------ */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Employee Profile Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-800 p-4 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-[#FF6B00] border border-orange-500/30 flex items-center justify-center shrink-0 font-black text-lg">
                  {currentEmployee.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white truncate">{currentEmployee.full_name}</h4>
                    <span className="text-[10px] font-black uppercase text-[#FF6B00] bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                      {currentEmployee.role_title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                    {currentEmployee.assigned_location_type === 'warehouse' ? (
                      <WarehouseIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{locationTarget?.name || 'Cabang Penempatan'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Live Clock & Date */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center shadow-lg space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <CalendarDays className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white py-1">
                {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
                <span className="text-xs font-bold text-[#FF6B00] ml-1">WITA</span>
              </div>
            </div>

            {/* GPS Radius Radar Card */}
            <div
              className={`p-4 rounded-3xl border transition-all space-y-2 ${
                isWithinGps
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className={`w-4 h-4 ${isWithinGps ? 'text-emerald-400' : 'text-amber-400 animate-spin'}`} />
                  <span className="text-xs font-bold uppercase tracking-wider">Radar Geolokasi GPS</span>
                </div>
                <button
                  type="button"
                  onClick={() => refreshGps()}
                  className="text-[10px] font-bold underline opacity-80 hover:opacity-100"
                >
                  Cek Ulang
                </button>
              </div>

              {gpsError ? (
                <p className="text-xs text-red-300 leading-tight">{gpsError}</p>
              ) : isGettingGps ? (
                <p className="text-xs text-slate-300 leading-tight">Mendeteksi posisi GPS smartphone Anda...</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold leading-snug">
                    {isWithinGps ? (
                      <>
                        ✅ Posisi Anda berada di <strong>{locationTarget?.name || 'Lokasi'}</strong> (Jarak: {gpsDistance}m • Maks: {maxAllowedRadius}m).
                      </>
                    ) : (
                      <>
                        ⚠️ Anda berada di luar radius lokasi (Jarak: {gpsDistance !== null ? `${gpsDistance}m` : 'Tidak terdeteksi'} • Maks: {maxAllowedRadius}m).
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* HERO ATTENDANCE ACTION BUTTON */}
            <div className="space-y-3 pt-1">
              {isReportedAbsence ? (
                <div className="p-4 bg-purple-950/60 border border-purple-500/40 rounded-3xl text-center space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300 block">
                    {todayLog?.status === 'sick' ? 'Status: Sakit' : 'Status: Izin / Cuti'}
                  </span>
                  <p className="text-xs text-slate-300">
                    Catatan: &quot;{todayLog?.notes || 'Sudah dilaporkan ke manajer/owner'}&quot;
                  </p>
                </div>
              ) : !isAlreadyClockedIn ? (
                <button
                  type="button"
                  disabled={!isWithinGps || isSubmittingAction}
                  onClick={handleClockIn}
                  className={`w-full py-4 rounded-3xl text-sm font-black uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 transition-all transform active:scale-98 ${
                    isWithinGps
                      ? 'bg-gradient-to-r from-[#FF6B00] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white shadow-orange-500/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span>{isSubmittingAction ? 'Merekam Masuk...' : 'Absen Masuk Sekarang'}</span>
                </button>
              ) : !isAlreadyClockedOut ? (
                <button
                  type="button"
                  disabled={!isWithinGps || isSubmittingAction}
                  onClick={handleClockOut}
                  className={`w-full py-4 rounded-3xl text-sm font-black uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5 transition-all transform active:scale-98 ${
                    isWithinGps
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span>{isSubmittingAction ? 'Merekam Pulang...' : 'Absen Pulang Sekarang'}</span>
                </button>
              ) : (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-3xl text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                    Tugas Selesai Hari Ini 🎉
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Masuk: {todayLog?.clock_in ? new Date(todayLog.clock_in).toLocaleTimeString('id-ID') : '-'} • Pulang: {todayLog?.clock_out ? new Date(todayLog.clock_out).toLocaleTimeString('id-ID') : '-'}
                  </p>
                </div>
              )}

              {/* Quick Report Absence Button (Sick / Leave) */}
              {!isAlreadyClockedIn && !isReportedAbsence && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAbsenceModalOpen(true)}
                    className="text-xs text-[#FF8A3D] hover:text-[#FF6B00] font-bold underline cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <HeartPulse className="w-3.5 h-3.5" />
                    <span>Lapor Izin / Sakit (Bebas GPS)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Today's Shift Card */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Shift Kerja Hari Ini
              </span>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Clock className="w-4 h-4 text-[#FF6B00]" />
                  <span>Shift Pagi / Reguler</span>
                </div>
                <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                  08:00 - 16:00 WITA
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 2: SCHEDULE (JADWAL SHIFT & REKAN)
        ------------------------------------------------------------------ */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Jadwal Shift Kerja</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Master jam operasional &amp; rekan kerja satu cabang.</p>
            </div>

            <div className="space-y-2.5">
              {shifts.map((s) => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-white">{s.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Toleransi telat: {s.late_tolerance_minutes} menit</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-[#FF8A3D] bg-orange-500/10 px-2.5 py-1 rounded-xl border border-orange-500/20">
                      {s.start_time} - {s.end_time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
              <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#FF6B00]" />
                <span>Rekan Kerja Satu Unit Penempatan</span>
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Anda ditempatkan di <strong>{locationTarget?.name || 'Unit Penempatan'}</strong>. Anda dapat saling meminjamkan HP untuk absen masuk/pulang dengan memasukkan ID &amp; PIN masing-masing.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 3: HISTORY (RIWAYAT ABSENSI PRIBADI)
        ------------------------------------------------------------------ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Riwayat Kehadiran Saya</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Catatan log masuk &amp; pulang Anda.</p>
              </div>
              <button
                onClick={loadHistory}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="text-center py-8 text-xs text-slate-400">Memuat catatan...</div>
            ) : employeeLogs.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">Belum ada riwayat absensi.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {employeeLogs.map((log) => {
                  const statusColors: Record<string, string> = {
                    present: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    late: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    sick: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    leave: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    alpha: 'bg-red-500/10 text-red-400 border-red-500/20',
                  };
                  const statusLabels: Record<string, string> = {
                    present: 'Hadir Tepat Waktu',
                    late: 'Terlambat',
                    sick: 'Sakit',
                    leave: 'Izin',
                    alpha: 'Alpha',
                  };

                  return (
                    <div key={log.id} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{log.date}</span>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusColors[log.status] || 'bg-slate-800 text-slate-300'}`}>
                          {statusLabels[log.status] || log.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Masuk: <strong>{log.clock_in ? new Date(log.clock_in).toLocaleTimeString('id-ID') : '-'}</strong>
                        </span>
                        <span>
                          Pulang: <strong>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString('id-ID') : '-'}</strong>
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60 truncate">
                          Catatan: {log.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------
            TAB 4: ACCOUNT (PROFIL, GANTI PIN, GANTI REKAN)
        ------------------------------------------------------------------ */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Akun Karyawan</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Informasi profil dan pengaturan keamanan PIN.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-[#FF6B00] border border-orange-500/30 flex items-center justify-center shrink-0 font-black text-lg">
                  {currentEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{currentEmployee.full_name}</h4>
                  <p className="text-xs text-[#FF8A3D] font-mono">{currentEmployee.employee_code}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between py-1 text-slate-300">
                  <span className="text-slate-400">Jabatan:</span>
                  <span className="font-bold">{currentEmployee.role_title}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300">
                  <span className="text-slate-400">Lokasi Penempatan:</span>
                  <span className="font-bold text-right truncate max-w-[200px]">{locationTarget?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-300">
                  <span className="text-slate-400">Nomor Telepon:</span>
                  <span className="font-mono">{currentEmployee.phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-white flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-[#FF6B00]" />
                  <span>Ubah PIN Keamanan Absensi</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Ganti Akun / Absen Rekan</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-xs font-bold text-red-300 flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Keluar Akun Absensi</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. SICK / LEAVE REPORTING MODAL */}
      {isAbsenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#FF6B00]" />
                <span>Lapor Ketidakhadiran</span>
              </h3>
              <button onClick={() => setIsAbsenceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pastikan Anda sudah mengabari dan meminta izin langsung kepada Manajer atau Owner OBAT HAUS via WhatsApp sebelum mengirimkan laporan ini.
            </p>

            <form onSubmit={handleReportAbsence} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAbsenceType('sick')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    absenceType === 'sick'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Sakit
                </button>
                <button
                  type="button"
                  onClick={() => setAbsenceType('leave')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    absenceType === 'leave'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Izin / Cuti
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Keterangan Singkat *
                </label>
                <textarea
                  rows={2}
                  value={absenceNotes}
                  onChange={(e) => setAbsenceNotes(e.target.value)}
                  placeholder="Contoh: Demam tinggi, sudah izin owner"
                  required
                  className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  {isSubmittingAction ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CHANGE PIN MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#FF6B00]" />
                <span>Ubah PIN Absensi</span>
              </h3>
              <button onClick={() => setIsPinModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {pinChangeMsg && (
              <div className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-center text-amber-300">
                {pinChangeMsg}
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Masukkan PIN Baru (Minimal 4 Angka)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full text-sm font-mono tracking-widest p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-center focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-xs font-bold text-white shadow-md cursor-pointer"
                >
                  Simpan PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. DEDICATED BOTTOM NAVIGATION BAR (4 TABS) */}
      <nav className="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 z-40">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'text-[#FF6B00] bg-orange-500/10 font-bold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Absen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'text-[#FF6B00] bg-orange-500/10 font-bold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Jadwal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'text-[#FF6B00] bg-orange-500/10 font-bold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Riwayat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'account'
                ? 'text-[#FF6B00] bg-orange-500/10 font-bold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Akun</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
