import { Handlers } from "$fresh/server.ts";
import { getAuthHeaders, getSupabaseUrl } from "../utils/api.ts";

// This route handles QR code redirects
// It forwards to the Supabase edge function which manages the actual redirect logic

export const handler: Handlers = {
  async GET(req, _ctx) {
    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");

    if (!shortCode) {
      // No code provided, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Forward to Supabase edge function for redirect logic
    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      console.error("SUPABASE_URL not configured");
      // Redirect to home if Supabase not configured
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    const redirectUrl =
      `${supabaseUrl}/functions/v1/redirect-qr?code=${shortCode}`;
    const authHeaders = getAuthHeaders();

    try {
      // Fetch from edge function to get the actual redirect
      const response = await fetch(redirectUrl, {
        headers: authHeaders,
      });

      if (response.redirected) {
        // If edge function redirected, follow it
        return new Response(null, {
          status: 302,
          headers: { Location: response.url },
        });
      }

      // Otherwise pass through the response
      return response;
    } catch (error) {
      console.error("Redirect error:", error);
      // On error, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }
  },
};
