const IPV4_LITERAL_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IP_CHARSET_RE = /^[0-9a-fA-F:.]{3,64}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const TIMEZONE_RE = /^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+){0,2}$/;

const proxySignatureCache = new Map<string, string>();

/**
 * Strip IP literals, control characters, and unknown markers from an edge city header.
 */
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

/**
 * Validate ISO 3166-1 alpha-2 country header, dropping unknown ("XX", "T1") markers.
 */
export function sanitizeCountryHeader(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!COUNTRY_RE.test(code) || code === "XX" || code === "T1") return null;
  return code;
}

/**
 * Validate an IANA-style timezone identifier forwarded from the origin edge.
 */
export function sanitizeTimezoneHeader(raw: string | null): string | null {
  if (!raw) return null;
  const tz = raw.trim();
  if (!tz || tz.length > 64 || !TIMEZONE_RE.test(tz)) return null;
  return tz;
}

/**
 * Extract the leading IP literal from single or comma-separated IP headers.
 */
export function sanitizeIpHeader(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim() ?? "";
  if (!IP_CHARSET_RE.test(first)) return null;
  if (!first.includes(".") && !first.includes(":")) return null;
  return first;
}

/**
 * Compute the keyed SHA-256 proxy proof so edge functions only trust `x-qrb-*`
 * scanner metadata emitted by QRBuddy's own origin proxy.
 */
export async function computeProxySignature(secret: string): Promise<string> {
  const cached = proxySignatureCache.get(secret);
  if (cached) return cached;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`qrb-edge-proxy-v1:${secret}`),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (proxySignatureCache.size >= 8) proxySignatureCache.clear();
  proxySignatureCache.set(secret, hex);
  return hex;
}

/**
 * Build upstream headers for `redirect-qr` without forwarding any `cf-*` or raw
 * `x-forwarded-for` headers that cause Cloudflare in front of `*.supabase.co`
 * to reject subrequests with HTTP 403 ("DNS points to prohibited IP").
 */
export async function buildRedirectUpstreamHeaders(
  req: Request,
  authHeaders: Record<string, string>,
  extraHeaders: Record<string, string> = {},
  proxySecret?: string,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...authHeaders,
    ...extraHeaders,
  };

  const ua = req.headers.get("user-agent");
  if (ua) headers["user-agent"] = ua.slice(0, 500);

  const acceptLang = req.headers.get("accept-language");
  if (acceptLang) headers["accept-language"] = acceptLang.slice(0, 120);

  const clientIp = sanitizeIpHeader(req.headers.get("cf-connecting-ip")) ??
    sanitizeIpHeader(req.headers.get("x-real-ip")) ??
    sanitizeIpHeader(req.headers.get("x-forwarded-for"));
  if (clientIp) headers["x-qrb-client-ip"] = clientIp;

  const country = sanitizeCountryHeader(req.headers.get("cf-ipcountry"));
  if (country) headers["x-qrb-country"] = country;

  const city = sanitizeCityHeader(req.headers.get("cf-ipcity"));
  if (city) headers["x-qrb-city"] = city;

  const timezone = sanitizeTimezoneHeader(req.headers.get("cf-timezone"));
  if (timezone) headers["x-qrb-timezone"] = timezone;

  const trimmedSecret = proxySecret?.trim() ?? "";
  if (trimmedSecret.length >= 32) {
    headers["x-qrb-proxy-sig"] = await computeProxySignature(trimmedSecret);
  }

  return headers;
}
