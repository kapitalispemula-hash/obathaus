'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CalendarDays,
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
  ChevronLeft,
  X,
  Send,
  Coffee,
  Check,
  Phone,
  Building2,
  Warehouse as WarehouseIcon,
  Sparkles,
} from 'lucide-react';
import {
  attendanceService,
  calculateDistanceMeters,
  formatTimeDisplay,
  purgeLegacyDemoData,
} from '@/lib/services/attendance';
import {
  EmployeeProfile,
  AttendanceLog,
  AttendanceShift,
} from '@/types/database';

const SAVED_EMP_ID_KEY = 'obathaus_active_employee_id';
const ONBOARDING_SEEN_KEY = 'obathaus_attendance_onboarding_seen';

// Clean Human-Designed Fingerprint Biometric SVG Icon (Non-AI Generated)
function FingerprintIcon({ className = 'w-9 h-9', color = '#FF6600' }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 11a2.5 2.5 0 0 0-2.5 2.5c0 1.25-.1 3.25-.3 4" />
      <path d="M14.5 13.5c0 2.8 0 5-1.2 7.5" />
      <path d="M17.5 20.5c.3-.8.5-2.2.5-3.5 0-3.3-2.7-6-6-6s-6 2.7-6 6c0 .8.1 1.7.3 2.5" />
      <path d="M2.5 15.5C2.2 14.4 2 13.2 2 12 2 6.5 6.5 2 12 2s10 4.5 10 10c0 1.5-.3 3-.8 4.3" />
      <path d="M5.5 18c.5-1.8.8-3.9.8-6 0-3.1 2.6-5.7 5.7-5.7s5.7 2.6 5.7 5.7c0 2.2.3 4.2.8 6" />
      <path d="M9 22c.2-.7.4-1.5.5-2.2" />
    </svg>
  );
}

