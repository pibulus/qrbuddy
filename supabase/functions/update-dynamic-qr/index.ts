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
    if (
      routing_mode &&
      !["simple", "sequential", "device", "time"].includes(routing_mode)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid routing_mode — must be simple, sequential, device, or time",
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
      if (!isValidUrl(destination_url)) {
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

    let finalRoutingConfig = routing_config;
    // Validate routing_config URLs if provided
    if (routing_config !== undefined && routing_config !== null) {
      try {
        const config = typeof routing_config === "string"
          ? JSON.parse(routing_config)
          : { ...routing_config };

        // Validate all URLs in routing config
        const urlsToValidate: string[] = [];

        // Sequential mode: validate and normalize all URLs in array
        if (config.urls && Array.isArray(config.urls)) {
          config.urls = config.urls.map((u: string) => normalizeUrl(u)).filter(
            (u: string) => u.trim() !== "",
          );
          urlsToValidate.push(...config.urls);
        }

        // Device mode: validate and normalize ios, android, fallback
        if (config.ios) {
          config.ios = normalizeUrl(config.ios);
          urlsToValidate.push(config.ios);
        }
        if (config.android) {
          config.android = normalizeUrl(config.android);
          urlsToValidate.push(config.android);
        }
        if (config.fallback) {
          config.fallback = normalizeUrl(config.fallback);
          urlsToValidate.push(config.fallback);
        }

        // Time mode: validate and normalize activeUrl, inactiveUrl
        if (config.activeUrl) {
          config.activeUrl = normalizeUrl(config.activeUrl);
          urlsToValidate.push(config.activeUrl);
        }
        if (config.inactiveUrl) {
          config.inactiveUrl = normalizeUrl(config.inactiveUrl);
          urlsToValidate.push(config.inactiveUrl);
        }

        // Check all URLs
        for (const url of urlsToValidate) {
          if (url && !isValidUrl(url)) {
            return new Response(
              JSON.stringify({
                error:
                  `Invalid URL in routing config: ${url}. Allowed: HTTP, HTTPS, WIFI, MAILTO, TEL, SMS, FACETIME.`,
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
        }

        finalRoutingConfig = config;
      } catch (_parseError) {
        return new Response(
          JSON.stringify({
            error: "Invalid routing_config format",
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
    if (routing_mode !== undefined) updates.routing_mode = routing_mode;
    if (routing_config !== undefined) {
      updates.routing_config = finalRoutingConfig;
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
