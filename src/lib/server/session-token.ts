// EDGE + NODE COMPATIBLE SIGNED SESSION TOKENS (Web Crypto HMAC-SHA256)

export const STAFF_SESSION_COOKIE = 'obathaus_session';
export const ATTENDANCE_SESSION_COOKIE = 'obathaus_emp_session';

export interface StaffSessionPayload {
  kind: 'staff';
  sub: string;
  role: 'admin' | 'cashier' | 'warehouse_operator';
  email: string;
  outletId?: string | null;
  warehouseId?: string | null;
  exp: number;
}

export interface AttendanceSessionPayload {
  kind: 'attendance';
  sub: string;
  code: string;
  exp: number;
}

export interface BiometricTokenPayload {
  kind: 'biometric';
  sub: string;
  credId: string;
  exp: number;
}

export type SessionTokenPayload =
  | StaffSessionPayload
  | AttendanceSessionPayload
  | BiometricTokenPayload;

function getRawSigningSecret(): string | null {
  const secret =
    process.env.AUTH_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null;
  return secret && secret.trim().length >= 16 ? secret.trim() : null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, 'base64'));
}

async function getHmacKey(): Promise<CryptoKey | null> {
  const raw = getRawSigningSecret();
  if (!raw || typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
    return null;
  }
  const enc = new TextEncoder();
  const baseDigest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    enc.encode(`obathaus-session-key-v1:${raw}`)
  );
  return globalThis.crypto.subtle.importKey(
    'raw',
    baseDigest,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signToken(payload: SessionTokenPayload): Promise<string> {
  const key = await getHmacKey();
  if (!key) {
    throw new Error('Server session secret (SUPABASE_SERVICE_ROLE_KEY / AUTH_SESSION_SECRET) is missing.');
  }
  const enc = new TextEncoder();
  const headerB64 = bytesToBase64Url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'OHS' })));
  const payloadB64 = bytesToBase64Url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sigBuf = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(signingInput));
  const sigB64 = bytesToBase64Url(new Uint8Array(sigBuf));
  return `${signingInput}.${sigB64}`;
}

export async function verifyToken<T extends SessionTokenPayload>(
  token?: string | null,
  expectedKind?: T['kind']
): Promise<T | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  if (!headerB64 || !payloadB64 || !sigB64) return null;

  try {
    const key = await getHmacKey();
    if (!key) return null;

    const enc = new TextEncoder();
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigBytes = base64UrlToBytes(sigB64);
    const sigCopy = new Uint8Array(sigBytes.length);
    sigCopy.set(sigBytes);

    const valid = await globalThis.crypto.subtle.verify(
      'HMAC',
      key,
      sigCopy.buffer,
      enc.encode(signingInput)
    );
    if (!valid) return null;

    const jsonStr = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const parsed = JSON.parse(jsonStr) as T;
    if (!parsed || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;
    if (expectedKind && parsed.kind !== expectedKind) return null;
    return parsed;
  } catch {
    return null;
  }
}
