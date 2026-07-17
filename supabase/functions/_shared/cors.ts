// Shared CORS headers for all QRBuddy edge functions
// Centralized to make CORS policy updates easier

const PROD_ORIGINS = [
  "https://qrbuddy.app",
  "https://www.qrbuddy.app",
  // New Deno Deploy alias (classic's qrbuddy.deno.dev died July 2026)
  "https://qrbuddy.pibulus.deno.net",
];

const DEV_ORIGINS = [
  "http://localhost:8000",
  "http://localhost:8004",
];

// Only allow localhost origins outside production. With Allow-Credentials: true,
// a credentialed localhost origin is a (small) DNS-rebinding surface, so we drop
// it once DENO_DEPLOYMENT_ID is set (i.e. running on Deno Deploy / prod).
const ALLOWED_ORIGINS = Deno.env.get("DENO_DEPLOYMENT_ID")
  ? PROD_ORIGINS
  : [...PROD_ORIGINS, ...DEV_ORIGINS];

/**
 * Match the request Origin against the whitelist.
 * Returns the matched origin (so the browser sees its own origin echoed back)
 * or the primary production origin as a safe default.
 */
export function getAllowedOrigin(request?: Request): string {
  // APP_URL joins the whitelist — it must NOT override it, or secondary
  // origins (the *.deno.net alias, www) can never pass a credentialed
  // preflight and every cross-origin call from them dies.
  const appUrl = Deno.env.get("APP_URL");
  const allowed = appUrl && !ALLOWED_ORIGINS.includes(appUrl)
    ? [appUrl, ...ALLOWED_ORIGINS]
    : ALLOWED_ORIGINS;

  // If we have a request, echo back the origin if it's in our whitelist
  if (request) {
    const origin = request.headers.get("Origin");
    if (origin && allowed.includes(origin)) {
      return origin;
    }
  }

  // No/unknown Origin: prefer the canonical app URL, then platform defaults
  if (appUrl) {
    return appUrl;
  }
  if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
    return "https://qrbuddy.app";
  }

  return "http://localhost:8000";
}

/**
 * Build CORS headers for a given request.
 * Must be called per-request so the Origin header can be matched.
 */
export function getCorsHeaders(request?: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Static fallback for cases where request isn't available (backwards compat)
export const corsHeaders = getCorsHeaders();

// Helper to create CORS preflight response
export function createCorsResponse(request?: Request): Response {
  return new Response("ok", { headers: getCorsHeaders(request) });
}
