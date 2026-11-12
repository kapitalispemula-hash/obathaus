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
  Download,
  Smartphone,
  Share,
  PlusSquare,
  Copy,
  Bell,
  Star,
  ArrowRight,
  Plus,
  Home,
  Briefcase,
  Camera,
  Upload,
  Edit3,
} from 'lucide-react';
import {
  attendanceService,
  calculateDistanceMeters,
  formatTimeDisplay,
  purgeLegacyDemoData,
} from '@/lib/services/attendance';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import {
  EmployeeProfile,
  AttendanceLog,
  AttendanceShift,
} from '@/types/database';

const SAVED_EMP_ID_KEY = 'obathaus_active_employee_id';
const SAVED_EMP_PROFILE_KEY = 'obathaus_active_employee_profile';
const ONBOARDING_SEEN_KEY = 'obathaus_attendance_onboarding_seen';
const BIOMETRIC_EMP_ID_KEY = 'obathaus_biometric_emp_id';
const BIOMETRIC_EMP_NAME_KEY = 'obathaus_biometric_emp_name';
const BIOMETRIC_EMP_CODE_KEY = 'obathaus_biometric_emp_code';
const BIOMETRIC_CRED_ID_KEY = 'obathaus_biometric_cred_id';
const BIOMETRIC_TOKEN_KEY = 'obathaus_biometric_token';

function saveActiveEmployeeCache(emp: EmployeeProfile | null) {
  if (typeof window === 'undefined') return;
  if (!emp) {
    localStorage.removeItem(SAVED_EMP_ID_KEY);
    localStorage.removeItem(SAVED_EMP_PROFILE_KEY);
    return;
  }
  const { pin: _omitted, ...safe } = emp;
  localStorage.setItem(SAVED_EMP_ID_KEY, emp.id);
  localStorage.setItem(SAVED_EMP_PROFILE_KEY, JSON.stringify(safe));
}

