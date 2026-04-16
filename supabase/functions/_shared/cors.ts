// Shared CORS headers for all QRBuddy edge functions
// Centralized to make CORS policy updates easier

const ALLOWED_ORIGINS = [
  "https://qrbuddy.app",
  "https://qrbuddy.deno.dev",
  "http://localhost:8000",
  "http://localhost:8004",
];

/**
 * Match the request Origin against the whitelist.
 * Returns the matched origin (so the browser sees its own origin echoed back)
 * or the primary production origin as a safe default.
 */
export function getAllowedOrigin(request?: Request): string {
  // APP_URL env var overrides everything (custom domain during migration etc.)
  const appUrl = Deno.env.get("APP_URL");
  if (appUrl) {
    return appUrl;
  }

  // If we have a request, echo back the origin if it's in our whitelist
  if (request) {
    const origin = request.headers.get("Origin");
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return origin;
    }
  }

  // Production fallback
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID");
  if (isProduction) {
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
