import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getStaffSession,
  isServerSupabaseConfigured,
  SAFE_PROFILE_COLUMNS,
  sanitizeProfile,
} from '@/lib/server/request-auth';
import { hashSecret } from '@/lib/server/password';

export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select(SAFE_PROFILE_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: (data || []).map(sanitizeProfile) });
}

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || '').toLowerCase().trim();
  const fullName = String(body?.full_name || '').trim();
  const rawPassword = String(body?.password || '').trim();
  const role = body?.role || 'cashier';
  const username = String(
    body?.username || email.split('@')[0] || fullName.split(' ')[0] || ''
  )
    .toLowerCase()
    .trim();

  if (!email || !fullName || !rawPassword || rawPassword.length < 4) {
    return NextResponse.json(
      { error: 'Email, nama lengkap, dan kata sandi minimal 4 karakter wajib diisi.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: checkErr } = await admin
    .from('profiles')
    .select('id, email, username');

  if (checkErr) {
    return NextResponse.json({ error: checkErr.message }, { status: 500 });
  }

  if ((existing || []).some((p: any) => String(p.email || '').toLowerCase() === email)) {
    return NextResponse.json({ error: 'Email akun ini sudah terdaftar.' }, { status: 409 });
  }
  if (
    username &&
    (existing || []).some((p: any) => String(p.username || '').toLowerCase() === username)
  ) {
    return NextResponse.json(
      { error: `Username "${username}" sudah digunakan oleh staf lain.` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const newRow = {
    id: crypto.randomUUID(),
    email,
    username,
    full_name: fullName,
    role,
    is_active: true,
    password: hashSecret(rawPassword),
    primary_outlet_id: role === 'cashier' ? body?.primary_outlet_id || null : null,
    primary_warehouse_id: role === 'warehouse_operator' ? body?.primary_warehouse_id || null : null,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error: insertErr } = await admin
    .from('profiles')
    .insert([newRow])
    .select(SAFE_PROFILE_COLUMNS)
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ profile: sanitizeProfile(inserted) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  const updates = body?.updates || {};
  if (!id) {
    return NextResponse.json({ error: 'ID pengguna wajib diisi.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: allProfiles, error: listErr } = await admin
    .from('profiles')
    .select(SAFE_PROFILE_COLUMNS);
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const target = (allProfiles || []).find((p: any) => p.id === id);
  if (!target) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  }

  // Prevent locking out the last active admin or self-deactivation
  if (updates.is_active === false && id === session.id) {
    return NextResponse.json(
      { error: 'Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan saat ini.' },
      { status: 400 }
    );
  }
  const nextRole = updates.role ?? target.role;
  const nextActive = updates.is_active ?? target.is_active;
  if (target.role === 'admin' && (nextRole !== 'admin' || nextActive === false)) {
    const otherActiveAdmins = (allProfiles || []).filter(
      (p: any) => p.id !== id && p.role === 'admin' && p.is_active
    );
    if (otherActiveAdmins.length === 0) {
      return NextResponse.json(
        { error: 'Sistem membutuhkan minimal 1 akun Administrator aktif.' },
        { status: 400 }
      );
    }
  }

  const safeUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.full_name !== undefined) safeUpdates.full_name = String(updates.full_name).trim();
  if (updates.username !== undefined) safeUpdates.username = String(updates.username).toLowerCase().trim();
  if (updates.is_active !== undefined) safeUpdates.is_active = Boolean(updates.is_active);
  if (updates.role !== undefined) safeUpdates.role = updates.role;
  if (updates.primary_outlet_id !== undefined) {
    safeUpdates.primary_outlet_id = updates.primary_outlet_id || null;
  }
  if (updates.primary_warehouse_id !== undefined) {
    safeUpdates.primary_warehouse_id = updates.primary_warehouse_id || null;
  }
  if (typeof updates.password === 'string' && updates.password.trim().length > 0) {
    if (updates.password.trim().length < 4) {
      return NextResponse.json({ error: 'Kata sandi minimal 4 karakter.' }, { status: 400 });
    }
    safeUpdates.password = hashSecret(updates.password.trim());
  }

  const { data: updated, error: updErr } = await admin
    .from('profiles')
    .update(safeUpdates)
    .eq('id', id)
    .select(SAFE_PROFILE_COLUMNS)
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ profile: sanitizeProfile(updated) });
}

export async function DELETE(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'ID pengguna wajib diisi.' }, { status: 400 });
  if (id === session.id) {
    return NextResponse.json(
      { error: 'Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: allProfiles, error: listErr } = await admin
    .from('profiles')
    .select('id, role, full_name');
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const target = (allProfiles || []).find((p: any) => p.id === id);
  if (!target) return NextResponse.json({ error: 'Akun pengguna tidak ditemukan.' }, { status: 404 });

  if (target.role === 'admin') {
    const remainingAdmins = (allProfiles || []).filter(
      (p: any) => p.role === 'admin' && p.id !== id
    );
    if (remainingAdmins.length === 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun ini karena sistem membutuhkan minimal 1 akun Administrator aktif.' },
        { status: 400 }
      );
    }
  }

  const { error: delErr } = await admin.from('profiles').delete().eq('id', id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
