import { Handlers } from "$fresh/server.ts";

// This route handles QR code redirects
// It forwards to the Supabase edge function which manages the actual redirect logic

export const handler: Handlers = {
  async GET(req, ctx) {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
      "https://rckahvngsukzkmbpaejs.supabase.co";

    const redirectUrl = `${supabaseUrl}/functions/v1/redirect-qr?code=${shortCode}`;

    try {
      // Fetch from edge function to get the actual redirect
      const response = await fetch(redirectUrl);

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
