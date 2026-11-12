import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  applySessionCookie,
  isServerSupabaseConfigured,
  sanitizeProfile,
} from '@/lib/server/request-auth';
import { hashSecret, isHashedSecret, verifySecret } from '@/lib/server/password';
import { STAFF_SESSION_COOKIE, signToken } from '@/lib/server/session-token';

const STAFF_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Server Supabase belum dikonfigurasi (SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawIdentifier = String(body?.identifier || body?.username || body?.email || '').trim();
    const rawPassword = typeof body?.password === 'string' ? body.password : '';

    if (!rawIdentifier || !rawPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username/email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanLower = rawIdentifier.toLowerCase();
    const admin = createAdminClient();

    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal membaca data akun dari database.' },
        { status: 500 }
      );
    }

    const matched = (profiles || []).find((p: any) => {
      const uname = String(p?.username || '').trim().toLowerCase();
      const email = String(p?.email || '').trim().toLowerCase();
      const emailPrefix = email.includes('@') ? email.split('@')[0] : '';
      return (
        uname === cleanLower ||
        email === cleanLower ||
        (!cleanLower.includes('@') && emailPrefix === cleanLower)
      );
    });

    if (!matched) {
      return NextResponse.json(
        { success: false, error: 'Username atau email tidak ditemukan.' },
        { status: 401 }
      );
    }

    if (!matched.is_active) {
      return NextResponse.json(
        { success: false, error: 'Akun Anda sedang dinonaktifkan oleh Admin.' },
        { status: 403 }
      );
    }

    if (!verifySecret(rawPassword, matched.password)) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // Transparently upgrade legacy plaintext password to salted scrypt$ hash without altering account
    if (!isHashedSecret(matched.password)) {
      try {
        await admin
          .from('profiles')
          .update({
            password: hashSecret(rawPassword),
            updated_at: new Date().toISOString(),
          })
          .eq('id', matched.id);
      } catch (upgradeErr) {
        console.warn('Profile password hash upgrade warning:', upgradeErr);
      }
    }

    const safeUser = sanitizeProfile(matched);
    const token = await signToken({
      kind: 'staff',
      sub: safeUser.id,
      role: safeUser.role,
      email: safeUser.email,
      outletId: safeUser.primary_outlet_id ?? null,
      warehouseId: safeUser.primary_warehouse_id ?? null,
      exp: Date.now() + STAFF_SESSION_TTL_SECONDS * 1000,
    });

    const res = NextResponse.json({
      success: true,
      user: safeUser,
    });

    applySessionCookie(res, STAFF_SESSION_COOKIE, token, STAFF_SESSION_TTL_SECONDS);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan saat memproses login.' },
      { status: 500 }
    );
  }
}
