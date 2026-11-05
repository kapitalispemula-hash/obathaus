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
// GEOLOCATION & TIME UTILITIES
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

/**
 * Foolproof RFC 4122 v4 UUID generator compatible with Postgres UUID type
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats ISO date-time string into clean HH:mm WITA (Indonesian time format)
 */
export function formatTimeDisplay(dateOrIso?: string | null): string {
  if (!dateOrIso) return '--:--';
  const trimmed = dateOrIso.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Makassar',
      hour12: false,
    }).replace('.', ':');
  } catch {
    return trimmed;
  }
}

/**
 * Clears old legacy dummy storage keys and string-based demo IDs
 */
export function purgeLegacyDemoData(): void {
  if (typeof window === 'undefined') return;
  try {
    const savedEmpId = localStorage.getItem('obathaus_active_employee_id');
    if (savedEmpId && (savedEmpId.startsWith('emp-') || !savedEmpId.includes('-'))) {
      localStorage.removeItem('obathaus_active_employee_id');
    }

    const savedLogs = localStorage.getItem('obathaus_attendance_logs_v1');
    if (savedLogs) {
      const logs = JSON.parse(savedLogs);
      if (Array.isArray(logs)) {
        const cleanLogs = logs.filter(
          (l) => l.employee_id && !l.employee_id.startsWith('emp-')
        );
        localStorage.setItem('obathaus_attendance_logs_v1', JSON.stringify(cleanLogs));
      }
    }
  } catch (err) {
    console.warn('Error purging legacy demo data:', err);
  }
}

// LocalStorage Keys for Offline Resilience
const SHIFTS_KEY = 'obathaus_attendance_shifts_v1';
const EMPLOYEES_KEY = 'obathaus_employee_profiles_v1';
const ATTENDANCE_LOGS_KEY = 'obathaus_attendance_logs_v1';
const OUTLETS_LOCATION_KEY = 'obathaus_outlets_gps_v1';
const WAREHOUSES_LOCATION_KEY = 'obathaus_warehouses_gps_v1';

class AttendanceService {
  private getSupabase() {
    return isSupabaseConfigured() ? createClient() : null;
  }

  // --------------------------------------------------------------------------
  // 1. MASTER SHIFT MANAGEMENT
  // --------------------------------------------------------------------------

