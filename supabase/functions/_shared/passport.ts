// SoftStack Passport bridge for edge functions.
// Code and identity helpers are vendored from _shared-modules/passport; this
// file only supplies Web Crypto and the shared secret.

import {
  codeInput,
  formatCode,
  generateMemberIdentity,
  idInput,
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

/** Deterministic per checkout: the same seed always mints the same code. */
export async function mintPassportCode(seed: string): Promise<string> {
  const hex = await hmacHex(codeInput(seed), getPassportSecret());
  return formatCode(hex.slice(0, 12));
}

export async function passportIdentity(code: string) {
  const hash = await sha256Hex(idInput(code));
  return generateMemberIdentity(hash, code);
}

export function appStamps(app: string): string[] {
  return stampsFor(app);
}
