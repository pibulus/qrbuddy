// Shared CORS headers for all QRBuddy edge functions
// Centralized to make CORS policy updates easier

/**
 * Get allowed origin based on environment
 * Production: qrbuddy.deno.dev (or APP_URL if set, e.g. qrbuddy.app once DNS is live)
 * Development: localhost for testing
 */
function getAllowedOrigin(): string {
  // Prefer APP_URL if explicitly set
  const appUrl = Deno.env.get("APP_URL");
  if (appUrl) {
    return appUrl;
  }

  // Check if we're in production (Deno Deploy)
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID");

  if (isProduction) {
    return "https://qrbuddy.deno.dev";
  }

  // Development: allow localhost
  return "http://localhost:8000";
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
};

// Helper to create CORS preflight response
export function createCorsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}
