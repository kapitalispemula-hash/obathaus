'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, UserRole } from '@/types/database';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { dbService } from '@/lib/services/database';
import { syncOfflineQueue } from '@/lib/services/offline-sync';
import { attendanceService } from '@/lib/services/attendance';
import { INITIAL_PROFILES } from '@/lib/mock-data';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  switchUser: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  switchUser: async () => {},
});

const AUTH_STORAGE_KEY = 'cafepos_current_user_id';
const AUTH_USER_CACHE_KEY = 'obathaus_auth_user_safe_cache';

function sanitizeClientProfile(p: Profile): Profile {
  const { password: _omitted, ...safe } = p;
  return safe as Profile;
}

function saveSafeUserCache(user: Profile | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_CACHE_KEY);
    return;
  }
  const safe = sanitizeClientProfile(user);
  window.localStorage.setItem(AUTH_STORAGE_KEY, safe.id);
  window.localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(safe));
}

function readSafeUserCache(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed && parsed.id && parsed.role ? sanitizeClientProfile(parsed) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const syncAllPending = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        void syncOfflineQueue();
        void attendanceService.syncPendingAttendance();
      }
    };

    async function loadUser() {
      try {
        if (isSupabaseConfigured()) {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const cached = readSafeUserCache();
            if (cached && cached.is_active) {
              setUser(cached);
              return;
            }
          }

          try {
            const res = await fetch('/api/auth/me', { cache: 'no-store' });
            if (res.ok) {
              const data = await res.json();
              if (data?.user && data.user.is_active) {
                const safeUser = sanitizeClientProfile(data.user);
                setUser(safeUser);
                saveSafeUserCache(safeUser);
                syncAllPending();
                return;
              }
            }
            if (res.status === 401) {
              setUser(null);
              saveSafeUserCache(null);
              return;
            }
          } catch (netErr) {
            console.warn('Auth /api/auth/me network fallback:', netErr);
            const cached = readSafeUserCache();
            if (cached && cached.is_active) {
              setUser(cached);
              return;
            }
          }

          setUser(null);
          return;
        }

        // Demo-only offline fallback when Supabase env is not configured
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
        const profiles = await dbService.getProfiles();
        if (storedUserId) {
          const found = profiles.find((p) => p.id === storedUserId && p.is_active);
          if (found) {
            setUser(sanitizeClientProfile(found));
            syncAllPending();
            return;
          }
        }
        setUser(null);
        saveSafeUserCache(null);
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncAllPending);
      return () => {
        window.removeEventListener('online', syncAllPending);
      };
    }
  }, []);

  const login = async (identifier: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        if (!password || !password.trim()) {
          setIsLoading(false);
          return { success: false, error: 'Kata sandi wajib diisi.' };
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success || !data?.user) {
          setIsLoading(false);
          return { success: false, error: data?.error || 'Username atau kata sandi tidak sesuai.' };
        }

        const safeUser = sanitizeClientProfile(data.user);
        setUser(safeUser);
        saveSafeUserCache(safeUser);

        if (typeof window !== 'undefined' && navigator.onLine) {
          void syncOfflineQueue();
          void attendanceService.syncPendingAttendance();
        }

        setIsLoading(false);
        return { success: true, role: safeUser.role };
      }

      // Demo-only offline fallback when Supabase is not configured
      const cleanInput = identifier.trim().toLowerCase();
      const found = INITIAL_PROFILES.find((p) => {
        const u = (p.username || '').toLowerCase();
        const e = (p.email || '').toLowerCase();
        const emailPrefix = e.split('@')[0];
        const firstName = (p.full_name || '').split(' ')[0].toLowerCase();
        const fullName = (p.full_name || '').toLowerCase();
        return (
          u === cleanInput ||
          e === cleanInput ||
          emailPrefix === cleanInput ||
          firstName === cleanInput ||
          fullName === cleanInput
        );
      });

      if (!found) {
        setIsLoading(false);
        return { success: false, error: 'Username atau kata sandi tidak ditemukan.' };
      }
      if (!found.is_active) {
        setIsLoading(false);
        return { success: false, error: 'Akun Anda sedang dinonaktifkan oleh Administrator.' };
      }
      if (!password || found.password !== password.trim()) {
        setIsLoading(false);
        return { success: false, error: 'Kata sandi tidak sesuai. Silakan coba lagi.' };
      }

      const safeUser = sanitizeClientProfile(found);
      setUser(safeUser);
      saveSafeUserCache(safeUser);
      setIsLoading(false);
      return { success: true, role: safeUser.role };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Terjadi kesalahan saat masuk.' };
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
    } finally {
      setUser(null);
      saveSafeUserCache(null);
      router.push('/login');
    }
  };

  const switchUser = async (targetRole: UserRole) => {
    // Strictly blocked in Supabase production unless demo tools explicitly enabled
    if (isSupabaseConfigured() && process.env.NEXT_PUBLIC_ENABLE_DEMO_TOOLS !== 'true') {
      console.warn('switchUser is disabled in production security mode.');
      return;
    }

    const profiles = await dbService.getProfiles();
    const target = profiles.find((p) => p.role === targetRole && p.is_active);
    if (target) {
      const safe = sanitizeClientProfile(target);
      setUser(safe);
      saveSafeUserCache(safe);
      if (safe.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (safe.role === 'warehouse_operator') {
        router.push('/warehouse/dashboard');
      } else {
        router.push('/pos');
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isLoading,
        login,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
