// Edge Function: library scan stats
//
// One call that answers "how is my shelf of codes doing" — series, top codes,
// devices, countries — scoped to the Passport behind the request.
//
// Everything is pre-aggregated by library_scan_stats(); this function only
// authenticates, bounds the window, and hands the JSON back.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse(req);

  try {
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      scope: "library-stats",
      windowMs: 60 * 60 * 1000,
      maxRequests: 120,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { user, error: authError } = await getAuthenticatedUser(
      req,
      supabase,
    );
    if (!user) {
      return new Response(
        JSON.stringify({
          error: "SIGNIN_REQUIRED",
          message: "Passport required to read scan stats.",
          details: authError,
        }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const url = new URL(req.url);
    const requested = Number(url.searchParams.get("days") ?? DEFAULT_DAYS);
    const days = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_DAYS)
      : DEFAULT_DAYS;

    const { data, error } = await supabase.rpc("library_scan_stats", {
      p_user_id: user.id,
      p_days: days,
    });

    if (error) {
      console.error("library_scan_stats failed:", error.message);
      return new Response(
        JSON.stringify({ error: "Scan stats are temporarily unavailable." }),
        {
          status: 503,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
            "Retry-After": "5",
          },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error(
      "library-stats failed:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
        },
      },
    );
  }
});
