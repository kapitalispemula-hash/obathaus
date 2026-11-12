'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, UserRole } from '@/types/database';
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
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
        const profiles = await dbService.getProfiles();

        if (storedUserId) {
          const found = profiles.find((p) => p.id === storedUserId && p.is_active);
          if (found) {
            setUser(found);
            setIsLoading(false);
            syncAllPending();
            return;
          }
        }

        // Production Security: Require explicit login if no valid session stored
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
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
      const profiles = await dbService.getProfiles();
      const cleanInput = identifier.trim().toLowerCase();

      // Find user matching username, email, email prefix, or full name
      const found = profiles.find((p) => {
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

      // Password verification:
      // If profile has a configured password and input password is provided, verify match
      if (found.password && password && found.password !== password.trim()) {
        setIsLoading(false);
        return { success: false, error: 'Kata sandi tidak sesuai. Silakan coba lagi.' };
      }

      setUser(found);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, found.id);
        if (navigator.onLine) {
          void syncOfflineQueue();
          void attendanceService.syncPendingAttendance();
        }
      }

      setIsLoading(false);
      return { success: true, role: found.role };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Terjadi kesalahan saat masuk.' };
    }
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    router.push('/login');
  };

  const switchUser = async (targetRole: UserRole) => {
    const profiles = await dbService.getProfiles();
    const target = profiles.find((p) => p.role === targetRole && p.is_active);
    if (target) {
      setUser(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, target.id);
      }
      if (target.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (target.role === 'warehouse_operator') {
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
