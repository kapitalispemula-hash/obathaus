import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  clearSessionCookie,
  getAttendanceSession,
  isServerSupabaseConfigured,
  SAFE_EMPLOYEE_COLUMNS,
  sanitizeEmployee,
} from '@/lib/server/request-auth';
import { hashSecret } from '@/lib/server/password';
import { ATTENDANCE_SESSION_COOKIE } from '@/lib/server/session-token';

export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ employee: null }, { status: 503 });
  }

  const employee = await getAttendanceSession();
  if (!employee) {
    const res = NextResponse.json({ employee: null }, { status: 401 });
    clearSessionCookie(res, ATTENDANCE_SESSION_COOKIE);
    return res;
  }

  return NextResponse.json({ employee });
}

export async function PATCH(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const employee = await getAttendanceSession();
  if (!employee) {
    return NextResponse.json({ error: 'Sesi karyawan tidak valid. Silakan masuk ulang.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body?.full_name === 'string' && body.full_name.trim()) {
    updates.full_name = body.full_name.trim();
  }
  if (typeof body?.role_title === 'string' && body.role_title.trim()) {
    updates.role_title = body.role_title.trim();
  }
  if (body?.phone !== undefined) {
    updates.phone = String(body.phone || '').trim();
  }
  if (body?.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url || null;
  }
  if (typeof body?.pin === 'string' && body.pin.trim()) {
    const cleanPin = body.pin.trim();
    if (cleanPin.length < 4) {
      return NextResponse.json({ error: 'PIN minimal harus 4 digit.' }, { status: 400 });
    }
    updates.pin = hashSecret(cleanPin);
  }

  const admin = createAdminClient();
  let { data, error } = await admin
    .from('employee_profiles')
    .update(updates)
    .eq('id', employee.id)
    .select(SAFE_EMPLOYEE_COLUMNS)
    .single();

  if (error && (error.code === 'PGRST204' || error.message?.toLowerCase().includes('avatar_url'))) {
    const { avatar_url: _omit, ...withoutAvatar } = updates;
    const retry = await admin
      .from('employee_profiles')
      .update(withoutAvatar)
      .eq('id', employee.id)
      .select(
        'id, employee_code, full_name, role_title, assigned_location_type, assigned_location_id, phone, is_active, created_at, updated_at'
      )
      .single();
    data = retry.data ? ({ ...retry.data, avatar_url: body?.avatar_url ?? null } as any) : null;
    error = retry.error;
  }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Gagal memperbarui profil karyawan.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ employee: sanitizeEmployee(data) });
}
