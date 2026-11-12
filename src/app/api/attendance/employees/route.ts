import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getAttendanceSession,
  getStaffSession,
  isServerSupabaseConfigured,
  SAFE_EMPLOYEE_COLUMNS,
  sanitizeEmployee,
} from '@/lib/server/request-auth';
import { hashSecret } from '@/lib/server/password';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const [staff, emp] = await Promise.all([getStaffSession(), getAttendanceSession()]);
  if (!staff && !emp) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  let query = admin
    .from('employee_profiles')
    .select(SAFE_EMPLOYEE_COLUMNS)
    .order('employee_code', { ascending: true });

  if (!staff && emp) {
    query = query.eq('id', emp.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees: (data || []).map(sanitizeEmployee) });
}

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const staff = await getStaffSession();
  const emp = await getAttendanceSession();
  if (!staff && !emp) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const isAdmin = staff?.role === 'admin';
  const targetId = typeof body?.id === 'string' && body.id ? body.id : null;

  // Non-admin employees can only update their own profile record
  if (!isAdmin) {
    if (!emp || !targetId || targetId !== emp.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const isNew = !targetId;
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();

  if (!isAdmin && emp) {
    // Restricted self-update path for employee session
    const selfUpdates: Record<string, any> = {
      updated_at: nowIso,
    };
    if (body?.full_name) selfUpdates.full_name = String(body.full_name).trim();
    if (body?.role_title) selfUpdates.role_title = String(body.role_title).trim();
    if (body?.phone !== undefined) selfUpdates.phone = String(body.phone || '').trim();
    if (body?.avatar_url !== undefined) selfUpdates.avatar_url = body.avatar_url || null;
    if (typeof body?.pin === 'string' && body.pin.trim()) {
      if (body.pin.trim().length < 4) {
        return NextResponse.json({ error: 'PIN minimal harus 4 digit.' }, { status: 400 });
      }
      selfUpdates.pin = hashSecret(body.pin.trim());
    }

    const { data, error } = await admin
      .from('employee_profiles')
      .update(selfUpdates)
      .eq('id', emp.id)
      .select(SAFE_EMPLOYEE_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ employee: sanitizeEmployee(data) });
  }

  const empId = targetId || crypto.randomUUID();
  const cleanCode = String(body?.employee_code || '').trim().toUpperCase();
  const cleanName = String(body?.full_name || '').trim();
  const locId = String(body?.assigned_location_id || '').trim();

  if (!cleanCode || !cleanName || !locId) {
    return NextResponse.json(
      { error: 'Kode karyawan, nama lengkap, dan lokasi penempatan wajib diisi.' },
      { status: 400 }
    );
  }

  const dbPayload: Record<string, any> = {
    id: empId,
    employee_code: cleanCode,
    full_name: cleanName,
    role_title: String(body?.role_title || 'Barista').trim(),
    assigned_location_type: body?.assigned_location_type || 'outlet',
    assigned_location_id: UUID_REGEX.test(locId) ? locId : null,
    phone: String(body?.phone || '').trim(),
    avatar_url: body?.avatar_url || null,
    is_active: body?.is_active ?? true,
    updated_at: nowIso,
  };

  if (typeof body?.pin === 'string' && body.pin.trim().length > 0) {
    if (body.pin.trim().length < 4) {
      return NextResponse.json({ error: 'PIN minimal harus 4 digit.' }, { status: 400 });
    }
    dbPayload.pin = hashSecret(body.pin.trim());
  } else if (isNew) {
    dbPayload.pin = hashSecret('1234');
  }

  if (isNew) {
    dbPayload.created_at = body?.created_at || nowIso;
  }

  const executeWrite = async (payloadToWrite: Record<string, any>) => {
    if (isNew) {
      return admin
        .from('employee_profiles')
        .insert(payloadToWrite)
        .select(SAFE_EMPLOYEE_COLUMNS)
        .single();
    }
    return admin
      .from('employee_profiles')
      .update(payloadToWrite)
      .eq('id', empId)
      .select(SAFE_EMPLOYEE_COLUMNS)
      .maybeSingle();
  };

  let { data, error } = await executeWrite(dbPayload);
  if (error && (error.code === 'PGRST204' || error.message?.toLowerCase().includes('avatar_url'))) {
    const { avatar_url: _omit, ...corePayload } = dbPayload;
    const retryRes = await executeWrite(corePayload);
    data = retryRes.data;
    error = retryRes.error;
  }

  if (!isNew && !error && !data) {
    const upsertPayload = {
      ...dbPayload,
      pin: dbPayload.pin || hashSecret('1234'),
      created_at: body?.created_at || nowIso,
    };
    const upsertRes = await admin
      .from('employee_profiles')
      .upsert(upsertPayload)
      .select(SAFE_EMPLOYEE_COLUMNS)
      .single();
    data = upsertRes.data;
    error = upsertRes.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    employee: {
      ...sanitizeEmployee(data),
      avatar_url: (data as any)?.avatar_url ?? body?.avatar_url ?? '',
    },
  });
}

export async function DELETE(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (staff.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'ID karyawan wajib diisi.' }, { status: 400 });

  const admin = createAdminClient();
  const { error: logsErr } = await admin.from('attendance_logs').delete().eq('employee_id', id);
  if (logsErr) {
    return NextResponse.json(
      { error: `Gagal menghapus log absensi karyawan: ${logsErr.message}` },
      { status: 500 }
    );
  }

  let { error } = await admin.from('employee_profiles').delete().eq('id', id);
  if (error) {
    const retry = await admin.from('employee_profiles').delete().eq('employee_code', id);
    error = retry.error;
  }
  if (error) {
    return NextResponse.json(
      { error: `Gagal menghapus karyawan dari database: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
