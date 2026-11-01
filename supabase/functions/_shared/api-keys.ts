// Shared API-key helpers.
//
// A key is `qb_` + 32 random bytes in base64url. Only its SHA-256 is stored, so
// the plaintext exists exactly once: in the response that created it.
//
// The key is not a new identity. Resolving a key returns the Passport user id
// it belongs to, which means every existing quota, ownership and rate rule
// applies unchanged — an API key can never do more than its Passport can.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const API_KEY_PREFIX = "qb_";

export function isApiKey(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().startsWith(API_KEY_PREFIX);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** The short, non-secret label shown in the UI: `qb_AbCdEf…`. */
export function keyPrefix(key: string): string {
  return key.slice(0, 2 + 8);
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${API_KEY_PREFIX}${encoded}`;
}

/**
 * Find the Passport behind a raw key. Returns null for unknown or revoked
 * keys. `last_used_at` is refreshed fire-and-forget: a stale timestamp is a
 * cosmetic problem, a slow redirect is a real one.
 */
export async function resolveApiKey(
  supabase: SupabaseClient,
  rawKey: string,
): Promise<{ userId: string; keyId: string } | null> {
  const key = rawKey.trim();
  if (!isApiKey(key) || key.length < 20 || key.length > 200) return null;

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", await sha256Hex(key))
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(({ error: touchError }) => {
      if (touchError) {
        console.error("api_keys touch failed:", touchError.message);
      }
    });

  return { userId: data.user_id as string, keyId: data.id as string };
}
