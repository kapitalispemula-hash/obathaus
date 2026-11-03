'use client';

import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import {
  AttendanceShift,
  EmployeeProfile,
  AttendanceLog,
  AttendanceStatus,
  LocationType,
  Outlet,
  Warehouse,
} from '@/types/database';
import {
  INITIAL_ATTENDANCE_SHIFTS,
  INITIAL_EMPLOYEE_PROFILES,
  INITIAL_ATTENDANCE_LOGS,
  INITIAL_OUTLETS,
  INITIAL_WAREHOUSES,
} from '@/lib/mock-data';

// ============================================================================
// GEOLOCATION UTILITIES
// ============================================================================

/**
 * Calculates the great-circle distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters (integer)
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0) return 0;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// LocalStorage Keys for Offline Resilience
const SHIFTS_KEY = 'obathaus_attendance_shifts_v1';
const EMPLOYEES_KEY = 'obathaus_employee_profiles_v1';
const ATTENDANCE_LOGS_KEY = 'obathaus_attendance_logs_v1';
const OUTLETS_LOCATION_KEY = 'obathaus_outlets_gps_v1';
const WAREHOUSES_LOCATION_KEY = 'obathaus_warehouses_gps_v1';

class AttendanceService {
  private supabase = isSupabaseConfigured() ? createClient() : null;

  // --------------------------------------------------------------------------
  // 1. MASTER SHIFT MANAGEMENT
  // --------------------------------------------------------------------------

  async getShifts(): Promise<AttendanceShift[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('attendance_shifts')
          .select('*')
          .order('start_time', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem(SHIFTS_KEY, JSON.stringify(data));
          return data as AttendanceShift[];
        }
      } catch (err) {
        console.warn('Fallback to local shifts cache:', err);
      }
    }

    const saved = localStorage.getItem(SHIFTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(INITIAL_ATTENDANCE_SHIFTS));
    return INITIAL_ATTENDANCE_SHIFTS;
  }

  async saveShift(shift: Partial<AttendanceShift> & { name: string; start_time: string; end_time: string }): Promise<AttendanceShift> {
    const isNew = !shift.id;
    const shiftData: AttendanceShift = {
      id: shift.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `shift-${Date.now()}`),
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      late_tolerance_minutes: shift.late_tolerance_minutes ?? 15,
      is_active: shift.is_active ?? true,
      created_at: shift.created_at || new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        if (isNew) {
          const { data, error } = await this.supabase.from('attendance_shifts').insert(shiftData).select().single();
          if (!error && data) return data as AttendanceShift;
        } else {
          const { data, error } = await this.supabase
            .from('attendance_shifts')
            .update(shiftData)
            .eq('id', shiftData.id)
            .select()
            .single();
          if (!error && data) return data as AttendanceShift;
        }
      } catch (err) {
        console.warn('Supabase saveShift error, updating locally:', err);
      }
    }

    const current = await this.getShifts();
    const updated = isNew
      ? [...current, shiftData]
      : current.map((s) => (s.id === shiftData.id ? shiftData : s));
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(updated));
    return shiftData;
  }

  async deleteShift(id: string): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('attendance_shifts').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteShift error:', err);
      }
    }
    const current = await this.getShifts();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(updated));
  }

  // --------------------------------------------------------------------------
  // 2. EMPLOYEE PROFILES & AUTHENTICATION
  // --------------------------------------------------------------------------

  async getEmployees(): Promise<EmployeeProfile[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('employee_profiles')
          .select('*')
          .order('employee_code', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data));
          return data as EmployeeProfile[];
        }
      } catch (err) {
        console.warn('Fallback to local employees cache:', err);
      }
    }

    const saved = localStorage.getItem(EMPLOYEES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEE_PROFILES));
    return INITIAL_EMPLOYEE_PROFILES;
  }

  async saveEmployee(emp: Partial<EmployeeProfile> & { employee_code: string; full_name: string; assigned_location_id: string }): Promise<EmployeeProfile> {
    const isNew = !emp.id;
    const empData: EmployeeProfile = {
      id: emp.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `emp-${Date.now()}`),
      employee_code: emp.employee_code.trim().toUpperCase(),
      pin: emp.pin || '1234',
      full_name: emp.full_name.trim(),
      role_title: emp.role_title || 'Barista',
      assigned_location_type: emp.assigned_location_type || 'outlet',
      assigned_location_id: emp.assigned_location_id,
      phone: emp.phone || '',
      is_active: emp.is_active ?? true,
      created_at: emp.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.supabase) {
      try {
        if (isNew) {
          const { data, error } = await this.supabase.from('employee_profiles').insert(empData).select().single();
          if (!error && data) return data as EmployeeProfile;
        } else {
          const { data, error } = await this.supabase
            .from('employee_profiles')
            .update(empData)
            .eq('id', empData.id)
            .select()
            .single();
          if (!error && data) return data as EmployeeProfile;
        }
      } catch (err) {
        console.warn('Supabase saveEmployee error, updating locally:', err);
      }
    }

    const current = await this.getEmployees();
    const updated = isNew
      ? [...current, empData]
      : current.map((e) => (e.id === empData.id ? empData : e));
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updated));
    return empData;
  }

  async deleteEmployee(id: string): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.from('employee_profiles').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteEmployee error:', err);
      }
    }
    const current = await this.getEmployees();
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updated));
  }

  /**
   * Fast authentication by Employee ID and 4-digit PIN
   */
  async loginEmployee(employeeCode: string, pin: string): Promise<{ success: boolean; employee?: EmployeeProfile; error?: string }> {
    const cleanCode = employeeCode.trim().toUpperCase();
    const cleanPin = pin.trim();

    const employees = await this.getEmployees();
    const found = employees.find((e) => e.employee_code.toUpperCase() === cleanCode);

    if (!found) {
      return { success: false, error: 'ID Karyawan tidak terdaftar dalam sistem.' };
    }

    if (!found.is_active) {
      return { success: false, error: 'Akun karyawan ini sedang nonaktif.' };
    }

    if (found.pin !== cleanPin) {
      return { success: false, error: 'PIN yang dimasukkan salah.' };
    }

    return { success: true, employee: found };
  }

  // --------------------------------------------------------------------------
  // 3. LOCATION & GPS RESOLUTION
  // --------------------------------------------------------------------------

  async getLocationTarget(type: LocationType, id: string): Promise<{ name: string; latitude: number | null; longitude: number | null; radius_meters: number } | null> {
    if (type === 'warehouse') {
      const savedWh = localStorage.getItem(WAREHOUSES_LOCATION_KEY);
      let list: Warehouse[] = savedWh ? JSON.parse(savedWh) : INITIAL_WAREHOUSES;
      if (this.supabase) {
        try {
          const { data } = await this.supabase.from('warehouses').select('*').eq('id', id).maybeSingle();
          if (data) return { name: data.name, latitude: data.latitude, longitude: data.longitude, radius_meters: data.radius_meters || 100 };
        } catch {}
      }
      const match = list.find((w) => w.id === id);
      return match
        ? { name: match.name, latitude: match.latitude ?? null, longitude: match.longitude ?? null, radius_meters: match.radius_meters ?? 100 }
        : null;
    } else {
      const savedOut = localStorage.getItem(OUTLETS_LOCATION_KEY);
      let list: Outlet[] = savedOut ? JSON.parse(savedOut) : INITIAL_OUTLETS;
      if (this.supabase) {
        try {
          const { data } = await this.supabase.from('outlets').select('*').eq('id', id).maybeSingle();
          if (data) return { name: data.name, latitude: data.latitude, longitude: data.longitude, radius_meters: data.radius_meters || 100 };
        } catch {}
      }
      const match = list.find((o) => o.id === id);
      return match
        ? { name: match.name, latitude: match.latitude ?? null, longitude: match.longitude ?? null, radius_meters: match.radius_meters ?? 100 }
        : null;
    }
  }

  async updateLocationCoordinates(type: LocationType, id: string, lat: number, lng: number, radius = 100): Promise<void> {
    if (this.supabase) {
      try {
        const table = type === 'warehouse' ? 'warehouses' : 'outlets';
        await this.supabase.from(table).update({ latitude: lat, longitude: lng, radius_meters: radius }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updateLocationCoordinates error:', err);
      }
    }

    if (type === 'warehouse') {
      const saved = localStorage.getItem(WAREHOUSES_LOCATION_KEY);
      const list: Warehouse[] = saved ? JSON.parse(saved) : INITIAL_WAREHOUSES;
      const updated = list.map((w) => (w.id === id ? { ...w, latitude: lat, longitude: lng, radius_meters: radius } : w));
      localStorage.setItem(WAREHOUSES_LOCATION_KEY, JSON.stringify(updated));
    } else {
      const saved = localStorage.getItem(OUTLETS_LOCATION_KEY);
      const list: Outlet[] = saved ? JSON.parse(saved) : INITIAL_OUTLETS;
      const updated = list.map((o) => (o.id === id ? { ...o, latitude: lat, longitude: lng, radius_meters: radius } : o));
      localStorage.setItem(OUTLETS_LOCATION_KEY, JSON.stringify(updated));
    }
  }

  // --------------------------------------------------------------------------
  // 4. ATTENDANCE LOGS (CLOCK IN, CLOCK OUT, REPORT ABSENCE)
  // --------------------------------------------------------------------------

  private getTodayDateStr(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceLog | null> {
    const today = this.getTodayDateStr();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', today)
          .maybeSingle();
        if (!error && data) return data as AttendanceLog;
      } catch (err) {
        console.warn('Fallback to local today attendance:', err);
      }
    }

    const logs = await this.getAllAttendanceLogs();
    return logs.find((l) => l.employee_id === employeeId && l.date === today) || null;
  }

  /**
   * Clock in with GPS validation (max 100m radius)
   */
  async clockIn(
    employeeId: string,
    lat: number,
    lng: number,
    notes?: string
  ): Promise<{ success: boolean; log?: AttendanceLog; distance?: number; error?: string }> {
    const employees = await this.getEmployees();
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) {
      return { success: false, error: 'Profil karyawan tidak ditemukan.' };
    }

    const todayLog = await this.getTodayAttendance(employeeId);
    if (todayLog && todayLog.clock_in) {
      return { success: false, error: 'Anda sudah melakukan absen masuk hari ini.' };
    }

    // Resolve location
    const targetLoc = await this.getLocationTarget(emp.assigned_location_type, emp.assigned_location_id);
    let distance = 0;
    const maxRadius = targetLoc?.radius_meters || 100;

    if (targetLoc && targetLoc.latitude !== null && targetLoc.longitude !== null && targetLoc.latitude !== 0) {
      distance = calculateDistanceMeters(lat, lng, targetLoc.latitude, targetLoc.longitude);
      if (distance > maxRadius) {
        return {
          success: false,
          distance,
          error: `Anda berada di luar radius lokasi ${targetLoc.name}. Jarak Anda saat ini: ${distance} meter (Maksimal: ${maxRadius} meter).`,
        };
      }
    }

    // Resolve Shift & Punctuality
    const shifts = await this.getShifts();
    const activeShifts = shifts.filter((s) => s.is_active);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let matchedShift: AttendanceShift | null = null;
    let minDiff = Infinity;
    for (const sh of activeShifts) {
      const [shH, shM] = sh.start_time.split(':').map(Number);
      const shMinutes = shH * 60 + shM;
      const diff = Math.abs(nowMinutes - shMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        matchedShift = sh;
      }
    }

    let status: AttendanceStatus = 'present';
    let autoNote = notes || '';
    if (matchedShift) {
      const [shH, shM] = matchedShift.start_time.split(':').map(Number);
      const scheduledMinutes = shH * 60 + shM;
      const lateMins = nowMinutes - scheduledMinutes;
      if (lateMins > (matchedShift.late_tolerance_minutes || 15)) {
        status = 'late';
        autoNote = autoNote ? `${autoNote} (Terlambat ${lateMins} menit)` : `Terlambat ${lateMins} menit`;
      }
    }

    const newLog: AttendanceLog = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`,
      employee_id: employeeId,
      date: this.getTodayDateStr(),
      shift_id: matchedShift?.id || null,
      clock_in: now.toISOString(),
      clock_out: null,
      clock_in_lat: lat,
      clock_in_lng: lng,
      clock_in_distance_meters: distance,
      status,
      notes: autoNote || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.from('attendance_logs').insert(newLog).select().single();
        if (!error && data) {
          await this.saveLocalLog(data as AttendanceLog);
          return { success: true, log: data as AttendanceLog, distance };
        }
      } catch (err) {
        console.warn('Supabase clockIn error, saving locally:', err);
      }
    }

    await this.saveLocalLog(newLog);
    return { success: true, log: newLog, distance };
  }

  /**
   * Clock out
   */
  async clockOut(logId: string, notes?: string): Promise<{ success: boolean; log?: AttendanceLog; error?: string }> {
    const nowIso = new Date().toISOString();

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('attendance_logs')
          .update({ clock_out: nowIso, updated_at: nowIso, ...(notes ? { notes } : {}) })
          .eq('id', logId)
          .select()
          .single();
        if (!error && data) {
          await this.saveLocalLog(data as AttendanceLog);
          return { success: true, log: data as AttendanceLog };
        }
      } catch (err) {
        console.warn('Supabase clockOut error:', err);
      }
    }

    const logs = await this.getAllAttendanceLogs();
    const target = logs.find((l) => l.id === logId);
    if (!target) return { success: false, error: 'Data absensi tidak ditemukan.' };

    const updated: AttendanceLog = {
      ...target,
      clock_out: nowIso,
      updated_at: nowIso,
      notes: notes ? (target.notes ? `${target.notes} • ${notes}` : notes) : target.notes,
    };
    await this.saveLocalLog(updated);
    return { success: true, log: updated };
  }

  /**
   * Report Sick / Leave / Permission (No GPS check needed)
   */
  async reportAbsence(
    employeeId: string,
    type: 'sick' | 'leave' | 'alpha',
    notes: string
  ): Promise<{ success: boolean; log?: AttendanceLog; error?: string }> {
    const today = this.getTodayDateStr();
    const existing = await this.getTodayAttendance(employeeId);
    if (existing && existing.clock_in) {
      return { success: false, error: 'Anda sudah tercatat hadir masuk hari ini.' };
    }

    const nowIso = new Date().toISOString();
    const newLog: AttendanceLog = {
      id: existing?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`),
      employee_id: employeeId,
      date: today,
      shift_id: null,
      clock_in: null,
      clock_out: null,
      clock_in_lat: null,
      clock_in_lng: null,
      clock_in_distance_meters: null,
      status: type,
      notes: notes.trim(),
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.from('attendance_logs').upsert(newLog).select().single();
        if (!error && data) {
          await this.saveLocalLog(data as AttendanceLog);
          return { success: true, log: data as AttendanceLog };
        }
      } catch (err) {
        console.warn('Supabase reportAbsence error:', err);
      }
    }

    await this.saveLocalLog(newLog);
    return { success: true, log: newLog };
  }

  private async saveLocalLog(log: AttendanceLog): Promise<void> {
    const logs = await this.getAllAttendanceLogs();
    const idx = logs.findIndex((l) => l.id === log.id);
    const updated = idx >= 0 ? logs.map((l, i) => (i === idx ? log : l)) : [log, ...logs];
    localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify(updated));
  }

  async getAllAttendanceLogs(filter?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }): Promise<AttendanceLog[]> {
    if (this.supabase) {
      try {
        let q = this.supabase.from('attendance_logs').select('*').order('date', { ascending: false });
        if (filter?.date) q = q.eq('date', filter.date);
        if (filter?.startDate) q = q.gte('date', filter.startDate);
        if (filter?.endDate) q = q.lte('date', filter.endDate);
        if (filter?.employeeId) q = q.eq('employee_id', filter.employeeId);
        const { data, error } = await q;
        if (!error && data) {
          localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify(data));
          return data as AttendanceLog[];
        }
      } catch (err) {
        console.warn('Fallback to local logs:', err);
      }
    }

    const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    let list: AttendanceLog[] = saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_LOGS;

    if (filter?.date) list = list.filter((l) => l.date === filter.date);
    if (filter?.startDate) list = list.filter((l) => l.date >= filter.startDate!);
    if (filter?.endDate) list = list.filter((l) => l.date <= filter.endDate!);
    if (filter?.employeeId) list = list.filter((l) => l.employee_id === filter.employeeId);

    return list;
  }
}

export const attendanceService = new AttendanceService();
