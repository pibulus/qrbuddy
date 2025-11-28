// Shared CORS headers for all QRBuddy edge functions
// Centralized to make CORS policy updates easier

/**
 * Get allowed origin based on environment
 * Production: Only qrbuddy.app
 * Development: localhost for testing
 */
function getAllowedOrigin(): string {
  // Check if we're in production (Deno Deploy)
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID");

  if (isProduction) {
    return "https://qrbuddy.app";
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
