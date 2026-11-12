import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/server/request-auth';
import { ATTENDANCE_SESSION_COOKIE } from '@/lib/server/session-token';

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearSessionCookie(res, ATTENDANCE_SESSION_COOKIE);
  return res;
}
