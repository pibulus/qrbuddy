// Shared proxy context parser for Supabase Edge Functions.
// QRBuddy's Fresh server (/r) strips cf-* headers (which cause Cloudflare in
// front of *.supabase.co to reject subrequests with HTTP 403) and re-emits
// sanitized x-qrb-* scanner headers authenticated with a SHA-256 proxy proof.

import { timingSafeEqual } from "https://deno.land/std@0.216.0/crypto/timing_safe_equal.ts";

const IPV4_LITERAL_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IP_CHARSET_RE = /^[0-9a-fA-F:.]{3,64}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const TIMEZONE_RE = /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+){0,2}$/;

const proxySignatureCache = new Map<string, Uint8Array>();

export interface ScannerContext {
  ip: string;
  country: string;
  city: string;
  timezone: string | null;
  trustedProxy: boolean;
}

export function sanitizeCityHeader(raw: string | null): string | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const cleaned = decoded
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  if (lower === "xx" || lower === "unknown") return null;
  if (IPV4_LITERAL_RE.test(cleaned)) return null;
  if (cleaned.includes(":") || cleaned.includes("/")) return null;
  return cleaned;
}

export function sanitizeCountryHeader(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!COUNTRY_RE.test(code) || code === "XX" || code === "T1") return null;
  return code;
}

export function sanitizeTimezoneHeader(raw: string | null): string | null {
  if (!raw) return null;
  const tz = raw.trim();
  if (!tz || tz.length > 64 || !TIMEZONE_RE.test(tz)) return null;
  return tz;
}

export function sanitizeIpHeader(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  if (!IP_CHARSET_RE.test(first)) return null;
  if (!first.includes(".") && !first.includes(":")) return null;
  return first;
}

async function expectedSignatureBytes(secret: string): Promise<Uint8Array> {
  const cached = proxySignatureCache.get(secret);
  if (cached) return cached;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`qrb-edge-proxy-v1:${secret}`),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const bytes = new TextEncoder().encode(hex);
  if (proxySignatureCache.size >= 8) proxySignatureCache.clear();
  proxySignatureCache.set(secret, bytes);
  return bytes;
}

export async function isTrustedQrbProxy(req: Request): Promise<boolean> {
  const presented = req.headers.get("x-qrb-proxy-sig")?.trim() ?? "";
  const secret = Deno.env.get("SOFTSTACK_PASSPORT_SECRET")?.trim() ?? "";
  if (!presented || secret.length < 32) return false;
  const providedBytes = new TextEncoder().encode(presented.toLowerCase());
  const expectedBytes = await expectedSignatureBytes(secret);
  return providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes);
}

/**
 * Resolve rate-limiting IP and coarse geo headers, honoring `x-qrb-*` only
 * when signed by QRBuddy's Fresh server and rejecting IP literals in city fields.
 */
export async function resolveScannerContext(
  req: Request,
): Promise<ScannerContext> {
  const trustedProxy = await isTrustedQrbProxy(req);
  const directIp = sanitizeIpHeader(req.headers.get("cf-connecting-ip")) ??
    sanitizeIpHeader(req.headers.get("x-forwarded-for")) ??
    sanitizeIpHeader(req.headers.get("x-real-ip"));
  const proxiedIp = trustedProxy
    ? sanitizeIpHeader(req.headers.get("x-qrb-client-ip"))
    : null;

  const country =
    (trustedProxy
      ? sanitizeCountryHeader(req.headers.get("x-qrb-country"))
      : null) ??
      sanitizeCountryHeader(req.headers.get("cf-ipcountry")) ??
      "Unknown";

  const city =
    (trustedProxy ? sanitizeCityHeader(req.headers.get("x-qrb-city")) : null) ??
      sanitizeCityHeader(req.headers.get("cf-ipcity")) ??
      "Unknown";

  const timezone =
    (trustedProxy
      ? sanitizeTimezoneHeader(req.headers.get("x-qrb-timezone"))
      : null) ??
      sanitizeTimezoneHeader(req.headers.get("cf-timezone"));

  return {
    ip: proxiedIp ?? directIp ?? "unknown",
    country,
    city,
    timezone,
    trustedProxy,
  };
}
