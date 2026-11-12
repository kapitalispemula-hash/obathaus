import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmployeeProfile, Profile } from '@/types/database';
import {
  ATTENDANCE_SESSION_COOKIE,
  AttendanceSessionPayload,
  STAFF_SESSION_COOKIE,
  StaffSessionPayload,
  verifyToken,
} from '@/lib/server/session-token';

export const SAFE_PROFILE_COLUMNS =
  'id, email, username, full_name, role, is_active, primary_outlet_id, primary_warehouse_id, created_at, updated_at';

export const SAFE_EMPLOYEE_COLUMNS =
  'id, employee_code, full_name, role_title, assigned_location_type, assigned_location_id, phone, avatar_url, is_active, created_at, updated_at';

export function sanitizeProfile(row: any): Profile {
  const { password: _omitted, ...rest } = row || {};
  return rest as Profile;
}

export function sanitizeEmployee(row: any): EmployeeProfile {
  const { pin: _omitted, ...rest } = row || {};
  return rest as EmployeeProfile;
}

export function applySessionCookie(
  res: NextResponse,
  cookieName: string,
  token: string,
  maxAgeSeconds: number
): void {
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(res: NextResponse, cookieName: string): void {
  res.cookies.set(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getStaffSession(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
    const payload = await verifyToken<StaffSessionPayload>(rawToken, 'staff');
    if (!payload) return null;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select(SAFE_PROFILE_COLUMNS)
      .eq('id', payload.sub)
      .maybeSingle();

    if (error || !data || !data.is_active) return null;
    return sanitizeProfile(data);
  } catch {
    return null;
  }
}

export async function getAttendanceSession(): Promise<EmployeeProfile | null> {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(ATTENDANCE_SESSION_COOKIE)?.value;
    const payload = await verifyToken<AttendanceSessionPayload>(rawToken, 'attendance');
    if (!payload) return null;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('employee_profiles')
      .select(SAFE_EMPLOYEE_COLUMNS)
      .eq('id', payload.sub)
      .maybeSingle();

    if (error || !data || !data.is_active) return null;
    return sanitizeEmployee(data);
  } catch {
    return null;
  }
}

export function isServerSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
      url !== 'https://your-project.supabase.co' &&
      url !== 'https://placeholder.supabase.co' &&
      serviceKey &&
      serviceKey.trim().length > 10
  );
}
