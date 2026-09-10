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

    const redirectUrl = `${supabaseUrl}/functions/v1/redirect-qr?code=${
      encodeURIComponent(shortCode)
    }`;

    // Forward scanner client headers to edge function so Device Routing (iOS/Android),
    // Time Routing (local scanner timezone), and IP-based analytics/rate-limiting work accurately.
    const forwardHeaders: Record<string, string> = {
      ...getAuthHeaders(),
    };

    const clientHeaders = [
      "user-agent",
      "cf-connecting-ip",
      "x-forwarded-for",
      "x-real-ip",
      "cf-ipcountry",
      "cf-ipcity",
      "cf-timezone",
      "accept-language",
    ];

    for (const h of clientHeaders) {
      const val = req.headers.get(h);
      if (val) forwardHeaders[h] = val;
    }

    try {
      // Fetch with redirect: "manual" so the Fresh server doesn't proxy the third-party
      // destination website or crash on non-HTTP schemes (mailto:, tel:, sms:, wifi:, etc.)
      const response = await fetch(redirectUrl, {
        headers: forwardHeaders,
        redirect: "manual",
      });

      // Handle redirect responses from edge function (301, 302, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location") ||
          response.headers.get("location");
        if (location) {
          return new Response(null, {
            status: 302,
            headers: { Location: location },
          });
        }
      }

      // Handle HTML responses (e.g. Intro / Splash Page)
      if (response.status === 200) {
        const contentType = response.headers.get("Content-Type") ||
          "text/html; charset=utf-8";
        const body = await response.text();
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
          },
        });
      }

      // Expired / Limit reached / Inactive / Boom
      if (response.status === 410 || response.status === 404) {
        return new Response(null, {
          status: 302,
          headers: { Location: "/boom" },
        });
      }

      // If we got here with any other status, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    } catch (error) {
      console.error("[ROUTE:r] Redirect error:", error);
      // On error, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }
  },
};
