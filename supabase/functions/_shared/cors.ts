// Shared CORS headers for all QRBuddy edge functions
// Centralized to make CORS policy updates easier

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Helper to create CORS preflight response
export function createCorsResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}
