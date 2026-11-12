import { NextResponse } from 'next/server';
import {
  clearSessionCookie,
  getStaffSession,
  isServerSupabaseConfigured,
} from '@/lib/server/request-auth';
import { STAFF_SESSION_COOKIE } from '@/lib/server/session-token';

export async function GET() {
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ user: null }, { status: 503 });
  }

  const user = await getStaffSession();
  if (!user) {
    const res = NextResponse.json({ user: null }, { status: 401 });
    clearSessionCookie(res, STAFF_SESSION_COOKIE);
    return res;
  }

  return NextResponse.json({ user });
}
