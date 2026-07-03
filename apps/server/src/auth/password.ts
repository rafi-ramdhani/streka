import { argon2id } from '@noble/hashes/argon2.js';
import { randomBytes, timingSafeEqual } from 'node:crypto';

// OWASP argon2id baseline. m is memory in KiB (19456 KiB = 19 MiB).
const M = 19456;
const T = 2;
const P = 1;
const DK_LEN = 32;
const SALT_LEN = 16;

const enc = new TextEncoder();
const b64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString('base64');
const unb64 = (s: string): Buffer => Buffer.from(s, 'base64');

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = argon2id(enc.encode(password), salt, { m: M, t: T, p: P, dkLen: DK_LEN });
  return `$argon2id$v=19$m=${M},t=${T},p=${P}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [, algo, , paramStr, saltB64, hashB64] = stored.split('$');
    if (algo !== 'argon2id' || !paramStr || !saltB64 || !hashB64) return false;
    const params = Object.fromEntries(
      paramStr.split(',').map((kv) => kv.split('=')),
    ) as Record<string, string | undefined>;
    const m = Number(params.m);
    const t = Number(params.t);
    const p = Number(params.p);
    if (!m || !t || !p) return false;
    const salt = unb64(saltB64);
    const expected = unb64(hashB64);
    const actual = Buffer.from(
      argon2id(enc.encode(password), salt, { m, t, p, dkLen: expected.length }),
    );
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
