import crypto from 'node:crypto';

const SCRYPT_PREFIX = 'scrypt$';
const KEY_LEN = 64;

export function isHashedSecret(stored?: string | null): boolean {
  return typeof stored === 'string' && stored.startsWith(SCRYPT_PREFIX);
}

export function hashSecret(plain: string): string {
  const clean = plain.trim();
  if (!clean) {
    throw new Error('Secret tidak boleh kosong.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(clean, salt, KEY_LEN).toString('hex');
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

export function verifySecret(input?: string | null, stored?: string | null): boolean {
  if (typeof input !== 'string' || typeof stored !== 'string') return false;
  const cleanInput = input.trim();
  const cleanStored = stored.trim();
  if (!cleanInput || !cleanStored) return false;

  if (cleanStored.startsWith(SCRYPT_PREFIX)) {
    const parts = cleanStored.split('$');
    if (parts.length !== 3) return false;
    const [, salt, storedHashHex] = parts;
    if (!salt || !storedHashHex) return false;
    try {
      const derived = crypto.scryptSync(cleanInput, salt, KEY_LEN);
      const storedBuf = Buffer.from(storedHashHex, 'hex');
      if (derived.length !== storedBuf.length) return false;
      return crypto.timingSafeEqual(derived, storedBuf);
    } catch {
      return false;
    }
  }

  // Legacy plaintext compatibility (automatically upgraded on successful login)
  const a = Buffer.from(cleanInput, 'utf8');
  const b = Buffer.from(cleanStored, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
