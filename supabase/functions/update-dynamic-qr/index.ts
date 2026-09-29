// Edge Function: Update Dynamic QR
// Edit QR settings using owner token

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { validateSplashConfig } from "../_shared/splash-validation.ts";
import { validateRoutingConfig } from "../_shared/routing-config.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    // Rate limiting: 30 updates per hour per IP
    // Owner token required, but rate limit prevents token brute-force
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 30,
    });

    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }
    const {
      owner_token,
      destination_url,
      max_scans,
      expires_at,
      is_active,
      routing_mode,
      routing_config,
      splash_config,
    } = body;

    // Same write-time guards as create-dynamic-qr: an unparseable expires_at
    // silently never expires, a non-positive max_scans bricks the QR.
    if (expires_at && isNaN(new Date(expires_at).getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid expires_at — must be a valid date" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }
    if (
      max_scans !== undefined && max_scans !== null &&
      (!Number.isInteger(max_scans) || max_scans < 1)
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid max_scans — must be a positive integer",
        }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }
    if (!owner_token) {
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

    // Verify owner token exists
    const { data: existing, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("owner_token", owner_token)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: "Invalid owner token" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 404,
        },
      );
    }

    // Helper function to normalize and validate URLs
    const normalizeUrl = (url: string): string => {
      const trimmed = url.trim();
      if (!trimmed) return "";
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        return trimmed;
      }
      return `https://${trimmed}`;
    };

    const isValidUrl = (url: string): boolean => {
      try {
        const normalized = normalizeUrl(url);
        const parsed = new URL(normalized);
        return [
          "http:",
          "https:",
          "wifi:",
          "mailto:",
          "tel:",
          "sms:",
          "facetime:",
        ].includes(parsed.protocol);
      } catch {
        return false;
      }
    };

    let finalDestinationUrl: string | undefined = undefined;
    if (destination_url !== undefined) {
      if (typeof destination_url !== "string" || !isValidUrl(destination_url)) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid URL format or protocol. Allowed: HTTP, HTTPS, WIFI, MAILTO, TEL, SMS, FACETIME.",
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 400,
          },
        );
      }
      finalDestinationUrl = normalizeUrl(destination_url);
    }

    const routingFieldsTouched = routing_mode !== undefined ||
      routing_config !== undefined;
    let routingCheck: ReturnType<typeof validateRoutingConfig> | null = null;
    if (routingFieldsTouched) {
      const nextMode = routing_mode === undefined
        ? existing.routing_mode ?? "simple"
        : routing_mode;
      let nextConfig = routing_config === undefined
        ? existing.routing_config
        : routing_config;
      // Switching back to simple mode intentionally discards advanced settings.
      if (routing_mode === "simple" && routing_config === undefined) {
        nextConfig = null;
      }

      routingCheck = validateRoutingConfig(nextMode, nextConfig);
      if (!routingCheck.ok) {
        return new Response(
          JSON.stringify({ error: routingCheck.error }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 400,
          },
        );
      }
    }

    // Validate splash_config if provided (it gets rendered into HTML on scan).
    let validatedSplash: object | null = null;
    if (splash_config !== undefined) {
      const splashCheck = validateSplashConfig(splash_config);
      if (!splashCheck.ok) {
        return new Response(
          JSON.stringify({ error: splashCheck.error }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 400,
          },
        );
      }
      validatedSplash = splashCheck.value;
    }

    // Build update object (only update provided fields)
    const updates: Record<string, string | number | null | object> = {};
    if (finalDestinationUrl !== undefined) {
      updates.destination_url = finalDestinationUrl;
    }
    if (max_scans !== undefined) updates.max_scans = max_scans;
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (is_active !== undefined) updates.is_active = is_active;
    if (routingCheck?.ok) {
      updates.routing_mode = routingCheck.mode;
      updates.routing_config = routingCheck.value;
    }
    if (splash_config !== undefined) updates.splash_config = validatedSplash;

    // Update the record
    const { data, error: updateError } = await supabase
      .from("dynamic_qr_codes")
      .update(updates)
      .eq("owner_token", owner_token)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          short_code: data.short_code,
          destination_url: data.destination_url,
          scan_count: data.scan_count,
          max_scans: data.max_scans,
          expires_at: data.expires_at,
          is_active: data.is_active,
          created_at: data.created_at,
          routing_mode: data.routing_mode,
          routing_config: data.routing_config,
          splash_config: data.splash_config ?? null,
        },
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Update dynamic QR failed:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
