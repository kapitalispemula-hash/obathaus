import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession, isServerSupabaseConfigured } from '@/lib/server/request-auth';

export async function GET(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const outletId = searchParams.get('outletId');
  const categoryId = searchParams.get('categoryId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const admin = createAdminClient();
  let query = admin.from('operating_expenses').select('*');

  if (session.role === 'cashier' && session.primary_outlet_id) {
    query = query.eq('outlet_id', session.primary_outlet_id);
  } else if (outletId && outletId !== 'all') {
    query = query.eq('outlet_id', outletId);
  }

  if (categoryId && categoryId !== 'all') query = query.eq('category_id', categoryId);
  if (startDate) query = query.gte('expense_date', startDate);
  if (endDate) query = query.lte('expense_date', endDate);

  const { data, error } = await query
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: data || [] });
}

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'cashier') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount || 0);
  if (amount <= 0) {
    return NextResponse.json({ error: 'Nominal pengeluaran harus lebih besar dari 0.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const resolvedOutletId =
    session.role === 'cashier' && session.primary_outlet_id
      ? session.primary_outlet_id
      : body?.outlet_id || null;

  const insertPayload = {
    id: body?.id || crypto.randomUUID(),
    category_id: body?.category_id,
    outlet_id: resolvedOutletId,
    title: String(body?.title || '').trim(),
    amount,
    expense_date: body?.expense_date,
    description: body?.description || null,
    created_by: session.id,
    created_at: body?.created_at || now,
    updated_at: now,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('operating_expenses')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'cashier') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  const updates = body?.updates || {};
  if (!id) return NextResponse.json({ error: 'ID pengeluaran wajib diisi.' }, { status: 400 });
  if (updates.amount !== undefined && Number(updates.amount) <= 0) {
    return NextResponse.json({ error: 'Nominal pengeluaran harus lebih besar dari 0.' }, { status: 400 });
  }

  const admin = createAdminClient();
  if (session.role === 'cashier' && session.primary_outlet_id) {
    const { data: existing } = await admin
      .from('operating_expenses')
      .select('outlet_id')
      .eq('id', id)
      .maybeSingle();
    if (existing && existing.outlet_id !== session.primary_outlet_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.outlet_id !== undefined && session.role === 'admin') {
    payload.outlet_id = updates.outlet_id || null;
  }
  if (updates.title !== undefined) payload.title = String(updates.title).trim();
  if (updates.amount !== undefined) payload.amount = Number(updates.amount);
  if (updates.expense_date !== undefined) payload.expense_date = updates.expense_date;
  if (updates.description !== undefined) payload.description = updates.description || null;

  const { data, error } = await admin
    .from('operating_expenses')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data });
}

export async function DELETE(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin' && session.role !== 'cashier') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'ID pengeluaran wajib diisi.' }, { status: 400 });

  const admin = createAdminClient();
  if (session.role === 'cashier' && session.primary_outlet_id) {
    const { data: existing } = await admin
      .from('operating_expenses')
      .select('outlet_id')
      .eq('id', id)
      .maybeSingle();
    if (existing && existing.outlet_id !== session.primary_outlet_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { error } = await admin.from('operating_expenses').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
