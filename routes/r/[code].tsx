import { Handlers } from "$fresh/server.ts";
import { getAuthHeaders, getSupabaseUrl } from "../../utils/api.ts";

// Prettier dynamic QR redirect: /r/abc123 instead of /r?code=abc123

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { code } = ctx.params;

    if (!code) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      console.error("SUPABASE_URL not configured");
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Call Supabase edge function to get destination + tier info
    const redirectUrl = `${supabaseUrl}/functions/v1/redirect-qr?code=${code}`;
    const authHeaders = getAuthHeaders();

    try {
      const response = await fetch(redirectUrl, {
        headers: authHeaders,
      });

      // Check if this is a free tier QR (would have X-QRBuddy-Tier header)
      const tier = response.headers.get("X-QRBuddy-Tier") || "pro";
      const destination = response.headers.get("Location") || response.url;

      // If free tier, show interstitial
      if (tier === "free") {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `/go?url=${encodeURIComponent(destination)}&tier=free`,
          },
        });
      }

      // Pro tier: direct redirect
      if (response.redirected || response.headers.get("Location")) {
        return new Response(null, {
          status: 302,
          headers: { Location: destination },
        });
      }

      return response;
    } catch (error) {
      console.error("Redirect error:", error);
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }
  },
};