  async getShifts(): Promise<AttendanceShift[]> {
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_shifts')
          .select('*')
          .order('start_time', { ascending: true });
        if (!error && data) {
          localStorage.setItem(SHIFTS_KEY, JSON.stringify(data));
          return data as AttendanceShift[];
        }
      } catch (err) {
        console.warn('Fallback to local shifts cache:', err);
      }
    }

    const saved = localStorage.getItem(SHIFTS_KEY);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_ATTENDANCE_SHIFTS;
  }

  async saveShift(shift: Partial<AttendanceShift> & { name: string; start_time: string; end_time: string }): Promise<AttendanceShift> {
    const isNew = !shift.id;
    const shiftData: AttendanceShift = {
      id: shift.id || generateUUID(),
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      late_tolerance_minutes: shift.late_tolerance_minutes ?? 15,
      is_active: shift.is_active ?? true,
      created_at: shift.created_at || new Date().toISOString(),
    };

    const supabase = this.getSupabase();
    if (supabase) {
      try {
        if (isNew) {
          const { data, error } = await supabase.from('attendance_shifts').insert(shiftData).select().single();
          if (!error && data) return data as AttendanceShift;
        } else {
          const { data, error } = await supabase
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
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        await supabase.from('attendance_shifts').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteShift error:', err);
      }
    }
    const saved = localStorage.getItem(SHIFTS_KEY);
    const list: AttendanceShift[] = saved ? JSON.parse(saved) : [];
    const updated = list.filter((s) => s.id !== id);
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(updated));
  }

  // --------------------------------------------------------------------------
  // 2. EMPLOYEE PROFILES & AUTHENTICATION
  // --------------------------------------------------------------------------

  async getEmployees(): Promise<EmployeeProfile[]> {
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('employee_profiles')
          .select('*')
          .order('employee_code', { ascending: true });

        if (!error && data) {
          localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data));
          return data as EmployeeProfile[];
        }
        if (error) console.error('Supabase getEmployees error:', error);
      } catch (err) {
        console.warn('Fallback to local employees cache:', err);
      }
    }

    const saved = localStorage.getItem(EMPLOYEES_KEY);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_EMPLOYEE_PROFILES;
  }

  async saveEmployee(emp: Partial<EmployeeProfile> & { employee_code: string; full_name: string; assigned_location_id: string }): Promise<EmployeeProfile> {
    const isNew = !emp.id;
    const empData: EmployeeProfile = {
      id: emp.id || generateUUID(),
      employee_code: emp.employee_code.trim().toUpperCase(),
      pin: emp.pin || '1234',
      full_name: emp.full_name.trim(),
      role_title: emp.role_title || 'Barista',
      assigned_location_type: emp.assigned_location_type || 'outlet',
      assigned_location_id: emp.assigned_location_id,
      phone: emp.phone || '',
      avatar_url: emp.avatar_url || '',
      is_active: emp.is_active ?? true,
      created_at: emp.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const supabase = this.getSupabase();
    if (supabase) {
      try {
        if (isNew) {
          const { data, error } = await supabase.from('employee_profiles').insert(empData).select().single();
          if (!error && data) return data as EmployeeProfile;
        } else {
          const { data, error } = await supabase
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

  async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        // 1. Delete associated logs first to prevent foreign key constraint violations
        await supabase.from('attendance_logs').delete().eq('employee_id', id);

        // 2. Delete employee from Supabase
        const { error } = await supabase.from('employee_profiles').delete().eq('id', id);
        if (error) {
          console.error('Supabase deleteEmployee error:', error);
          // Try deleting by employee_code if id was a code (EMP-01, etc.)
          await supabase.from('employee_profiles').delete().eq('employee_code', id);
        }
      } catch (err: any) {
        console.warn('Supabase deleteEmployee exception:', err);
      }
    }

    // 3. Update local cache immediately
    const saved = localStorage.getItem(EMPLOYEES_KEY);
    const list: EmployeeProfile[] = saved ? JSON.parse(saved) : [];
    const updated = list.filter((e) => e.id !== id && e.employee_code !== id);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updated));

    // 4. Clear active session if this employee was currently selected
    const savedActiveEmpId = localStorage.getItem('obathaus_active_employee_id');
    if (savedActiveEmpId === id) {
      localStorage.removeItem('obathaus_active_employee_id');
    }

    return { success: true };
  }

  /**
   * Fast authentication by Employee ID and 4-digit PIN directly against Supabase
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
    const supabase = this.getSupabase();
    if (type === 'warehouse') {
      const savedWh = localStorage.getItem(WAREHOUSES_LOCATION_KEY);
      let list: Warehouse[] = savedWh ? JSON.parse(savedWh) : INITIAL_WAREHOUSES;
      if (supabase) {
        try {
          const { data } = await supabase.from('warehouses').select('*').eq('id', id).maybeSingle();
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
      if (supabase) {
        try {
          const { data } = await supabase.from('outlets').select('*').eq('id', id).maybeSingle();
          if (data) return { name: data.name, latitude: data.latitude, longitude: data.longitude, radius_meters: data.radius_meters || 100 };
        } catch {}
      }
      const match = list.find((o) => o.id === id);
      return match
        ? { name: match.name, latitude: match.latitude ?? null, longitude: match.longitude ?? null, radius_meters: match.radius_meters ?? 100 }
        : null;
    }
  }

  async updateLocationCoordinates(
    type: LocationType,
    id: string,
    lat: number,
    lng: number,
    radius: number
  ): Promise<void> {
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        const table = type === 'warehouse' ? 'warehouses' : 'outlets';
        await supabase.from(table).update({ latitude: lat, longitude: lng, radius_meters: radius }).eq('id', id);
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

  getTodayDateStr(): string {
    // Current date in Indonesian timezone (WITA / Asia/Makassar)
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  }

  async getTodayAttendance(employeeId: string): Promise<AttendanceLog | null> {
    const today = this.getTodayDateStr();
    const supabase = this.getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const log = data[0] as AttendanceLog;
          await this.saveLocalLog(log);
          return log;
        }

        // Secondary fallback: check by today's date range in case of timezone offset
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: rangeData } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (rangeData && rangeData.length > 0) {
          const log = rangeData[0] as AttendanceLog;
          await this.saveLocalLog(log);
          return log;
        }
      } catch (err) {
        console.warn('Fallback to local today attendance:', err);
      }
    }

    // Fallback: check local storage cache safely without wiping
    const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    const logs: AttendanceLog[] = saved ? JSON.parse(saved) : [];
    return (
      logs.find((l) => l.employee_id === employeeId && l.date === today) ||
      logs.find((l) => l.employee_id === employeeId && l.clock_in && !l.clock_out) ||
      null
    );
  }

  /**
   * Clock in with GPS validation directly to Supabase cloud
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const newLogId = generateUUID();
    const nowIso = now.toISOString();

    const newLog: AttendanceLog = {
      id: newLogId,
      employee_id: employeeId,
      date: this.getTodayDateStr(),
      shift_id: matchedShift?.id && uuidRegex.test(matchedShift.id) ? matchedShift.id : null,
      clock_in: nowIso,
      clock_out: null,
      clock_in_lat: lat,
      clock_in_lng: lng,
      clock_in_distance_meters: distance,
      status,
      notes: autoNote || null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const supabase = this.getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('attendance_logs').insert(newLog).select().single();
        if (!error && data) {
          await this.saveLocalLog(data as AttendanceLog);
          return { success: true, log: data as AttendanceLog, distance };
        }
        if (error) console.error('Supabase clockIn insert error:', error);
      } catch (err) {
        console.warn('Supabase clockIn error, saving locally:', err);
      }
    }

    await this.saveLocalLog(newLog);
    return { success: true, log: newLog, distance };
  }

  /**
   * Clock out directly to Supabase cloud
   */
  async clockOut(logId: string, notes?: string): Promise<{ success: boolean; log?: AttendanceLog; error?: string }> {
    const nowIso = new Date().toISOString();
    const supabase = this.getSupabase();

    if (supabase) {
      try {
        const updatePayload: any = {
          clock_out: nowIso,
          updated_at: nowIso,
        };
        if (notes) updatePayload.notes = notes;

        const { data, error } = await supabase
          .from('attendance_logs')
          .update(updatePayload)
          .eq('id', logId)
          .select()
          .maybeSingle();

        if (!error && data) {
          await this.saveLocalLog(data as AttendanceLog);
          return { success: true, log: data as AttendanceLog };
        }
        if (error) console.warn('Supabase clockOut error:', error);
      } catch (err) {
        console.warn('Supabase clockOut error, updating locally:', err);
      }
    }

    // Local fallback check
    const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    const logs: AttendanceLog[] = saved ? JSON.parse(saved) : [];
    let target = logs.find((l) => l.id === logId);
    if (!target) {
      const today = this.getTodayDateStr();
      target = logs.find((l) => l.date === today && l.clock_in && !l.clock_out);
    }
    if (!target) return { success: false, error: 'Data absensi tidak ditemukan.' };

    const updated: AttendanceLog = {
      ...target,
      clock_out: nowIso,
      updated_at: nowIso,
      notes: notes ? (target.notes ? `${target.notes} • ${notes}` : notes) : target.notes,
    };
    await this.saveLocalLog(updated);

    if (supabase) {
      try {
        await supabase.from('attendance_logs').upsert(updated);
      } catch (e) {
        console.warn('Supabase sync after clockout error:', e);
      }
    }

    return { success: true, log: updated };
  }

  /**
   * Report Sick / Leave / Permission (Direct to Supabase cloud)
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

    const newLogId = generateUUID();
    const nowIso = new Date().toISOString();
    const newLog: AttendanceLog = {
      id: existing?.id || newLogId,
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

    const supabase = this.getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('attendance_logs').upsert(newLog).select().single();
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
    const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    const logs: AttendanceLog[] = saved ? JSON.parse(saved) : [];
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
    const supabase = this.getSupabase();
    if (supabase) {
      try {
        let q = supabase.from('attendance_logs').select('*').order('date', { ascending: false });
        if (filter?.date) q = q.eq('date', filter.date);
        if (filter?.startDate) q = q.gte('date', filter.startDate);
        if (filter?.endDate) q = q.lte('date', filter.endDate);
        if (filter?.employeeId) q = q.eq('employee_id', filter.employeeId);
        const { data, error } = await q;

        if (!error && data) {
          // Merge safely with any unsynced local logs
          const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
          const localLogs: AttendanceLog[] = saved ? JSON.parse(saved) : [];
          const map = new Map<string, AttendanceLog>();
          localLogs.forEach((l) => map.set(l.id, l));
          data.forEach((l) => map.set(l.id, l as AttendanceLog));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()
          );
          localStorage.setItem(ATTENDANCE_LOGS_KEY, JSON.stringify(merged));

          let result = merged;
          if (filter?.employeeId) result = result.filter((l) => l.employee_id === filter.employeeId);
          if (filter?.date) result = result.filter((l) => l.date === filter.date);
          return result;
        }
      } catch (err) {
        console.warn('Fallback to local logs:', err);
      }
    }

    const saved = localStorage.getItem(ATTENDANCE_LOGS_KEY);
    let list: AttendanceLog[] = saved ? JSON.parse(saved) : [];

    if (filter?.date) list = list.filter((l) => l.date === filter.date);
    if (filter?.startDate) list = list.filter((l) => l.date >= filter.startDate!);
    if (filter?.endDate) list = list.filter((l) => l.date <= filter.endDate!);
    if (filter?.employeeId) list = list.filter((l) => l.employee_id === filter.employeeId);

    return list;
  }
}

export const attendanceService = new AttendanceService();
