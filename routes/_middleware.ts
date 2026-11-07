import { FreshContext } from "$fresh/server.ts";
import { getSupabaseUrl } from "../utils/api.ts";

/**
 * Security headers on every response.
 *
 * QRBuddy was serving NONE of these — not even HSTS. Added 2026-07-31.
 * CSP added 2026-08-12, Playwright-verified against the running app
 * (every style preset, custom gradient, wasm scan-check, Ko-fi embed).
 *
 * X-Frame-Options is DENY here, unlike ProMapper's SAMEORIGIN. QRBuddy embeds
 * Ko-fi in an iframe (islands/KofiModal.tsx), but that direction is governed by
 * Ko-fi's headers, not ours — this header only controls who may frame QRBuddy,
 * and nothing needs to.
 *
 * CSP notes (each entry earns its place):
 * - script-src 'unsafe-inline': Fresh's hydration state + _app's env script +
 *   the JSON-LD block are all inline without nonces; nonce-ifying Fresh 1.x
 *   isn't worth the surgery. External scripts stay pinned to two origins.
 * - 'wasm-unsafe-eval': zxing-wasm powers the scannability honesty check.
 *   The binary itself is vendored at /zxing_reader.wasm (self), no CDN.
 * - connect-src: Supabase origin comes from the live env var so prod/dev
 *   agree; umami's cloud script beacons to gateway.umami.is (Playwright
 *   caught this — docs say api-gateway.umami.dev, the wire says otherwise).
 * - img-src data: blob:: logo uploads + qr-code-styling's export path.
 * - Cloudflare injects its Web Analytics beacon (cookieless) on the zone; the
 *   script and its beacon endpoint are allowlisted so the console stays clean.
 * - frame-src ko-fi.com: the support widget iframe.
 * - connect-src R2: supporter big files PUT/GET straight to Cloudflare R2 via
 *   presigned URLs (utils/r2-upload.ts). The account ID isn't a secret — it's
 *   in every presigned URL we hand out.
 */
const SCRIPT_ORIGINS =
  "https://cloud.umami.is https://fleetcount.pibulus.deno.net https://static.cloudflareinsights.com";

const R2_ORIGIN =
  "https://c5a72aa2df2ddaa73fe129888a3d3402.r2.cloudflarestorage.com";

function buildCsp(): string {
  const supabase = getSupabaseUrl() ?? "https://*.supabase.co";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${SCRIPT_ORIGINS}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `media-src 'self' blob: ${R2_ORIGIN}`,
    `connect-src 'self' data: blob: ${supabase} ${R2_ORIGIN} https://cloud.umami.is https://gateway.umami.is https://fleetcount.pibulus.deno.net https://cloudflareinsights.com`,
    "frame-src https://ko-fi.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const NOINDEX_PATH_RE =
  /^\/(?:r|q|edit|boom|api(?:\/|$)|f\/|bucket\/|note\/)(?:\/|$)/;

export const LEGACY_REDIRECTS: Readonly<Record<string, string>> = {
  "/gs1": "/for/gs1",
  "/inspect": "/for/inspect",
  "/lockers": "/for/lockers",
  "/menus": "/for/menus",
  "/music": "/for/music",
  "/vcard": "/for/vcard",
  "/weddings": "/for/weddings",
  "/wifi": "/for/wifi",
  "/why": "/compare",
  "/for/restaurants": "/for/menus",
  "/es/por-que": "/es/comparar",
  "/es/restaurantes": "/es/menus",
};

export async function handler(req: Request, ctx: FreshContext) {
  let pathname = "";
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    // Ignore malformed URLs
  }

  const normalizedPath = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const redirectTarget = (req.method === "GET" || req.method === "HEAD")
    ? LEGACY_REDIRECTS[normalizedPath]
    : undefined;

  const resp = redirectTarget
    ? new Response(null, {
      status: 301,
      headers: { Location: redirectTarget },
    })
    : await ctx.next();

  resp.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("Content-Security-Policy", buildCsp());

  // A 404 caught mid-deploy must never be cached: Cloudflare would pin the
  // missing asset for days and break hydration on that edge. Failures are
  // transient by definition.
  if (resp.status >= 400) {
    resp.headers.set("Cache-Control", "no-store, max-age=0");
    resp.headers.set("CDN-Cache-Control", "no-store");
  }

  if (pathname && NOINDEX_PATH_RE.test(pathname)) {
    resp.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return resp;
}
