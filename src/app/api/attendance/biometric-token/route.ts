import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceSession, isServerSupabaseConfigured } from '@/lib/server/request-auth';
import { signToken } from '@/lib/server/session-token';

const BIOMETRIC_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

export async function POST(request: NextRequest) {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server Supabase belum dikonfigurasi.' }, { status: 503 });
  }

  const employee = await getAttendanceSession();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const credId = typeof body?.credId === 'string' && body.credId.trim() ? body.credId.trim() : employee.id;

  const biometricToken = await signToken({
    kind: 'biometric',
    sub: employee.id,
    credId,
    exp: Date.now() + BIOMETRIC_TOKEN_TTL_SECONDS * 1000,
  });

  return NextResponse.json({ biometricToken });
}
