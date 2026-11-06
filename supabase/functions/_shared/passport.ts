// SoftStack Passport bridge for edge functions.
// Code and identity helpers are vendored from _shared-modules/passport; this
// file only supplies Web Crypto and the shared secret.

import {
  codeInput,
  formatCode,
  generateMemberIdentity,
  idInput,
  parseFourWordPasskey,
  phraseFromHash,
  phraseInput,
  stampsFor,
} from "../../../utils/softstack-passport/index.js";

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
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(parsed.phrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(`softstack-passkey-v1:${getPassportSecret()}`),
      iterations: 100000,
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

export async function passportIdentity(code: string, phrase?: string) {
  const hash = await sha256Hex(idInput(code));
  return generateMemberIdentity(hash, code, phrase ? { phrase } : {});
}

export function appStamps(app: string): string[] {
  return stampsFor(app);
}