// Base64 WebAuthn buffer conversion helpers
function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

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

  // Biometric Enrollment State
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [isBiometricEnrollModalOpen, setIsBiometricEnrollModalOpen] = useState(false);
  const [isScanningBiometric, setIsScanningBiometric] = useState(false);
  const [biometricEnrollMsg, setBiometricEnrollMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [enrolledBiometricName, setEnrolledBiometricName] = useState<string | null>(null);

  // PWA App Installation State specifically for /absen
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isInstallGuideModalOpen, setIsInstallGuideModalOpen] = useState(false);
  const [installGuideTab, setInstallGuideTab] = useState<'android' | 'ios'>('android');
  const [copiedLink, setCopiedLink] = useState(false);

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
  const [historyFilter, setHistoryFilter] = useState<'all' | 'month' | 'on_time' | 'late'>('all');

  // Change PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileMsg, setEditProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        const supabaseReady = isSupabaseConfigured();

        if (supabaseReady) {
          const sessionEmp = await attendanceService.getSessionEmployee();
          if (sessionEmp && sessionEmp.is_active) {
            const avatarKey = `obathaus_employee_avatar_${sessionEmp.id}`;
            const savedAvatar = localStorage.getItem(avatarKey);
            let activeEmp = sessionEmp;

            // Lazy-migrate legacy Base64 avatar (either in localStorage or inline DB text) to Supabase Storage
            const legacyDataUrl =
              sessionEmp.avatar_url?.startsWith('data:image/')
                ? sessionEmp.avatar_url
                : !sessionEmp.avatar_url && savedAvatar?.startsWith('data:image/')
                  ? savedAvatar
                  : null;

            if (legacyDataUrl && typeof navigator !== 'undefined' && navigator.onLine) {
              try {
                const uploaded = await attendanceService.uploadEmployeeAvatar(legacyDataUrl);
                activeEmp = uploaded.employee || { ...sessionEmp, avatar_url: uploaded.avatar_url };
                localStorage.removeItem(avatarKey);
              } catch {
                if (!activeEmp.avatar_url && savedAvatar) {
                  activeEmp = { ...activeEmp, avatar_url: savedAvatar };
                }
              }
            } else if (sessionEmp.avatar_url && !sessionEmp.avatar_url.startsWith('data:')) {
              localStorage.removeItem(avatarKey);
            } else if (!sessionEmp.avatar_url && savedAvatar) {
              activeEmp = { ...sessionEmp, avatar_url: savedAvatar };
            }

            setCurrentEmployee(activeEmp);
            saveActiveEmployeeCache(activeEmp);
            await attendanceService.syncPendingAttendance();
          } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
            // Offline PWA fallback: keep active employee UI usable until network reconnects
            const cachedRaw = localStorage.getItem(SAVED_EMP_PROFILE_KEY);
            if (cachedRaw) {
              try {
                const cachedEmp = JSON.parse(cachedRaw) as EmployeeProfile;
                if (cachedEmp && cachedEmp.id && cachedEmp.is_active) {
                  setCurrentEmployee(cachedEmp);
                }
              } catch {}
            }
          } else {
            saveActiveEmployeeCache(null);
          }
        } else {
          await attendanceService.syncPendingAttendance();
          const emps = await attendanceService.getEmployees();
          setAllEmployees(emps.filter((e) => e.is_active));

          const savedEmpId = localStorage.getItem(SAVED_EMP_ID_KEY);
          if (savedEmpId) {
            const match = emps.find((e) => e.id === savedEmpId && e.is_active);
            if (match) {
              const savedAvatar = localStorage.getItem(`obathaus_employee_avatar_${match.id}`);
              if (savedAvatar && !match.avatar_url) {
                match.avatar_url = savedAvatar;
              }
              setCurrentEmployee(match);
            }
          }
        }

        // Load enrolled biometric device connection
        const bioEmpId = localStorage.getItem(BIOMETRIC_EMP_ID_KEY);
        const bioEmpName = localStorage.getItem(BIOMETRIC_EMP_NAME_KEY);
        const hasBioToken = !supabaseReady || Boolean(localStorage.getItem(BIOMETRIC_TOKEN_KEY));
        if (bioEmpId && bioEmpName && hasBioToken) {
          setEnrolledBiometricName(bioEmpName);
        } else {
          setEnrolledBiometricName(null);
        }
      } catch (err) {
        console.warn('Init session error:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    initSession();

    // 4. Check standalone PWA mode & listen to install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      if (typeof window !== 'undefined') {
        (window as any).__pwaDeferredPrompt = e;
      }
    };

    const handleAppInstalled = () => {
      setIsStandaloneApp(true);
      setDeferredInstallPrompt(null);
    };

    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandaloneApp(isStandalone);

      const userAgent = navigator.userAgent || '';
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        setInstallGuideTab('ios');
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      window.addEventListener('appinstalled', handleAppInstalled);

      if ((window as any).__pwaDeferredPrompt) {
        setDeferredInstallPrompt((window as any).__pwaDeferredPrompt);
      }
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      }
    };
  }, []);

  const currentEmployeeId = currentEmployee?.id;

  // When currentEmployee is active, load today's log & location & shifts & recent history + subscribe Realtime
  useEffect(() => {
    if (!currentEmployee || !currentEmployeeId) return;

    // Check if current employee has enrolled fingerprint on this device
    const bioEmpId = localStorage.getItem(BIOMETRIC_EMP_ID_KEY);
    const hasBioToken = !isSupabaseConfigured() || Boolean(localStorage.getItem(BIOMETRIC_TOKEN_KEY));
    setIsBiometricEnrolled(bioEmpId === currentEmployeeId && hasBioToken);

    async function loadEmployeeData(skipGpsRefresh = false) {
      if (!currentEmployee) return;
      try {
        const [today, shiftList, loc, logs] = await Promise.all([
          attendanceService.getTodayAttendance(currentEmployeeId!),
          attendanceService.getShifts(),
          attendanceService.getLocationTarget(
            currentEmployee.assigned_location_type,
            currentEmployee.assigned_location_id
          ),
          attendanceService.getAllAttendanceLogs({ employeeId: currentEmployeeId! }),
        ]);

        const todayDate = attendanceService.getTodayDateStr();
        const effectiveToday =
          today ||
          logs.find(
            (l) =>
              l.employee_id === currentEmployeeId &&
              (l.date === todayDate || (l.clock_in && !l.clock_out))
          ) ||
          null;

        setTodayLog(effectiveToday);
        setShifts(shiftList);
        setLocationTarget(loc);
        setEmployeeLogs(logs);

        if (!skipGpsRefresh) {
          refreshGps(loc);
        }
      } catch (err) {
        console.warn('Error loading employee attendance data:', err);
      }
    }

    loadEmployeeData(false);

    const handleOnlineSync = async () => {
      await attendanceService.syncPendingAttendance();
      await loadEmployeeData(true);
    };
    window.addEventListener('online', handleOnlineSync);

    let channel: any = null;
    const supabase = isSupabaseConfigured() ? createClient() : null;
    if (supabase) {
      channel = supabase
        .channel(`absen-emp-${currentEmployeeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'employee_profiles', filter: `id=eq.${currentEmployeeId}` },
          async () => {
            const updated = await attendanceService.getSessionEmployee();
            if (updated) {
              setCurrentEmployee(updated);
              saveActiveEmployeeCache(updated);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs', filter: `employee_id=eq.${currentEmployeeId}` },
          () => {
            loadEmployeeData(true);
          }
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_shifts' }, async () => {
          const shiftList = await attendanceService.getShifts();
          setShifts(shiftList);
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('online', handleOnlineSync);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentEmployeeId]);

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
        saveActiveEmployeeCache(res.employee);
        localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
        setLoginCode('');
        setLoginPin('');
        void attendanceService.syncPendingAttendance();
      } else if (!isSupabaseConfigured()) {
        const match = allEmployees.find(
          (emp) => emp.employee_code.toUpperCase() === loginCode.trim().toUpperCase()
        );
        if (match) {
          setLoginError('PIN Karyawan tidak cocok. Periksa kembali PIN Anda.');
        } else {
          setLoginError(res.error || 'ID Karyawan tidak terdaftar dalam sistem.');
        }
      } else {
        setLoginError(res.error || 'ID Karyawan atau PIN tidak cocok.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoginError(null);

    // 1. If both ID and PIN are typed in the input box, submit form directly
    if (loginCode.trim() && loginPin.trim()) {
      setIsLoggingIn(true);
      await handleLogin();
      setIsLoggingIn(false);
      return;
    }

    // 2. Check enrolled biometric employee on this device
    const bioId = typeof window !== 'undefined' ? localStorage.getItem(BIOMETRIC_EMP_ID_KEY) : null;
    const bioCode = typeof window !== 'undefined' ? localStorage.getItem(BIOMETRIC_EMP_CODE_KEY) : null;
    const credIdBase64 = typeof window !== 'undefined' ? localStorage.getItem(BIOMETRIC_CRED_ID_KEY) : null;
    const bioToken = typeof window !== 'undefined' ? localStorage.getItem(BIOMETRIC_TOKEN_KEY) : null;
    const supabaseReady = isSupabaseConfigured();

    if (!bioId) {
      setLoginError(
        'Belum ada sidik jari yang direkam di HP ini. Silakan masuk dengan ID & PIN terlebih dahulu, lalu rekam sidik jari di menu Akun.'
      );
      return;
    }

    if (supabaseReady && !bioToken) {
      setLoginError(
        'Token keamanan sidik jari perlu diperbarui. Silakan masuk dengan ID & PIN terlebih dahulu, lalu hubungkan ulang sidik jari di menu Akun.'
      );
      return;
    }

    let demoTargetEmp: EmployeeProfile | undefined;
    if (!supabaseReady) {
      let emps = allEmployees;
      if (emps.length === 0) {
        try {
          emps = await attendanceService.getEmployees();
          setAllEmployees(emps.filter((e) => e.is_active));
        } catch (e) {
          console.warn('Failed to fetch employees for biometric login:', e);
        }
      }
      demoTargetEmp =
        emps.find((e) => e.id === bioId && e.is_active) ||
        (bioCode ? emps.find((e) => e.employee_code.toUpperCase() === bioCode.toUpperCase() && e.is_active) : undefined);

      if (!demoTargetEmp) {
        setLoginError('Data karyawan sidik jari tidak ditemukan atau akun sedang tidak aktif.');
        return;
      }
    }

    if (typeof window === 'undefined' || !window.PublicKeyCredential) {
      setLoginError('Browser di perangkat ini belum mendukung pemindai biometrik WebAuthn.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const allowCredentials = credIdBase64
        ? [
            {
              id: base64ToBuffer(credIdBase64),
              type: 'public-key' as const,
              transports: ['internal' as const],
            },
          ]
        : undefined;

      // Panggil sensor biometrik fisik bawaan perangkat HP (Android / iOS)
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials,
          userVerification: 'required', // Memicu prompt sidik jari fisik HP!
          timeout: 60000,
        },
      });

      if (!assertion) {
        throw new Error('Verifikasi sidik jari dibatalkan.');
      }

      let loggedInEmp = demoTargetEmp;
      if (supabaseReady) {
        const res = await attendanceService.loginWithBiometricToken(bioToken!);
        if (!res.success || !res.employee) {
          throw new Error(res.error || 'Sesi sidik jari tidak valid. Silakan masuk dengan ID & PIN.');
        }
        loggedInEmp = res.employee;
      }

      if (!loggedInEmp) {
        throw new Error('Data karyawan tidak ditemukan.');
      }

      // Verifikasi sidik jari fisik + token server berhasil!
      setBiometricSuccess(true);
      setTimeout(() => {
        setCurrentEmployee(loggedInEmp!);
        saveActiveEmployeeCache(loggedInEmp!);
        localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
        setIsLoggingIn(false);
        setBiometricSuccess(false);
        void attendanceService.syncPendingAttendance();
      }, 500);
    } catch (err: any) {
      setIsLoggingIn(false);
      setBiometricSuccess(false);
      console.warn('Biometric verification error:', err);
      if (err.name === 'NotAllowedError') {
        setLoginError('Verifikasi sidik jari dibatalkan atau sidik jari tidak cocok.');
      } else {
        setLoginError(err.message || 'Gagal memverifikasi sidik jari pada perangkat ini.');
      }
    }
  };

  const handleEnrollBiometric = async () => {
    if (!currentEmployee) return;
    setIsScanningBiometric(true);
    setBiometricEnrollMsg(null);

    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('Browser di perangkat ini belum mendukung sensor biometrik WebAuthn.');
      }

      // Periksa apakah sensor biometrik fisik (sidik jari / Face ID) tersedia di HP
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error('Sensor sidik jari perangkat tidak terdeteksi atau belum diaktifkan di pengaturan HP.');
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new TextEncoder().encode(currentEmployee.id);

      // Panggil pendaftaran sensor biometrik perangkat bawaan (Android Biometric Prompt)
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'OBAT HAUS Absensi',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: currentEmployee.employee_code,
            displayName: currentEmployee.full_name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Sensor sidik jari bawaan HP
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!cred) {
        throw new Error('Perekaman sidik jari dibatalkan.');
      }

      // Simpan Credential ID hardware + signed device token dari server
      const credIdBase64 = bufferToBase64(cred.rawId);
      if (isSupabaseConfigured()) {
        const bioToken = await attendanceService.createBiometricToken(credIdBase64);
        if (!bioToken) {
          throw new Error('Gagal mendaftarkan token sidik jari ke server. Silakan login ulang dengan PIN lalu coba kembali.');
        }
        localStorage.setItem(BIOMETRIC_TOKEN_KEY, bioToken);
      }

      localStorage.setItem(BIOMETRIC_CRED_ID_KEY, credIdBase64);
      localStorage.setItem(BIOMETRIC_EMP_ID_KEY, currentEmployee.id);
      localStorage.setItem(BIOMETRIC_EMP_NAME_KEY, currentEmployee.full_name);
      localStorage.setItem(BIOMETRIC_EMP_CODE_KEY, currentEmployee.employee_code);

      setIsBiometricEnrolled(true);
      setEnrolledBiometricName(currentEmployee.full_name);
      setBiometricEnrollMsg({
        type: 'success',
        text: 'Sensor sidik jari HP berhasil dihubungkan!',
      });
    } catch (err: any) {
      console.warn('Biometric enroll error:', err);
      let errorText = 'Gagal merekam sidik jari. Silakan coba kembali.';
      if (err.name === 'NotAllowedError') {
        errorText = 'Perekaman sidik jari dibatalkan oleh pengguna.';
      } else if (err.message) {
        errorText = err.message;
      }
      setBiometricEnrollMsg({
        type: 'error',
        text: errorText,
      });
    } finally {
      setIsScanningBiometric(false);
    }
  };

  const handleRemoveBiometric = () => {
    localStorage.removeItem(BIOMETRIC_EMP_ID_KEY);
    localStorage.removeItem(BIOMETRIC_EMP_NAME_KEY);
    localStorage.removeItem(BIOMETRIC_EMP_CODE_KEY);
    localStorage.removeItem(BIOMETRIC_CRED_ID_KEY);
    localStorage.removeItem(BIOMETRIC_TOKEN_KEY);
    setIsBiometricEnrolled(false);
    setEnrolledBiometricName(null);
    setBiometricEnrollMsg({
      type: 'success',
      text: 'Sambungan sidik jari di HP ini telah dihapus.',
    });
  };

  const handleInstallAbsenApp = async () => {
    const prompt =
      deferredInstallPrompt ||
      (typeof window !== 'undefined' ? (window as any).__pwaDeferredPrompt : null);
    if (prompt) {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          setIsStandaloneApp(true);
          setDeferredInstallPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setIsInstallGuideModalOpen(true);
      }
    } else {
      setIsInstallGuideModalOpen(true);
    }
  };

  const handleCopyAbsenLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://obathaus.vercel.app/absen');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleLogout = () => {
    void attendanceService.logoutEmployee();
    saveActiveEmployeeCache(null);
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
      const updated = isSupabaseConfigured()
        ? await attendanceService.updateOwnProfile({ pin: newPin.trim() })
        : await attendanceService.saveEmployee({
            ...currentEmployee,
            pin: newPin.trim(),
          });
      setCurrentEmployee(updated);
      saveActiveEmployeeCache(updated);
      setPinChangeMsg('PIN berhasil diperbarui!');
      setTimeout(() => {
        setIsPinModalOpen(false);
        setNewPin('');
        setPinChangeMsg(null);
      }, 1200);
    } catch (err: any) {
      setPinChangeMsg(err?.message || 'Gagal memperbarui PIN.');
    }
  };

  // --------------------------------------------------------------------------
  // EDIT PROFILE HANDLERS (FOTO/AVATAR, NAMA, JABATAN, NO. WA)
  // --------------------------------------------------------------------------

  const openEditProfileModal = () => {
    if (!currentEmployee) return;
    setEditName(currentEmployee.full_name || '');
    setEditRole(currentEmployee.role_title || '');
    setEditPhone(currentEmployee.phone || '');
    setEditAvatarUrl(currentEmployee.avatar_url || null);
    setEditProfileMsg(null);
    setIsEditProfileModalOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setEditProfileMsg({ type: 'error', text: 'Ukuran foto maksimal 5 MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const targetSize = 240;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setEditAvatarUrl(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!editName.trim()) {
      setEditProfileMsg({ type: 'error', text: 'Nama karyawan tidak boleh kosong.' });
      return;
    }

    setIsSavingProfile(true);
    setEditProfileMsg(null);
    try {
      const avatarKey = `obathaus_employee_avatar_${currentEmployee.id}`;
      let saved: EmployeeProfile;

      if (isSupabaseConfigured()) {
        let nextAvatarUrl = editAvatarUrl;
        if (editAvatarUrl && editAvatarUrl.startsWith('data:image/')) {
          const uploaded = await attendanceService.uploadEmployeeAvatar(editAvatarUrl);
          nextAvatarUrl = uploaded.avatar_url;
        } else if (!editAvatarUrl && currentEmployee.avatar_url) {
          await attendanceService.deleteEmployeeAvatar();
          nextAvatarUrl = null;
        }

        saved = await attendanceService.updateOwnProfile({
          full_name: editName.trim(),
          role_title: editRole.trim() || 'Barista',
          phone: editPhone.trim(),
          avatar_url: nextAvatarUrl || null,
        });
        localStorage.removeItem(avatarKey);
      } else {
        const updatedProfile: EmployeeProfile = {
          ...currentEmployee,
          full_name: editName.trim(),
          role_title: editRole.trim() || 'Barista',
          phone: editPhone.trim(),
          avatar_url: editAvatarUrl || '',
          updated_at: new Date().toISOString(),
        };
        saved = await attendanceService.saveEmployee(updatedProfile);
        if (saved.avatar_url) {
          localStorage.setItem(avatarKey, saved.avatar_url);
        } else {
          localStorage.removeItem(avatarKey);
        }
      }

      const finalProfile: EmployeeProfile = {
        ...saved,
        avatar_url: saved.avatar_url ?? '',
      };

      setCurrentEmployee(finalProfile);
      saveActiveEmployeeCache(finalProfile);
      setAllEmployees((prev) => prev.map((e) => (e.id === finalProfile.id ? finalProfile : e)));
      setEditProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui dan disinkronkan!' });

      setTimeout(() => {
        setIsEditProfileModalOpen(false);
        setEditProfileMsg(null);
      }, 900);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setEditProfileMsg({ type: 'error', text: err?.message || 'Gagal menyimpan perubahan profil.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: LOADING STATE (MINIMALIST MODERN THEME)
  // --------------------------------------------------------------------------

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 text-[#09090B] select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-zinc-200 border-t-[#FF6600] rounded-full animate-spin" />
          <p className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-mono">
            Memuat Presensi Obat Haus...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: ONBOARDING SCREEN (COHESIVE WITH NEW MINIMALIST THEME)
  // --------------------------------------------------------------------------

  if (!hasSeenOnboarding && !currentEmployee) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] text-[#09090B] flex flex-col justify-between max-w-md mx-auto select-none relative overflow-hidden px-7 py-8 border-x border-zinc-100 font-sans shadow-2xl">
        {/* Top Header / Branding with asetlogo02.png */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-11 sm:h-12 flex items-center">
            <img
              src="/asetlogo02.png"
              alt="OBAT HAUS"
              className="h-full w-auto object-contain filter drop-shadow-xs"
            />
          </div>
          <span className="px-3.5 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[#FF6600] text-[11px] font-bold">
            Aplikasi Presensi
          </span>
        </div>

        {/* Center Hero Card Visual (Matching Dashboard Dark Card) */}
        <div className="my-auto py-4 space-y-6">
          {/* Sleek Obsidian Feature Card */}
          <div className="bg-[#09090B] rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden space-y-4">
            <svg
              className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <pattern id="onboardingGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#onboardingGrid)" />
            </svg>

            <div className="relative z-10 flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Presensi Mandiri Digital
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <div className="w-2.5 h-2.5 rounded-full bg-white ring-4 ring-white/20" />
                <span>Geofencing Radius GPS Otomatis</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-[#FF6600] fill-[#FF6600]" />
                <span>Validasi Unit Outlet &amp; Gudang</span>
              </div>
            </div>

            <div className="relative z-10 pt-2 flex items-center justify-between border-t border-zinc-800 text-[11px] text-zinc-400">
              <span>Sensor Biometrik 1-Tap</span>
              <span className="font-bold text-[#FF6600]">Aktif</span>
            </div>
          </div>

          {/* Big Bold Typography */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-[42px] font-black text-[#09090B] leading-[1.06] tracking-tight">
              Presensi<br />
              Karyawan<br />
              <span className="text-[#FF6600]">Obat Haus</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed pt-1">
              Sistem absensi mandiri karyawan Obat Haus dengan verifikasi lokasi GPS terintegrasi dan login instan sidik jari.
            </p>
          </div>
        </div>

        {/* Bottom CTA Action */}
        <div className="space-y-3 pt-4 pb-2">
          <button
            onClick={() => {
              setHasSeenOnboarding(true);
              localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
            }}
            className="w-full py-4 bg-[#FF6600] hover:bg-[#F25C00] active:scale-98 text-white text-base font-extrabold rounded-full shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Mulai Presensi Sekarang</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="text-center pt-1">
            <p className="text-[11px] text-zinc-400 font-normal">
              Dikembangkan Oleh{' '}
              <a
                href="https://labide.site/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-zinc-700 hover:text-zinc-950 no-underline transition-colors"
              >
                LABIDE
              </a>
              {' '}- Digital Creative Hub.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: LOGIN SCREEN (COHESIVE WITH NEW MINIMALIST THEME)
  // --------------------------------------------------------------------------

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] text-[#09090B] flex flex-col justify-between max-w-md mx-auto select-none relative overflow-hidden px-7 py-8 border-x border-zinc-100 font-sans shadow-2xl">
        {/* Top Header Row with Circular Back Button and asetlogo02.png */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setHasSeenOnboarding(false)}
            className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-zinc-800 transition cursor-pointer"
            title="Kembali ke Layar Pembuka"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="h-10 sm:h-11 flex items-center">
            <img
              src="/asetlogo02.png"
              alt="OBAT HAUS"
              className="h-full w-auto object-contain filter drop-shadow-xs"
            />
          </div>
        </div>

        {/* Middle Form Area */}
        <div className="my-auto py-4 space-y-5">
          {/* Big Bold Greeting Typography */}
          <div className="space-y-1.5">
            <h1 className="text-4xl sm:text-[42px] font-black text-[#09090B] leading-[1.06] tracking-tight">
              Selamat<br />
              datang,<br />
              Karyawan
            </h1>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed pt-1">
              Masukkan ID Karyawan dan PIN 4 digit untuk memulai sesi presensi Anda.
            </p>
          </div>

          {/* Alert Notifications */}
          {loginError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{loginError}</span>
            </div>
          )}

          {biometricSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sidik Jari Terverifikasi! Masuk...</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block pl-1">
                ID Karyawan
              </label>
              <input
                type="text"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                placeholder="Contoh: EMP-001"
                required
                className="w-full py-4 px-5 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border-2 border-zinc-200 focus:border-[#FF6600] rounded-[22px] text-center text-sm font-black text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block pl-1">
                PIN Absensi
              </label>
              <input
                type="password"
                maxLength={6}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                placeholder="••••"
                required
                className="w-full py-4 px-5 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border-2 border-zinc-200 focus:border-[#FF6600] rounded-[22px] text-center text-base font-black tracking-widest text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal focus:outline-none transition-all shadow-2xs font-mono"
              />
            </div>

            {/* Action Buttons: Big Orange Pill + Obsidian Biometric Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 py-4 bg-[#FF6600] hover:bg-[#F25C00] active:scale-98 text-white text-base font-extrabold rounded-full shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Masuk Akun</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBiometricLogin}
                title="Login Biometrik Sidik Jari 1-Tap"
                className="w-14 h-14 rounded-full bg-[#09090B] hover:bg-zinc-800 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-md shrink-0"
              >
                <FingerprintIcon className="w-7 h-7" color="#FFFFFF" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer Attribution Link */}
        <div className="text-center pt-2 pb-2">
          <p className="text-[11px] text-zinc-400 font-normal">
            Dikembangkan Oleh{' '}
            <a
              href="https://labide.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-zinc-700 hover:text-zinc-950 no-underline transition-colors"
            >
              LABIDE
            </a>
            {' '}- Digital Creative Hub.
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // DASHBOARD LAYOUT (EXACT REPLICA OF USER REFERENCE MOCKUP)
  // --------------------------------------------------------------------------

  const maxAllowedRadius = locationTarget?.radius_meters || 100;
  const isWithinGps = gpsDistance !== null ? gpsDistance <= maxAllowedRadius : false;
  const isAlreadyClockedIn = Boolean(todayLog && todayLog.clock_in && !todayLog.clock_out);
  const isAlreadyClockedOut = Boolean(todayLog && todayLog.clock_out);
  const isReportedAbsence = Boolean(todayLog && (todayLog.status === 'sick' || todayLog.status === 'leave'));

  // Filter shifts specifically matching employee's assigned location (Outlet vs Central Warehouse)
  const employeeLocationShifts = shifts.filter((s) => {
    if (!s.is_active) return false;
    const isWarehouseEmp = currentEmployee?.assigned_location_type === 'warehouse';
    const sName = (s.name || '').toLowerCase();

    // 1. Explicit location_id
    if ((s as any).location_id) {
      return (s as any).location_id === currentEmployee?.assigned_location_id;
    }

    // 2. Explicit location_type
    if ((s as any).location_type) {
      if ((s as any).location_type === 'warehouse') return isWarehouseEmp;
      if ((s as any).location_type === 'outlet') return !isWarehouseEmp;
      if ((s as any).location_type === 'all') return true;
    }

    // 3. Heuristic matching based on shift name
    const isShiftGudang =
      sName.includes('gudang') || sName.includes('warehouse') || sName.includes('logistik');
    const isShiftOutlet =
      sName.includes('outlet') ||
      sName.includes('barista') ||
      sName.includes('kasir') ||
      sName.includes('toko') ||
      sName.includes('cabang');

    if (isWarehouseEmp) {
      return isShiftGudang || !isShiftOutlet;
    } else {
      return !isShiftGudang;
    }
  });

  const displayShifts = employeeLocationShifts.length > 0 ? employeeLocationShifts : shifts;
  const activeShift = displayShifts.find((s) => s.is_active) || displayShifts[0];

  // Computed values for UI matching mockup
  const firstName = currentEmployee?.full_name?.split(' ')[0] || 'Karyawan';
  const employeeInitials = currentEmployee?.full_name
    ? currentEmployee.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'OH';

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 4 && hour < 11) return ['Selamat', 'pagi,'];
    if (hour >= 11 && hour < 15) return ['Selamat', 'siang,'];
    if (hour >= 15 && hour < 18) return ['Selamat', 'sore,'];
    return ['Selamat', 'malam,'];
  };
  const [greetLine1, greetLine2] = getGreeting();

  // Statistics calculation for dark cards and counters
  const currentMonthStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
  const logsThisMonth = employeeLogs.filter((l) => l.date && l.date.startsWith(currentMonthStr));
  const presentDaysCount = logsThisMonth.filter((l) => l.status === 'present' || l.status === 'late').length;
  const onTimeCount = logsThisMonth.filter((l) => l.status === 'present').length;
  const disciplineScore = presentDaysCount > 0 ? Math.round((onTimeCount / presentDaysCount) * 100) : 100;

  let totalWorkedMinutes = 0;
  logsThisMonth.forEach((l) => {
    if (l.clock_in && l.clock_out) {
      try {
        const inD = new Date(l.clock_in);
        const outD = new Date(l.clock_out);
        const diff = Math.max(0, Math.round((outD.getTime() - inD.getTime()) / 60000));
        totalWorkedMinutes += diff;
      } catch {
        totalWorkedMinutes += 8 * 60;
      }
    } else if (l.clock_in) {
      totalWorkedMinutes += 8 * 60;
    }
  });
  const totalWorkedHours =
    totalWorkedMinutes > 0
      ? (totalWorkedMinutes / 60).toFixed(0)
      : (presentDaysCount > 0 ? presentDaysCount * 8 : 48).toString();

  // Filtered history list
  const filteredHistoryLogs = employeeLogs.filter((log) => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'month') {
      return log.date && log.date.startsWith(currentMonthStr);
    }
    if (historyFilter === 'on_time') {
      return log.status === 'present';
    }
    if (historyFilter === 'late') {
      return log.status === 'late';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#09090B] flex flex-col justify-between max-w-md mx-auto shadow-2xl relative select-none border-x border-zinc-100 font-sans">
      {/* SCROLLABLE MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto pb-28 pt-2">
        {/* Action Alerts (Fixed at top) */}
        {actionSuccessMsg && (
          <div className="mx-5 mb-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
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
          <div className="mx-5 mb-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
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
        {/* TAB 1: ABSEN (HOME) — EXACT REPLICA OF MIDDLE SCREEN IN MOCKUP   */}
        {/* ================================================================ */}
        {activeTab === 'home' && (
          <div className="space-y-4 px-5 pt-3 pb-6">
            {/* 1. TOP HEADER: BIG BOLD MULTI-LINE GREETING & ORANGE-BORDER AVATAR */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl sm:text-[42px] font-black text-[#09090B] leading-[1.06] tracking-tight">
                  {greetLine1}<br />
                  {greetLine2}<br />
                  {firstName}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('account')}
                title="Buka Profil & Pengaturan"
                className="w-12 h-12 rounded-full aspect-square border-2 border-[#FF6600] p-0.5 overflow-hidden shadow-sm shrink-0 cursor-pointer active:scale-95 transition-transform flex items-center justify-center bg-white"
              >
                <div className="w-full h-full rounded-full aspect-square overflow-hidden bg-[#18181B] text-white flex items-center justify-center font-black text-sm">
                  {currentEmployee.avatar_url ? (
                    <img
                      src={currentEmployee.avatar_url}
                      alt={currentEmployee.full_name}
                      className="w-full h-full object-cover rounded-full aspect-square"
                    />
                  ) : (
                    <span>{employeeInitials}</span>
                  )}
                </div>
              </button>
            </div>

            {/* 2. SECTION SUBTITLE */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs font-semibold text-zinc-500">
                Today&apos;s suggestion
              </p>
              <button
                onClick={() => refreshGps()}
                className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-700 cursor-pointer"
                title="Segarkan Koordinat GPS"
              >
                <div className={`w-2 h-2 rounded-full ${isWithinGps ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span>{isGettingGps ? 'GPS...' : `${gpsDistance !== null ? `${gpsDistance}m` : 'Cek GPS'}`}</span>
                <RefreshCw className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 3. SLEEK DARK MAP CARD */}
            <div className="bg-[#09090B] rounded-[28px] p-5 text-white relative overflow-hidden h-[215px] flex flex-col justify-between shadow-xl">
              {/* Subtle Map Grid/Street Vector Lines */}
              <svg
                className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#mapGrid)" />
                {/* Diagonal roads */}
                <path d="M-20 60 L180 10 L380 90" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
                <path d="M40 180 L220 100 L400 160" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
              </svg>

              {/* Map Route / Waypoints Overlay */}
              <div className="relative z-10 flex items-start justify-between w-full pt-1">
                {/* Left: Origin (Lokasi Anda) */}
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    Your location
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-white ring-4 ring-white/20 shrink-0" />
                    <span className="text-xs font-bold text-white truncate max-w-[110px]">
                      {isWithinGps ? 'Dalam Area' : 'GPS Aktif'}
                    </span>
                  </div>
                </div>

                {/* Curved Dotted Connecting Path */}
                <div className="flex-1 px-3 pt-4">
                  <svg className="w-full h-8" viewBox="0 0 100 24" fill="none">
                    <path
                      d="M 5 18 Q 50 2 95 10"
                      stroke="#71717A"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      fill="none"
                    />
                  </svg>
                </div>

                {/* Right: Destination (Workplace) */}
                <div className="space-y-1 text-right">
                  <span className="text-[10px] text-zinc-400 font-medium block">
                    Workplace
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[110px]">
                      {locationTarget?.name || 'Obat Haus'}
                    </span>
                    <MapPin className="w-5 h-5 text-[#FF6600] fill-[#FF6600] shrink-0 drop-shadow" />
                  </div>
                </div>
              </div>

              {/* Centered Floating White Pill Button */}
              <div className="relative z-10 flex justify-center pb-1">
                {isReportedAbsence ? (
                  <div className="bg-white/95 text-blue-900 font-bold text-xs px-6 py-2.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
                    <span>Laporan Izin / Sakit Tercatat</span>
                  </div>
                ) : isAlreadyClockedOut ? (
                  <div className="bg-white/95 text-emerald-900 font-bold text-xs px-6 py-2.5 rounded-full shadow-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Presensi Hari Ini Selesai</span>
                  </div>
                ) : isAlreadyClockedIn ? (
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={isSubmittingAction}
                    className="bg-white hover:bg-zinc-100 active:scale-95 text-[#09090B] font-extrabold text-xs px-7 py-2.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingAction ? (
                      <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Konfirmasi Pulang</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={isSubmittingAction}
                    className="bg-white hover:bg-zinc-100 active:scale-95 text-[#09090B] font-extrabold text-xs px-7 py-2.5 rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingAction ? (
                      <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Absen Masuk Sekarang</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 4. BIG VIBRANT ORANGE CTA CARD */}
            <div
              onClick={
                isReportedAbsence || isAlreadyClockedOut
                  ? undefined
                  : isAlreadyClockedIn
                  ? handleClockOut
                  : handleClockIn
              }
              className={`rounded-[24px] p-4 text-white flex items-center justify-between shadow-lg shadow-orange-500/25 transition-all cursor-pointer ${
                isAlreadyClockedOut
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-emerald-500/20'
                  : 'bg-[#FF6600] hover:bg-[#F25C00] active:scale-[0.99]'
              }`}
            >
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {isReportedAbsence
                    ? 'Izin / Sakit Tercatat'
                    : isAlreadyClockedOut
                    ? 'Presensi Selesai'
                    : isAlreadyClockedIn
                    ? 'Absen Pulang (Clock Out)'
                    : 'Absen Masuk (Clock In)'}
                </h3>
                <p className="text-xs text-orange-100 font-medium mt-0.5">
                  {isReportedAbsence
                    ? 'Keterangan izin/sakit tersimpan di database'
                    : isAlreadyClockedOut
                    ? `Masuk: ${formatTimeDisplay(todayLog?.clock_in)} • Pulang: ${formatTimeDisplay(todayLog?.clock_out)} WITA`
                    : isAlreadyClockedIn
                    ? `Shift Aktif • Masuk: ${formatTimeDisplay(todayLog?.clock_in)} WITA`
                    : isWithinGps
                    ? `Dalam radius jangkauan (${gpsDistance !== null ? `${gpsDistance}m` : '0m'})`
                    : `Jarak: ${gpsDistance !== null ? `${gpsDistance}m` : 'Mendeteksi...'} (Radius maks ${maxAllowedRadius}m)`}
                </p>
              </div>

              <div className="w-11 h-11 rounded-full bg-[#09090B] text-white flex items-center justify-center font-bold shadow-md shrink-0 ml-3 hover:scale-105 active:scale-95 transition-transform">
                {isSubmittingAction ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
            </div>

            {/* 5. DUAL STATS CARDS ROW (WHITE CARD + OBSIDIAN BLACK CARD) */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              {/* Left Card: Pure White with subtle border */}
              <div className="bg-white rounded-[22px] p-4 border border-zinc-100 shadow-sm flex flex-col justify-between h-[96px]">
                <span className="text-2xl font-black text-[#09090B] font-mono leading-none">
                  {presentDaysCount > 0 ? presentDaysCount : 12}
                </span>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 block leading-tight">
                    Hari Hadir
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium leading-tight">
                    Bulan Ini
                  </span>
                </div>
              </div>

              {/* Right Card: Obsidian Black with Orange Star & Rewards */}
              <div className="bg-[#09090B] rounded-[22px] p-4 text-white shadow-sm flex flex-col justify-between h-[96px]">
                <div className="flex items-center gap-1.5 text-base font-black text-[#FF6600] leading-none">
                  <Star className="w-4 h-4 fill-[#FF6600] text-[#FF6600]" />
                  <span>{disciplineScore * 3 > 0 ? `${disciplineScore * 3} pts` : '320 pts'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-zinc-400 block leading-tight">
                    Skor Disiplin
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium leading-tight">
                    Tepat Waktu
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Action: Ajukan Izin / Sakit */}
            {!isAlreadyClockedOut && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(true)}
                  className="w-full py-3 px-4 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-2xl text-xs font-bold text-zinc-700 flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <HeartPulse className="w-4 h-4 text-[#FF6600]" />
                  <span>Ajukan Izin / Sakit Hari Ini</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: JADWAL SHIFT KERJA                                       */}
        {/* ================================================================ */}
        {activeTab === 'schedule' && (
          <div className="space-y-4 px-5 pt-3 pb-6">
            <div>
              <h2 className="text-3xl font-black text-[#09090B] tracking-tight">
                Jadwal Shift
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Unit: {locationTarget?.name || (currentEmployee?.assigned_location_type === 'warehouse' ? 'Gudang Logistik' : 'Outlet Obat Haus')}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {displayShifts.length === 0 ? (
                <div className="bg-white p-8 rounded-[24px] border border-zinc-100 text-center text-zinc-400 text-xs shadow-2xs">
                  Belum ada jadwal shift khusus yang diatur untuk unit ini.
                </div>
              ) : (
                displayShifts.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-[#F9FAFB] rounded-[22px] p-4 border shadow-2xs space-y-2 transition-all ${
                      s.id === activeShift?.id
                        ? 'border-orange-300 ring-2 ring-orange-100/50 bg-white'
                        : 'border-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#FF6600] tracking-wide block">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {s.id === activeShift?.id && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                            Aktif
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#FF6600] text-[10px] font-bold">
                          Toleransi: {s.late_tolerance_minutes}m
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-[#09090B]">
                        {s.start_time} → {s.end_time} WITA
                      </span>
                      <span className="text-xs font-black text-[#09090B] font-mono">
                        8 Jam
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: RIWAYAT PRESENSI — EXACT REPLICA OF RIGHT SCREEN          */}
        {/* ================================================================ */}
        {activeTab === 'history' && (
          <div className="space-y-4 px-5 pt-3 pb-6">
            {/* Big Bold Header */}
            <div>
              <h2 className="text-3xl font-black text-[#09090B] tracking-tight">
                Riwayat Presensi
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                {filteredHistoryLogs.length} kehadiran tercatat
              </p>
            </div>

            {/* Horizontal Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'on_time', label: 'Tepat Waktu' },
                { id: 'late', label: 'Terlambat' },
              ].map((f) => {
                const isActive = historyFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setHistoryFilter(f.id as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#09090B] text-white shadow-sm'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* History Cards List */}
            <div className="space-y-3 pt-1">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Memuat riwayat kehadiran...
                </div>
              ) : filteredHistoryLogs.length === 0 ? (
                <div className="bg-white p-8 rounded-[24px] border border-zinc-100 text-center text-zinc-400 text-xs shadow-2xs">
                  Belum ada riwayat presensi yang sesuai filter.
                </div>
              ) : (
                filteredHistoryLogs.map((log) => {
                  const statusTag =
                    log.status === 'present'
                      ? 'Tepat Waktu'
                      : log.status === 'late'
                      ? 'Terlambat'
                      : log.status === 'sick'
                      ? 'Sakit'
                      : 'Izin';

                  let durationText = '8.0 Jam';
                  if (log.clock_in && log.clock_out) {
                    try {
                      const inT = new Date(log.clock_in);
                      const outT = new Date(log.clock_out);
                      const diffH = (outT.getTime() - inT.getTime()) / (1000 * 60 * 60);
                      durationText = `${diffH.toFixed(1)} Jam`;
                    } catch {
                      durationText = '8.0 Jam';
                    }
                  } else if (log.clock_in) {
                    durationText = 'Sedang Kerja';
                  }

                  return (
                    <div
                      key={log.id}
                      className="bg-[#F9FAFB] rounded-[22px] p-4 border border-zinc-100/90 shadow-2xs space-y-1 hover:border-zinc-200 transition-colors"
                    >
                      {/* Orange Category Tag */}
                      <span className="text-[11px] font-bold text-[#FF6600] tracking-wide block">
                        {statusTag}
                      </span>

                      {/* Main Row: Location Path & Amount */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-black text-[#09090B]">
                          {log.clock_in ? formatTimeDisplay(log.clock_in) : '--:--'}
                          {' → '}
                          {log.clock_out ? formatTimeDisplay(log.clock_out) : 'Aktif'}
                        </span>
                        <span className="text-xs font-black text-[#09090B] font-mono">
                          {durationText}
                        </span>
                      </div>

                      {/* Subtitle: Date & Timestamp */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium pt-0.5">
                        <span>{log.date} • WITA</span>
                        {log.notes && (
                          <span className="italic text-zinc-500 truncate max-w-[150px]">
                            &ldquo;{log.notes}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View All History Button */}
            <div className="pt-2 text-center">
              <button
                onClick={loadHistory}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-800 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>Segarkan Riwayat</span>
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 4: AKUN KARYAWAN — EXACT REPLICA OF LEFT SCREEN IN MOCKUP     */}
        {/* ================================================================ */}
        {activeTab === 'account' && (
          <div className="space-y-4 px-5 pt-3 pb-6">
            {/* 1. TOP AVATAR WITH ORANGE RING & NOTIFICATION BELL */}
            <div className="flex items-center justify-between">
              <div className="relative">
                <div className="w-16 h-16 rounded-full aspect-square border-2 border-[#FF6600] p-0.5 overflow-hidden shadow-sm shrink-0 flex items-center justify-center bg-white">
                  <div className="w-full h-full rounded-full aspect-square overflow-hidden bg-[#18181B] text-white flex items-center justify-center font-black text-xl">
                    {currentEmployee.avatar_url ? (
                      <img
                        src={currentEmployee.avatar_url}
                        alt={currentEmployee.full_name}
                        className="w-full h-full object-cover rounded-full aspect-square"
                      />
                    ) : (
                      <span>{employeeInitials}</span>
                    )}
                  </div>
                </div>
                {/* Camera upload trigger badge */}
                <button
                  type="button"
                  onClick={openEditProfileModal}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FF6600] text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title="Upload / Ubah Foto Profil"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              <button
                onClick={() => setActiveTab('history')}
                className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-800 relative transition cursor-pointer"
                title="Notifikasi & Riwayat"
              >
                <Bell className="w-5 h-5 text-zinc-700" />
                <span className="w-2 h-2 rounded-full bg-[#FF6600] absolute top-2.5 right-2.5 ring-2 ring-white" />
              </button>
            </div>

            {/* 2. NAME & PHONE */}
            <div>
              <h2 className="text-2xl font-black text-[#09090B] tracking-tight leading-tight">
                {currentEmployee.full_name}
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 font-mono">
                {currentEmployee.phone || '+62 812-xxxx-xxxx'}
              </p>
            </div>

            {/* 3. DUAL BADGES (ORANGE PILL + BLACK PILL) */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              {/* Left: Solid Orange Badge Pill */}
              <div className="bg-[#FF6600] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-orange-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span className="truncate max-w-[170px]">
                  {currentEmployee.role_title} • {locationTarget?.name || 'Obat Haus'}
                </span>
              </div>

              {/* Edit Profil Pill Button */}
              <button
                type="button"
                onClick={openEditProfileModal}
                className="bg-[#09090B] text-white hover:bg-zinc-800 active:scale-95 px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3 h-3 text-zinc-300" />
                <span>Edit Profil</span>
              </button>

              {/* Ubah PIN Pill Button */}
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:scale-95 px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Key className="w-3 h-3 text-zinc-600" />
                <span>PIN</span>
              </button>
            </div>

            {/* 4. BLACK DARK SUMMARY CARD (3 COLS + PROGRESS BAR + LIMIT) */}
            <div className="bg-[#09090B] rounded-[28px] p-5 text-white shadow-xl space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-2xl font-black text-white font-mono block leading-none">
                    {presentDaysCount > 0 ? presentDaysCount : 12}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-1.5">
                    Hadir
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-black text-white font-mono block leading-none">
                    {totalWorkedHours} jam
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-1.5">
                    Jam Kerja
                  </span>
                </div>
                <div>
                  <span className="text-2xl font-black text-[#FF6600] font-mono block leading-none">
                    {disciplineScore}%
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium block mt-1.5">
                    Disiplin
                  </span>
                </div>
              </div>

              {/* Progress Bar & Monthly Limit */}
              <div className="pt-1">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF6600] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, disciplineScore))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium pt-2">
                  <span>Target bulanan: 85%</span>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </div>

            {/* 5. SETTINGS SECTION */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-zinc-900 mb-3">Settings</h3>

              <div className="space-y-2">
                {/* Row 0: Edit Profil Karyawan (Foto, Nama, Posisi, No WA) */}
                <button
                  type="button"
                  onClick={openEditProfileModal}
                  className="w-full bg-white hover:bg-zinc-50 border border-zinc-100 rounded-[20px] p-3.5 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 group-hover:bg-orange-50 border border-zinc-100 flex items-center justify-center text-zinc-700 group-hover:text-[#FF6600] transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-900 group-hover:text-[#FF6600] transition-colors">
                        Edit Profil Karyawan
                      </span>
                      <span className="block text-[11px] text-zinc-400 font-medium">
                        Foto, Nama, Jabatan/Posisi &amp; No. WhatsApp
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Row 1: Rekam Sidik Jari */}
                <button
                  type="button"
                  onClick={() => {
                    setBiometricEnrollMsg(null);
                    setIsBiometricEnrollModalOpen(true);
                  }}
                  className="w-full bg-white hover:bg-zinc-50 border border-zinc-100 rounded-[20px] p-3.5 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 group-hover:bg-orange-50 border border-zinc-100 flex items-center justify-center text-zinc-700 group-hover:text-[#FF6600] transition-colors">
                      <FingerprintIcon className="w-5 h-5" color="currentColor" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-900">
                        Rekam Sidik Jari Biometrik
                      </span>
                      <span className="block text-[11px] text-zinc-400 font-medium">
                        {isBiometricEnrolled ? '✓ Aktif (Login 1-Tap)' : 'Masuk tanpa ketik ID & PIN'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Row 2: Ubah PIN */}
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="w-full bg-white hover:bg-zinc-50 border border-zinc-100 rounded-[20px] p-3.5 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700">
                      <Key className="w-4 h-4 text-zinc-700" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-900">
                        Ubah PIN Absensi
                      </span>
                      <span className="block text-[11px] text-zinc-400 font-medium">
                        4 digit angka keamanan karyawan
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Row 3: Install App PWA */}
                <button
                  type="button"
                  onClick={handleInstallAbsenApp}
                  className="w-full bg-white hover:bg-zinc-50 border border-zinc-100 rounded-[20px] p-3.5 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700">
                      <Smartphone className="w-4 h-4 text-zinc-700" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-900">
                        Install Aplikasi di Layar HP
                      </span>
                      <span className="block text-[11px] text-zinc-400 font-medium">
                        {isStandaloneApp ? '✓ Sudah terpasang di HP' : 'Buka instan seperti aplikasi asli'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Row 4: Keluar Akun */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full bg-white hover:bg-red-50/50 border border-zinc-100 rounded-[20px] p-3.5 flex items-center justify-between transition cursor-pointer shadow-2xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-50 group-hover:bg-red-50 border border-zinc-100 flex items-center justify-center text-zinc-700 group-hover:text-red-600 transition-colors">
                      <LogOut className="w-4 h-4 text-zinc-700 group-hover:text-red-600" />
                    </div>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-900 group-hover:text-red-600 transition-colors">
                        Keluar dari Akun
                      </span>
                      <span className="block text-[11px] text-zinc-400 font-medium">
                        Ganti karyawan atau akhiri sesi kerja
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. FLOATING BOTTOM DOCK NAVIGATION BAR (4 FUNCTIONAL TABS MATCHING MOCKUP DOCK) */}
      <nav className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto bg-white/95 backdrop-blur-md border border-zinc-100/90 rounded-full px-3 py-1.5 flex items-center justify-around z-30 shadow-2xl">
        {[
          { id: 'home', label: 'Absen', icon: Home },
          { id: 'schedule', label: 'Jadwal', icon: CalendarDays },
          { id: 'history', label: 'Riwayat', icon: Clock },
          { id: 'account', label: 'Profil', icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return isActive ? (
            <div
              key={tab.id}
              className="bg-[#FF6600] text-white px-4 py-2 rounded-full flex items-center gap-1.5 font-bold text-xs shadow-md shadow-orange-500/25 active:scale-95 transition-all"
            >
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{tab.label}</span>
            </div>
          ) : (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className="flex flex-col items-center justify-center py-1 px-2.5 text-zinc-400 hover:text-zinc-700 active:scale-95 transition-all cursor-pointer"
              title={tab.label}
            >
              <Icon className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] font-semibold leading-tight mt-0.5">
                {tab.label}
              </span>
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

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: REKAM SIDIK JARI (BIOMETRIK ENROLLMENT)                        */}
      {/* -------------------------------------------------------------------- */}
      {isBiometricEnrollModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6600] flex items-center justify-center">
                  <FingerprintIcon className="w-5 h-5" color="#FF6600" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Rekam Sidik Jari</h3>
                  <p className="text-[10px] text-slate-400">Verifikasi biometrik perangkat</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBiometricEnrollModalOpen(false);
                  setBiometricEnrollMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Alert Notification */}
            {biometricEnrollMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  biometricEnrollMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {biometricEnrollMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{biometricEnrollMsg.text}</span>
              </div>
            )}

            {/* Interactive Scanner Graphic */}
            <div className="flex flex-col items-center justify-center py-5 bg-gradient-to-b from-orange-50/60 to-orange-50/20 rounded-2xl border border-orange-100 space-y-3">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isScanningBiometric
                      ? 'bg-orange-100 ring-4 ring-[#FF6600] scale-105 shadow-lg'
                      : isBiometricEnrolled
                      ? 'bg-emerald-50 ring-4 ring-emerald-400'
                      : 'bg-white shadow-md'
                  }`}
                >
                  <FingerprintIcon
                    className={`w-11 h-11 transition-all ${isScanningBiometric ? 'scale-110' : ''}`}
                    color={isBiometricEnrolled ? '#059669' : '#FF6600'}
                  />
                </div>
                {isScanningBiometric && (
                  <div className="absolute inset-0 rounded-full border-2 border-[#FF6600] animate-ping opacity-60" />
                )}
              </div>

              <div className="text-center px-4">
                <p className="text-xs font-black text-slate-800">
                  {isScanningBiometric
                    ? 'Menghubungkan Sensor Sidik Jari...'
                    : isBiometricEnrolled
                    ? 'Sidik Jari Aktif di HP Ini'
                    : 'Siap Merekam Sidik Jari'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isBiometricEnrolled
                    ? `Terhubung untuk: ${currentEmployee?.full_name}`
                    : 'Klik tombol di bawah untuk mengaktifkan login cepat'}
                </p>
              </div>
            </div>

            {/* Benefits Info Box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
              <p className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF6600]" />
                Keuntungan Login Sidik Jari:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[10px]">
                <li>Masuk instan 1-tap tanpa harus mengetik ID dan PIN lagi.</li>
                <li>Hanya berlaku di perangkat HP ini untuk keamanan ganda.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleEnrollBiometric}
                disabled={isScanningBiometric}
                className="w-full py-3.5 bg-[#FF6600] hover:bg-[#EA580C] active:scale-98 text-white rounded-2xl text-xs font-black shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isScanningBiometric ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Merekam Biometrik...</span>
                  </>
                ) : (
                  <>
                    <FingerprintIcon className="w-4 h-4" color="#FFFFFF" />
                    <span>{isBiometricEnrolled ? 'Rekam Ulang Sidik Jari' : 'Mulai Rekam Sidik Jari'}</span>
                  </>
                )}
              </button>

              {isBiometricEnrolled && (
                <button
                  type="button"
                  onClick={handleRemoveBiometric}
                  disabled={isScanningBiometric}
                  className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  Hapus Sambungan Sidik Jari dari HP Ini
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsBiometricEnrollModalOpen(false);
                  setBiometricEnrollMsg(null);
                }}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: PANDUAN INSTALL APP ABSENSI (PWA KHUSUS /absen)               */}
      {/* -------------------------------------------------------------------- */}
      {isInstallGuideModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/iconappabsen.png"
                  alt="App Icon"
                  className="w-8 h-8 rounded-xl object-cover shadow-xs border border-orange-200"
                />
                <div>
                  <h3 className="font-black text-sm text-slate-900">Install App Absensi</h3>
                  <p className="text-[10px] text-slate-400">obathaus.vercel.app/absen</p>
                </div>
              </div>
              <button
                onClick={() => setIsInstallGuideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Operating System Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setInstallGuideTab('android')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  installGuideTab === 'android'
                    ? 'bg-white text-[#FF6600] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setInstallGuideTab('ios')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  installGuideTab === 'ios'
                    ? 'bg-white text-[#FF6600] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                iPhone / iPad (Safari)
              </button>
            </div>

            {/* Android Instructions */}
            {installGuideTab === 'android' ? (
              <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100 space-y-3">
                <p className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#FF6600]" />
                  Cara Pasang di HP Android:
                </p>
                <ol className="text-[11px] text-slate-700 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Buka browser <strong>Google Chrome</strong> di HP Anda.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Ketuk tombol menu <strong>titik tiga (⋮)</strong> di sudut kanan atas layar Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Pilih menu <strong>&quot;Install Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      Selesai! Ikon <strong>Absen Haus</strong> dengan logo oranye akan langsung tersedia di beranda HP Anda.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              /* iOS Safari Instructions */
              <div className="bg-orange-50/60 rounded-2xl p-4 border border-orange-100 space-y-3">
                <p className="text-xs font-extrabold text-orange-950 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#FF6600]" />
                  Cara Pasang di iPhone / iPad:
                </p>
                <ol className="text-[11px] text-slate-700 space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Pastikan tautan ini dibuka menggunakan browser <strong>Safari</strong> bawaan Apple.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah atas <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />) di bilah bawah Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF6600] text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Gulir ke bawah dan pilih <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" /> <strong>Tambah ke Layar Utama</strong> (*Add to Home Screen*).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      Ketuk <strong>Tambah</strong> di pojok kanan atas. Aplikasi akan terpasang di Homescreen!
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Direct Copy Link Tool */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Tautan Khusus Aplikasi Absensi:
              </span>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-mono font-bold text-slate-800 truncate flex-1">
                  https://obathaus.vercel.app/absen
                </span>
                <button
                  type="button"
                  onClick={handleCopyAbsenLink}
                  className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-[#FF6600] rounded-lg text-xs font-black transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Close Button */}
            <button
              type="button"
              onClick={() => setIsInstallGuideModalOpen(false)}
              className="w-full py-3 bg-[#FF6600] hover:bg-[#EA580C] text-white rounded-2xl text-xs font-black shadow-md shadow-orange-500/25 transition-all cursor-pointer"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: EDIT PROFIL KARYAWAN (FOTO, NAMA, JABATAN, NO. WA)            */}
      {/* -------------------------------------------------------------------- */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6600] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-900">Edit Profil Karyawan</h3>
                  <p className="text-[10px] text-zinc-400">Foto, Nama, Jabatan, dan No. WA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert Notification */}
            {editProfileMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  editProfileMsg.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                {editProfileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{editProfileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full aspect-square border-2 border-[#FF6600] p-0.5 overflow-hidden shadow-sm flex items-center justify-center bg-zinc-100">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Preview Foto"
                        className="w-full h-full object-cover rounded-full aspect-square"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#18181B] text-white flex items-center justify-center font-black text-2xl">
                        {employeeInitials}
                      </div>
                    )}
                  </div>

                  <label
                    htmlFor="avatar-file-upload"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF6600] hover:bg-[#EA580C] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer active:scale-95 transition-transform"
                    title="Pilih Foto Profil"
                  >
                    <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                  </label>
                  <input
                    id="avatar-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label
                    htmlFor="avatar-file-upload"
                    className="text-[11px] font-bold text-[#FF6600] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Foto Baru</span>
                  </label>
                  {editAvatarUrl && (
                    <>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl(null)}
                        className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Rafka Marwan"
                  required
                  className="w-full py-2.5 px-3.5 bg-zinc-50 border border-zinc-200 focus:border-[#FF6600] rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20"
                />
              </div>

              {/* Jabatan / Posisi */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Contoh: Barista, Kasir, Kepala Toko"
                  required
                  className="w-full py-2.5 px-3.5 bg-zinc-50 border border-zinc-200 focus:border-[#FF6600] rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20"
                />
              </div>

              {/* No. WhatsApp / Telepon */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  No. WhatsApp / Telepon
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full py-2.5 px-3.5 bg-zinc-50 border border-zinc-200 focus:border-[#FF6600] rounded-xl text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-3 bg-[#FF6600] hover:bg-[#EA580C] text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
