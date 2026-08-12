// Edge Function: Get License
// The browser polls this after returning from Square checkout. The checkout_id
// is a bearer capability (same model as owner tokens) — knowing the uuid you
// were just redirected back with is the authorization.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  const jsonHeaders = {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
  };

  try {
    // Generous — the client polls every few seconds while Square's webhook
    // lands, but a scanner brute-forcing uuids gets nowhere fast.
    const rateLimitResult = checkRateLimit(getClientIP(req), {
      windowMs: 5 * 60 * 1000,
      maxRequests: 60,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: jsonHeaders,
        status: 400,
      });
    }

    const checkoutId = typeof body.checkout_id === "string"
      ? body.checkout_id
      : "";
    if (!UUID_RE.test(checkoutId)) {
      return new Response(JSON.stringify({ error: "checkout_id required" }), {
        headers: jsonHeaders,
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await supabase
      .from("supporter_checkouts")
      .select("status, license")
      .eq("checkout_id", checkoutId)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ error: "Unknown checkout" }), {
        headers: jsonHeaders,
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({ status: data.status, license: data.license }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Get license failed:", error);
    return new Response(
      JSON.stringify({ error: "Could not check the pass. Please try again." }),
      { headers: jsonHeaders, status: 500 },
    );
  }
});
