import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  applySessionCookie,
  isServerSupabaseConfigured,
  sanitizeEmployee,
} from '@/lib/server/request-auth';
import { hashSecret, isHashedSecret, verifySecret } from '@/lib/server/password';
import {
  ATTENDANCE_SESSION_COOKIE,
  BiometricTokenPayload,
  signToken,
  verifyToken,
} from '@/lib/server/session-token';

const EMP_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Server Supabase belum dikonfigurasi.' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const biometricToken = typeof body?.biometric_token === 'string' ? body.biometric_token : '';
    const admin = createAdminClient();

    let found: any = null;

    if (biometricToken) {
      const verified = await verifyToken<BiometricTokenPayload>(biometricToken, 'biometric');
      if (!verified) {
        return NextResponse.json(
          {
            success: false,
            error: 'Token biometrik kedaluwarsa atau tidak valid. Silakan masuk dengan ID & PIN lalu aktifkan ulang biometrik.',
          },
          { status: 401 }
        );
      }

      const { data, error } = await admin
        .from('employee_profiles')
        .select('*')
        .eq('id', verified.sub)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: 'Data karyawan sidik jari tidak ditemukan.' },
          { status: 404 }
        );
      }
      if (!data.is_active) {
        return NextResponse.json(
          { success: false, error: 'Akun karyawan ini sedang nonaktif.' },
          { status: 403 }
        );
      }
      found = data;
    } else {
      const cleanCode = String(body?.employee_code || '').trim().toUpperCase();
      const cleanPin = String(body?.pin || '').trim();

      if (!cleanCode || !cleanPin) {
        return NextResponse.json(
          { success: false, error: 'ID Karyawan dan PIN wajib diisi.' },
          { status: 400 }
        );
      }

      const { data, error } = await admin
        .from('employee_profiles')
        .select('*')
        .ilike('employee_code', cleanCode)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json(
          { success: false, error: 'ID Karyawan tidak terdaftar dalam sistem.' },
          { status: 401 }
        );
      }
      if (!data.is_active) {
        return NextResponse.json(
          { success: false, error: 'Akun karyawan ini sedang nonaktif.' },
          { status: 403 }
        );
      }
      if (!verifySecret(cleanPin, data.pin)) {
        return NextResponse.json(
          { success: false, error: 'PIN yang dimasukkan salah.' },
          { status: 401 }
        );
      }

      if (!isHashedSecret(data.pin)) {
        try {
          await admin
            .from('employee_profiles')
            .update({
              pin: hashSecret(cleanPin),
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);
        } catch (upgradeErr) {
          console.warn('Employee PIN hash upgrade warning:', upgradeErr);
        }
      }
      found = data;
    }

    const safeEmployee = sanitizeEmployee(found);
    const token = await signToken({
      kind: 'attendance',
      sub: safeEmployee.id,
      code: safeEmployee.employee_code,
      exp: Date.now() + EMP_SESSION_TTL_SECONDS * 1000,
    });

    const response = NextResponse.json({ success: true, employee: safeEmployee });
    applySessionCookie(response, ATTENDANCE_SESSION_COOKIE, token, EMP_SESSION_TTL_SECONDS);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal masuk ke sistem absensi.' },
      { status: 500 }
    );
  }
}
