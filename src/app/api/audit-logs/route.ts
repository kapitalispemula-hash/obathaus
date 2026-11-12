import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStaffSession, isServerSupabaseConfigured } from '@/lib/server/request-auth';

export async function GET(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const limitParam = Number(searchParams.get('limit') || '300');
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 300;

  const admin = createAdminClient();
  let query = admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action && action !== 'all') {
    query = query.eq('action', action);
  }

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

  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const id = typeof body?.id === 'string' && body.id ? body.id : crypto.randomUUID();
  const createdAt = body?.created_at || new Date().toISOString();
  const entityType = body?.entity_type || 'system';
  const details = body?.details || '';
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = body?.ip_address || (forwardedFor ? forwardedFor.split(',')[0].trim() : null);
  const userAgent = body?.user_agent || request.headers.get('user-agent') || null;

  const unifiedRow = {
    id,
    user_id: session.id,
    action: String(body?.action || 'system_event'),
    entity_type: entityType,
    entity_name: entityType,
    entity_id: body?.entity_id || null,
    details,
    payload: {
      details,
      old_values: body?.old_values || null,
      new_values: body?.new_values || null,
    },
    old_values: body?.old_values || null,
    new_values: body?.new_values || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: createdAt,
  };

  const { error: unifiedErr } = await admin.from('audit_logs').insert(unifiedRow);
  if (unifiedErr) {
    const { error: v2Err } = await admin.from('audit_logs').insert({
      id,
      user_id: session.id,
      action: unifiedRow.action,
      entity_type: entityType,
      entity_id: unifiedRow.entity_id || 'system',
      details: details || unifiedRow.action,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: createdAt,
    });
    if (v2Err) {
      const { error: v1Err } = await admin.from('audit_logs').insert({
        id,
        user_id: session.id,
        action: unifiedRow.action,
        entity_name: entityType,
        entity_id: unifiedRow.entity_id,
        payload: unifiedRow.payload,
        created_at: createdAt,
      });
      if (v1Err) {
        return NextResponse.json({ error: v1Err.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true, id }, { status: 201 });
}
