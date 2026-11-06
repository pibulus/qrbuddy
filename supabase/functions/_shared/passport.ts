// SoftStack Passport bridge for edge functions.
// Code and identity helpers are vendored from _shared-modules/passport; this
// file only supplies Web Crypto and the shared secret.

import {
  codeInput,
  formatCode,
  generateMemberIdentity,
  getSyncRoomId,
  idInput,
  kdfInput,
  parseFourWordPasskey,
  PASSKEY_INDEX_ITERATIONS,
  passkeyIndexSalt,
  phraseFromHash,
  phraseInput,
  stampsFor,
} from "../../../utils/softstack-passport/index.js";

export function uuidFromPassportSecret(secret: string): string {
  const clean = secret.trim().toLowerCase();
  const hex = getSyncRoomId(`qrbuddy-passport-id:${clean}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${
    hex.slice(17, 20)
  }-${hex.slice(20, 32)}`;
}

export function getPassportSecret(): string {
  const secret = Deno.env.get("SOFTSTACK_PASSPORT_SECRET")?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error("SOFTSTACK_PASSPORT_SECRET is not configured");
  }
  return secret;
}

const encoder = new TextEncoder();

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Deterministic per checkout: the same seed always mints the same 4-word root phrase. */
export async function mintPassportPhrase(seed: string): Promise<string> {
  const parsed = parseFourWordPasskey(seed);
  if (parsed) return parsed.phrase;
  const hex = await hmacHex(phraseInput(seed), getPassportSecret());
  return phraseFromHash(hex);
}

/** Deterministic one-way derivation: phrase -> SS-XXXX-XXXX-XXXX public handle. */
export async function mintPassportCode(seedOrPhrase: string): Promise<string> {
  const phrase = await mintPassportPhrase(seedOrPhrase);
  const hex = await hmacHex(codeInput(phrase), getPassportSecret());
  return formatCode(hex.slice(0, 12));
}

/** PBKDF2-SHA256 (100k iterations) passkey hash for rate-limiting and indexing. */
export async function hashPassportPhrase(phrase: string): Promise<string> {
  const parsed = parseFourWordPasskey(phrase);
  if (!parsed) return "";
  const secret = getPassportSecret();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(kdfInput(parsed.phrase)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(passkeyIndexSalt(secret)),
      iterations: PASSKEY_INDEX_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return Array.from(
    new Uint8Array(bits),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}

const PASSKEY_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const PASSKEY_LOCKOUT_MAX_MISSES = 5;
const passkeyMissCounters = new Map<
  string,
  { misses: number; resetTime: number }
>();

export function isPasskeyPhraseLockedOut(
  phraseKey: string,
  now = Date.now(),
): {
  isLimited: boolean;
  retryAfter: number;
  resetTime: number;
  limit: number;
} {
  const entry = passkeyMissCounters.get(phraseKey);
  if (!entry || now >= entry.resetTime) {
    if (entry) passkeyMissCounters.delete(phraseKey);
    return {
      isLimited: false,
      retryAfter: 0,
      resetTime: now + PASSKEY_LOCKOUT_WINDOW_MS,
      limit: PASSKEY_LOCKOUT_MAX_MISSES,
    };
  }
  const isLimited = entry.misses >= PASSKEY_LOCKOUT_MAX_MISSES;
  return {
    isLimited,
    retryAfter: isLimited
      ? Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
      : 0,
    resetTime: entry.resetTime,
    limit: PASSKEY_LOCKOUT_MAX_MISSES,
  };
}

export function recordPasskeyPhraseMiss(
  phraseKey: string,
  now = Date.now(),
): {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
  retryAfter?: number;
} {
  const existing = passkeyMissCounters.get(phraseKey);
  const entry = !existing || now >= existing.resetTime
    ? { misses: 0, resetTime: now + PASSKEY_LOCKOUT_WINDOW_MS }
    : existing;
  entry.misses += 1;
  passkeyMissCounters.set(phraseKey, entry);
  const isLimited = entry.misses > PASSKEY_LOCKOUT_MAX_MISSES;
  return {
    isLimited,
    remaining: Math.max(0, PASSKEY_LOCKOUT_MAX_MISSES - entry.misses),
    resetTime: entry.resetTime,
    limit: PASSKEY_LOCKOUT_MAX_MISSES,
    ...(isLimited
      ? { retryAfter: Math.max(1, Math.ceil((entry.resetTime - now) / 1000)) }
      : {}),
  };
}

export function resetPasskeyPhraseMisses(phraseKey?: string): void {
  if (phraseKey) {
    passkeyMissCounters.delete(phraseKey);
  } else {
    passkeyMissCounters.clear();
  }
}

export async function passportIdentity(code: string, phrase?: string) {
  const hash = await sha256Hex(idInput(code));
  return generateMemberIdentity(hash, code, phrase ? { phrase } : {});
}

export function appStamps(app: string): string[] {
  return stampsFor(app);
}