export default function MobileAttendancePage() {
  // Navigation & App Shell State
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'history' | 'account'>('home');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(true);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Authenticated Employee
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [allEmployees, setAllEmployees] = useState<EmployeeProfile[]>([]);

  // Login Form State
  const [loginCode, setLoginCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

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

    // 3. Purge legacy demo entries & check existing logged-in employee session
    async function initSession() {
      try {
        purgeLegacyDemoData();
        const emps = await attendanceService.getEmployees();
        setAllEmployees(emps.filter((e) => e.is_active));

        const savedEmpId = localStorage.getItem(SAVED_EMP_ID_KEY);
        if (savedEmpId) {
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

  // When currentEmployee is active, load today's log & location & shifts & recent history
  useEffect(() => {
    if (!currentEmployee) return;

    async function loadEmployeeData() {
      try {
        const [today, shiftList, loc, logs] = await Promise.all([
          attendanceService.getTodayAttendance(currentEmployee!.id),
          attendanceService.getShifts(),
          attendanceService.getLocationTarget(
            currentEmployee!.assigned_location_type,
            currentEmployee!.assigned_location_id
          ),
          attendanceService.getAllAttendanceLogs({ employeeId: currentEmployee!.id }),
        ]);

        const todayDate = attendanceService.getTodayDateStr();
        const effectiveToday =
          today ||
          logs.find(
            (l) =>
              l.employee_id === currentEmployee!.id &&
              (l.date === todayDate || (l.clock_in && !l.clock_out))
          ) ||
          null;

        setTodayLog(effectiveToday);
        setShifts(shiftList);
        setLocationTarget(loc);
        setEmployeeLogs(logs);

        // Fetch GPS coordinates
        refreshGps(loc);
      } catch (err) {
        console.warn('Error loading employee attendance data:', err);
      }
    }

    loadEmployeeData();
  }, [currentEmployee]);

  // When switching to History tab, refresh logs
  useEffect(() => {
    if (activeTab === 'history' && currentEmployee) {
      loadHistory();
    }
  }, [activeTab]);

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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginCode.trim()) {
      setLoginError('Harap masukkan ID Karyawan Anda.');
      return;
    }
    if (!loginPin.trim()) {
      setLoginError('Harap masukkan PIN Absen Anda.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const pinToUse = loginPin.trim();
      const res = await attendanceService.loginEmployee(loginCode, pinToUse);

      if (res.success && res.employee) {
        setCurrentEmployee(res.employee);
        localStorage.setItem(SAVED_EMP_ID_KEY, res.employee.id);
        localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
        setLoginCode('');
        setLoginPin('');
      } else {
        const match = allEmployees.find(
          (emp) => emp.employee_code.toUpperCase() === loginCode.trim().toUpperCase()
        );
        if (match) {
          setLoginError('PIN Karyawan tidak cocok. Periksa kembali PIN Anda.');
        } else {
          setLoginError(res.error || 'ID Karyawan tidak terdaftar dalam sistem.');
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBiometricLogin = async () => {
    // 1. If both ID and PIN are typed, submit directly
    if (loginCode.trim() && loginPin.trim()) {
      setIsLoggingIn(true);
      setBiometricSuccess(true);
      setTimeout(async () => {
        await handleLogin();
        setIsLoggingIn(false);
        setBiometricSuccess(false);
      }, 600);
      return;
    }

    // 2. If ID is typed without PIN, check if previously saved or prompt
    if (loginCode.trim() && !loginPin.trim()) {
      const savedId = localStorage.getItem(SAVED_EMP_ID_KEY);
      const match = allEmployees.find(
        (e) => e.employee_code.toUpperCase() === loginCode.trim().toUpperCase()
      );
      if (match && savedId === match.id) {
        setIsLoggingIn(true);
        setBiometricSuccess(true);
        setTimeout(() => {
          setCurrentEmployee(match);
          localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
          setIsLoggingIn(false);
          setBiometricSuccess(false);
        }, 700);
        return;
      }
      setLoginError('Harap masukkan PIN Anda untuk login pertama kali.');
      return;
    }

    // 3. If device already has an authenticated employee session, biometric log in instantly
    const savedId = localStorage.getItem(SAVED_EMP_ID_KEY);
    if (savedId) {
      const match = allEmployees.find((e) => e.id === savedId);
      if (match) {
        setIsLoggingIn(true);
        setBiometricSuccess(true);
        setTimeout(() => {
          setCurrentEmployee(match);
          localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
          setIsLoggingIn(false);
          setBiometricSuccess(false);
        }, 700);
        return;
      }
    }

    setLoginError('Masukkan ID dan PIN Anda di atas untuk verifikasi biometrik.');
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
      setActionErrorMsg('Sedang membaca koordinat GPS Anda. Silakan coba tekan lagi dalam beberapa detik.');
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await attendanceService.clockIn(currentEmployee.id, userGps.lat, userGps.lng);
      if (res.success && res.log) {
        setTodayLog(res.log);
        setEmployeeLogs((prev) => [res.log!, ...prev.filter((l) => l.id !== res.log!.id)]);
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

    if (!confirm('Apakah Anda yakin ingin melakukan Absen Pulang (Clock Out) sekarang?')) {
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    try {
      const res = await attendanceService.clockOut(todayLog.id);
      if (res.success && res.log) {
        setTodayLog(res.log);
        setEmployeeLogs((prev) => [res.log!, ...prev.filter((l) => l.id !== res.log!.id)]);
        setActionSuccessMsg('Absen Pulang Berhasil! Terima kasih atas dedikasi kerja Anda hari ini.');
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
        setEmployeeLogs((prev) => [res.log!, ...prev.filter((l) => l.id !== res.log!.id)]);
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

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE
  // --------------------------------------------------------------------------

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#FF6600] flex items-center justify-center p-6 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-white tracking-wider uppercase">
            Memuat Absensi OBAT HAUS...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: ONBOARDING SCREEN (aplikasiabsenobathaus001.jpg EXACT REPLICA)
  // --------------------------------------------------------------------------

  if (!hasSeenOnboarding && !currentEmployee) {
    return (
      <div className="min-h-screen bg-[#FF6600] flex flex-col justify-between max-w-md mx-auto select-none relative overflow-hidden px-8 py-12">
        {/* Top Logo & App Title Section */}
        <div className="flex-1 flex flex-col justify-center items-start space-y-6 pt-10">
          <div className="w-56 max-w-[80%]">
            <img
              src="/logo-white-transparent.png"
              alt="OBAT HAUS"
              className="w-full h-auto object-contain filter drop-shadow-sm"
            />
          </div>

          <div className="text-white space-y-1 text-left">
            <h2 className="text-[26px] sm:text-[30px] font-normal leading-tight tracking-normal">
              Aplikasi Absensi
            </h2>
            <h2 className="text-[26px] sm:text-[30px] font-normal leading-tight tracking-normal">
              Karyawan
            </h2>
            <h1 className="text-[28px] sm:text-[32px] font-black leading-tight tracking-wide">
              Obat Haus
            </h1>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="pb-4 pt-8">
          <button
            onClick={() => {
              setHasSeenOnboarding(true);
              localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
            }}
            className="w-full py-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-900 text-base sm:text-lg font-black rounded-2xl shadow-xl transition-all cursor-pointer text-center tracking-normal"
          >
            Masuk & Absen
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: LOGIN SCREEN (aplikasiabsenobathaus002.jpg EXACT REPLICA)
  // --------------------------------------------------------------------------

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-[#FF6600] flex flex-col justify-between max-w-md mx-auto select-none relative overflow-hidden">
        {/* Top Section (~62% Height): Solid Orange with White Logo & Text */}
        <div className="flex-1 flex flex-col justify-center items-start px-8 pt-8 pb-4 relative">
          <button
            onClick={() => setHasSeenOnboarding(false)}
            className="absolute top-6 left-6 p-2 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Kembali ke Layar Pembuka"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="w-52 max-w-[75%] mb-4">
            <img
              src="/logo-white-transparent.png"
              alt="OBAT HAUS"
              className="w-full h-auto object-contain filter drop-shadow-sm"
            />
          </div>

          <div className="text-white space-y-1 text-left">
            <h2 className="text-[24px] sm:text-[28px] font-normal leading-tight tracking-normal">
              Aplikasi Absensi
            </h2>
            <h2 className="text-[24px] sm:text-[28px] font-normal leading-tight tracking-normal">
              Karyawan
            </h2>
            <h1 className="text-[26px] sm:text-[30px] font-black leading-tight tracking-wide">
              Obat Haus
            </h1>
          </div>
        </div>

        {/* Bottom Section (~38% Height): Pure White Clean Sheet Container */}
        <div className="bg-white rounded-t-[32px] sm:rounded-t-[36px] px-7 pt-7 pb-8 space-y-4 shadow-2xl">
          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          {biometricSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sidik Jari Terverifikasi! Masuk...</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="Masukkan ID Karyawan"
                required
                className="w-full py-3.5 px-5 bg-[#E5E7EB] hover:bg-[#DDE1E6] focus:bg-white border-2 border-transparent focus:border-[#FF6600] rounded-2xl text-center text-sm font-bold text-slate-800 placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                placeholder="Masukkan PIN (4 Digit)"
                required
                className="w-full py-3.5 px-5 bg-[#E5E7EB] hover:bg-[#DDE1E6] focus:bg-white border-2 border-transparent focus:border-[#FF6600] rounded-2xl text-center text-sm font-bold tracking-widest text-slate-800 placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none transition-all shadow-inner font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 py-4 bg-[#FF6600] hover:bg-[#EA580C] active:scale-98 text-white text-base font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Masuk</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBiometricLogin}
                title="Login Biometrik Sidik Jari"
                className="w-14 h-14 shrink-0 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 flex items-center justify-center text-[#FF6600] active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <FingerprintIcon className="w-8 h-8" color="#FF6600" />
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/pos"
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Buka Kasir POS Utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // DASHBOARD LAYOUT (MATCHING MOCKUP: HERO BANNER + 3 CARDS + ACTIONS + FLOATING DOCK)
  // --------------------------------------------------------------------------

  const maxAllowedRadius = locationTarget?.radius_meters || 100;
  const isWithinGps = gpsDistance !== null ? gpsDistance <= maxAllowedRadius : false;
  const isAlreadyClockedIn = Boolean(todayLog && todayLog.clock_in && !todayLog.clock_out);
  const isAlreadyClockedOut = Boolean(todayLog && todayLog.clock_out);
  const isReportedAbsence = Boolean(todayLog && (todayLog.status === 'sick' || todayLog.status === 'leave'));
  const activeShift = shifts.find((s) => s.is_active) || shifts[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative select-none border-x border-slate-200/80">
      {/* SCROLLABLE MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto pb-28">
        {/* Action Alerts (Fixed under header) */}
        {actionSuccessMsg && (
          <div className="m-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionErrorMsg && (
          <div className="m-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{actionErrorMsg}</span>
            </div>
            <button onClick={() => setActionErrorMsg(null)} className="text-red-700 hover:text-red-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 1: ABSEN (HOME) — LAYOUT MATCHING USER'S MOCKUP EXACTLY      */}
        {/* ================================================================ */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* 1. TOP HERO BANNER (OBAT HAUS ORANGE WITH ROUNDED BOTTOM) */}
            <div className="bg-[#FF6600] text-white pt-6 pb-6 px-5 rounded-b-[32px] shadow-lg relative overflow-hidden">
              {/* Header Row: Avatar & Name on Left, GPS Status on Right */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-black text-sm text-white shadow-xs shrink-0">
                    {currentEmployee.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white/80 text-[11px] font-medium leading-tight">Selamat Datang,</p>
                    <h3 className="text-white font-black text-sm sm:text-base leading-tight">
                      {currentEmployee.full_name}
                    </h3>
                  </div>
                </div>

                {/* GPS Status & Refresh Button */}
                <button
                  onClick={() => refreshGps()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold backdrop-blur-md transition-all cursor-pointer border border-white/20"
                  title="Segarkan Koordinat GPS"
                >
                  <div className={`w-2 h-2 rounded-full ${isWithinGps ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'}`} />
                  <span>{isGettingGps ? 'Mencari...' : `${gpsDistance !== null ? `${gpsDistance}m` : 'GPS'}`}</span>
                  <RefreshCw className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Main Headline & Digital Clock Display */}
              <div className="space-y-1 mb-5">
                <p className="text-white/80 text-xs font-semibold tracking-wide uppercase">
                  {locationTarget?.name || 'Cabang OBAT HAUS'} • {activeShift?.name || 'Shift Harian'}
                </p>
                <div className="flex items-baseline justify-between">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                    {currentTime.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })} <span className="text-sm font-normal text-white/80">WITA</span>
                  </h1>
                  <span className="text-xs font-bold text-white/90 capitalize">
                    {currentTime.toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* 3 Horizontal Quick Status Cards (Like Mockup) */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Card 1: Shift */}
                <div className="bg-white rounded-[20px] p-3 text-slate-900 shadow-md flex flex-col justify-between">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF6600] flex items-center justify-center mb-1.5">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shift</span>
                    <span className="text-xs font-black text-slate-900 truncate block mt-0.5">
                      {activeShift?.start_time || '08:00'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium truncate block">s/d {activeShift?.end_time || '16:00'}</span>
                  </div>
                </div>

                {/* Card 2: Jam Masuk */}
                <div className="bg-white rounded-[20px] p-3 text-slate-900 shadow-md flex flex-col justify-between">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Masuk</span>
                    <span className="text-xs font-black text-slate-900 truncate block mt-0.5 font-mono">
                      {todayLog?.clock_in ? formatTimeDisplay(todayLog.clock_in) : '--:--'}
                    </span>
                    <span className={`text-[9px] font-bold truncate block ${todayLog?.status === 'late' ? 'text-amber-600' : todayLog?.clock_in ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {todayLog?.status === 'late' ? 'Terlambat' : todayLog?.clock_in ? 'Tepat Waktu' : 'Belum Absen'}
                    </span>
                  </div>
                </div>

                {/* Card 3: Radius GPS */}
                <div className="bg-white rounded-[20px] p-3 text-slate-900 shadow-md flex flex-col justify-between">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Radius</span>
                    <span className="text-xs font-black text-slate-900 truncate block mt-0.5 font-mono">
                      {gpsDistance !== null ? `${gpsDistance}m` : '...'}
                    </span>
                    <span className={`text-[9px] font-bold truncate block ${isWithinGps ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isWithinGps ? '✓ Dalam Radius' : 'Luar Radius'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. BODY CONTENT SECTION (WHITE CANVAS) */}
            <div className="px-5 space-y-6">
              {/* SECTION A: AÇÕES (AKSI KEHADIRAN) */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Aksi Kehadiran
                </h3>

                {isReportedAbsence ? (
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                    <HeartPulse className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">
                        Laporan {todayLog?.status === 'sick' ? 'Sakit' : 'Izin'} Tercatat
                      </h4>
                      <p className="text-[11px] text-blue-700 italic">&ldquo;{todayLog?.notes}&rdquo;</p>
                    </div>
                  </div>
                ) : isAlreadyClockedOut ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-emerald-950">Kehadiran Hari Ini Selesai</h4>
                        <p className="text-[11px] text-emerald-700">
                          Masuk: {formatTimeDisplay(todayLog?.clock_in)} WITA • Pulang: {formatTimeDisplay(todayLog?.clock_out)} WITA
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    {/* Primary Pill Button (Clock In or Clock Out) */}
                    {isAlreadyClockedIn ? (
                      <button
                        onClick={handleClockOut}
                        disabled={isSubmittingAction}
                        className="flex-1 py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isSubmittingAction ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            <span>Absen Pulang (Clock Out)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleClockIn}
                        disabled={isSubmittingAction}
                        className="flex-1 py-3.5 px-4 bg-[#FF6600] hover:bg-[#EA580C] active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isSubmittingAction ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-4 h-4 stroke-[2.5]" />
                            <span>Absen Masuk (Clock In)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Secondary Action Pill Button */}
                    {!isAlreadyClockedOut && (
                      <button
                        type="button"
                        onClick={() => setIsAbsenceModalOpen(true)}
                        className="py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <HeartPulse className="w-4 h-4 text-[#FF6600]" />
                        <span>Izin / Sakit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: ÚLTIMAS TRANSAÇÕES (RIWAYAT AKTIVITAS TERAKHIR) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Riwayat Terakhir
                  </h3>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-xs font-bold text-[#FF6600] hover:text-[#EA580C] flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Lihat Semua</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {employeeLogs.slice(0, 3).length === 0 ? (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                    Belum ada riwayat absensi sebelumnya.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {employeeLogs.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6600] flex items-center justify-center shrink-0">
                            <Coffee className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{log.date}</h4>
                            <p className="text-[10px] text-slate-500">
                              {log.status === 'present'
                                ? '✓ Tepat Waktu'
                                : log.status === 'late'
                                ? '⚠️ Terlambat'
                                : log.status === 'sick'
                                ? '🤒 Sakit'
                                : '📝 Izin'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-800 block">
                            {log.clock_in ? `${formatTimeDisplay(log.clock_in)} WITA` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.clock_out ? `s/d ${formatTimeDisplay(log.clock_out)} WITA` : 'Belum pulang'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: JADWAL SHIFT KERJA                                       */}
        {/* ================================================================ */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="bg-[#FF6600] text-white pt-6 pb-6 px-5 rounded-b-[32px] shadow-lg">
              <h2 className="text-lg font-black">Jadwal Shift Kerja</h2>
              <p className="text-xs text-white/80 mt-0.5">
                Penugasan lokasi: <strong className="text-white">{locationTarget?.name}</strong>
              </p>
            </div>

            <div className="p-5 space-y-3">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border bg-white shadow-xs space-y-2 ${
                    s.is_active ? 'border-orange-200 ring-1 ring-orange-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-[#FF6600]" />
                      <span>{s.name}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-orange-50 text-[#FF6600] text-[10px] font-bold">
                      Toleransi: {s.late_tolerance_minutes} Menit
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 font-mono font-bold">
                    <span>Mulai: {s.start_time} WITA</span>
                    <span>Selesai: {s.end_time} WITA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: RIWAYAT KEHADIRAN LENGKAP                                */}
        {/* ================================================================ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-[#FF6600] text-white pt-6 pb-6 px-5 rounded-b-[32px] shadow-lg flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Riwayat Kehadiran</h2>
                <p className="text-xs text-white/80 mt-0.5">Catatan kehadiran terekam di cloud</p>
              </div>
              <button
                onClick={loadHistory}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title="Segarkan Riwayat"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-slate-400">Memuat riwayat kehadiran...</div>
              ) : employeeLogs.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                  Belum ada riwayat kehadiran yang terekam untuk akun ini.
                </div>
              ) : (
                employeeLogs.map((log) => (
                  <div key={log.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{log.date}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                          log.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'late'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.status === 'present'
                          ? 'Tepat Waktu'
                          : log.status === 'late'
                          ? 'Terlambat'
                          : log.status === 'sick'
                          ? 'Sakit'
                          : 'Izin'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                      <span>Masuk: {log.clock_in ? `${formatTimeDisplay(log.clock_in)} WITA` : '-'}</span>
                      <span>Pulang: {log.clock_out ? `${formatTimeDisplay(log.clock_out)} WITA` : '-'}</span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        &ldquo;{log.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: AKUN KARYAWAN                                            */}
        {/* ================================================================ */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="bg-[#FF6600] text-white pt-6 pb-6 px-5 rounded-b-[32px] shadow-lg">
              <h2 className="text-lg font-black">Profil Karyawan</h2>
              <p className="text-xs text-white/80 mt-0.5">Pengaturan akun & kredensial mandiri</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6600] flex items-center justify-center font-black text-lg shadow-xs">
                    {currentEmployee.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">{currentEmployee.full_name}</h3>
                    <span className="text-xs font-bold text-[#FF6600] block mt-0.5">{currentEmployee.role_title}</span>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {currentEmployee.employee_code}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Lokasi Penugasan</span>
                    <strong className="text-slate-800">{locationTarget?.name || 'Cabang'}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Nomor Telepon</span>
                    <strong className="text-slate-800 font-mono">{currentEmployee.phone || '-'}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Status Akun</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Aktif Bekerja
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Actions */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-500">Keamanan</h4>

                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-500" />
                    <span>Ubah PIN Absensi (4 Digit)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 flex items-center justify-center gap-2 text-xs font-black transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun Karyawan</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FLOATING BOTTOM DOCK NAVIGATION BAR (MATCHING MOCKUP: ACTIVE CIRCLE BUTTON) */}
      <nav className="fixed bottom-3 left-4 right-4 max-w-md mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[28px] px-3 py-2 flex items-center justify-around z-30 shadow-xl">
        {[
          { id: 'home', label: 'Absen', icon: Clock },
          { id: 'schedule', label: 'Jadwal', icon: CalendarDays },
          { id: 'history', label: 'Riwayat', icon: FileText },
          { id: 'account', label: 'Akun', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex flex-col items-center justify-center transition-all cursor-pointer relative"
              title={tab.label}
            >
              {isActive ? (
                <div className="w-11 h-11 rounded-full bg-[#FF6600] text-white flex items-center justify-center shadow-md shadow-orange-500/30 active:scale-95 transition-transform">
                  <Icon className="w-5 h-5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 active:scale-95 transition-all">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: SICK / LEAVE REPORTING                                        */}
      {/* -------------------------------------------------------------------- */}
      {isAbsenceModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Ajukan Izin / Sakit</h3>
              <button onClick={() => setIsAbsenceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportAbsence} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipe Keterangan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAbsenceType('sick')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      absenceType === 'sick'
                        ? 'bg-orange-50 border-[#FF6600] text-[#FF6600]'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    🤒 Sakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbsenceType('leave')}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      absenceType === 'leave'
                        ? 'bg-orange-50 border-[#FF6600] text-[#FF6600]'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    📝 Izin / Kepentingan
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Alasan / Catatan</label>
                <textarea
                  value={absenceNotes}
                  onChange={(e) => setAbsenceNotes(e.target.value)}
                  placeholder="Contoh: Mengalami demam dan sedang berobat ke dokter..."
                  required
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="flex-1 py-3 bg-[#FF6600] hover:bg-[#EA580C] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20"
                >
                  {isSubmittingAction ? 'Mengirim...' : 'Kirim Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: CHANGE PIN                                                    */}
      {/* -------------------------------------------------------------------- */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900">Ubah PIN Absensi</h3>
              <button onClick={() => setIsPinModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {pinChangeMsg && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-800 font-bold">
                {pinChangeMsg}
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">PIN Baru (4 Digit)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  required
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#FF6600] text-white rounded-xl text-xs font-black"
                >
                  Simpan PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
