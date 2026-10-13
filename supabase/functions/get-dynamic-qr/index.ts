// Edge Function: Get Dynamic QR Details
// Fetch QR settings by owner token for editing

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    // Rate limiting: 30 requests per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      scope: "get-dynamic-qr",
      windowMs: 60 * 60 * 1000,
      maxRequests: 30,
    });

    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const url = new URL(req.url);
    const ownerToken = url.searchParams.get("token");

    if (!ownerToken) {
      return new Response(
        JSON.stringify({ error: "owner_token is required" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch the dynamic QR record
    const { data, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("owner_token", ownerToken)
      .maybeSingle();

    if (fetchError || !data) {
      return new Response(
        JSON.stringify({
          error: fetchError
            ? "QR settings are temporarily unavailable"
            : "QR code not found",
        }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: fetchError ? 503 : 404,
        },
      );
    }

    const { data: analytics, error: analyticsError } = await supabase
      .rpc("dynamic_qr_analytics", { p_qr_id: data.id });
    if (analyticsError) {
      console.error("QR analytics unavailable:", analyticsError.message);
    }

    // Return QR details + Analytics
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          short_code: data.short_code,
          destination_url: data.destination_url,
          created_at: data.created_at,
          expires_at: data.expires_at,
          max_scans: data.max_scans,
          scan_count: data.scan_count,
          is_active: data.is_active,
          routing_mode: data.routing_mode,
          routing_config: data.routing_config,
          splash_config: data.splash_config ?? null,
          analytics: analyticsError || !analytics
            ? { available: false }
            : analytics,
        },
      }),
      {
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Get dynamic QR failed:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        status: 500,
      },
    );
  }
});
