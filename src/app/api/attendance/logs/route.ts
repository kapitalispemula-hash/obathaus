import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAttendanceSession,
  getStaffSession,
  isServerSupabaseConfigured,
} from '@/lib/server/request-auth';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const [staff, emp] = await Promise.all([getStaffSession(), getAttendanceSession()]);
  if (!staff && !emp) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const gteCreatedAt = searchParams.get('gteCreatedAt');
  const limitParam = Number(searchParams.get('limit') || '0');
  const requestedEmployeeId = searchParams.get('employeeId');
  const employeeId = !staff && emp ? emp.id : requestedEmployeeId;

  const admin = createAdminClient();
  let query = admin
    .from('attendance_logs')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (date) query = query.eq('date', date);
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (gteCreatedAt) query = query.gte('created_at', gteCreatedAt);
  if (employeeId) query = query.eq('employee_id', employeeId);
  if (limitParam > 0) query = query.limit(Math.min(limitParam, 1000));

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const [staff, emp] = await Promise.all([getStaffSession(), getAttendanceSession()]);
  if (!staff && !emp) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body?.mode === 'insert' ? 'insert' : 'upsert';
  const rawLog = body?.log || body;
  if (!rawLog || !rawLog.employee_id || !rawLog.date) {
    return NextResponse.json({ error: 'Data log absensi tidak lengkap.' }, { status: 400 });
  }

  if (!staff && emp && rawLog.employee_id !== emp.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = {
    ...rawLog,
    shift_id: rawLog.shift_id && UUID_REGEX.test(rawLog.shift_id) ? rawLog.shift_id : null,
  };

  const admin = createAdminClient();
  let { data, error } =
    mode === 'insert'
      ? await admin.from('attendance_logs').insert(payload).select().single()
      : await admin.from('attendance_logs').upsert(payload).select().single();

  if (error && payload.shift_id && error.code === '23503') {
    const retryPayload = { ...payload, shift_id: null };
    const retry =
      mode === 'insert'
        ? await admin.from('attendance_logs').insert(retryPayload).select().single()
        : await admin.from('attendance_logs').upsert(retryPayload).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}

export async function PATCH(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const [staff, emp] = await Promise.all([getStaffSession(), getAttendanceSession()]);
  if (!staff && !emp) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ error: 'ID log absensi wajib diisi.' }, { status: 400 });

  const admin = createAdminClient();
  if (!staff && emp) {
    const { data: existing } = await admin
      .from('attendance_logs')
      .select('employee_id')
      .eq('id', id)
      .maybeSingle();
    if (existing && existing.employee_id !== emp.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const updatePayload: Record<string, any> = {
    clock_out: body?.clock_out || new Date().toISOString(),
    updated_at: body?.updated_at || new Date().toISOString(),
  };
  if (body?.notes !== undefined) updatePayload.notes = body.notes;

  const { data, error } = await admin
    .from('attendance_logs')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ log: data });
}
