// Edge Function: Create Dynamic QR
// Generates editable QR redirect with owner token

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { validateSplashConfig } from "../_shared/splash-validation.ts";

// Generate short code (6 chars, URL-safe).
// Uses crypto.getRandomValues (not Math.random) so codes aren't predictable
// from generation time. Rejection sampling avoids modulo bias on the 36-char
// alphabet (256 % 36 != 0).
function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const max = Math.floor(256 / chars.length) * chars.length; // 252
  let code = "";
  while (code.length < 6) {
    const buf = crypto.getRandomValues(new Uint8Array(6 - code.length));
    for (const b of buf) {
      if (b < max) code += chars[b % chars.length];
    }
  }
  return code;
}

// Generate owner token (32 chars, secure)
function generateOwnerToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    // Rate limiting: 10 QR creations per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
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
      destination_url,
      max_scans,
      expires_at,
      password_hash,
      routing_mode,
      routing_config,
      splash_config,
    } = body;

    // Validate the optional knobs so garbage can't silently disable controls:
    // an unparseable expires_at never expires (every comparison against an
    // Invalid Date is false) and a non-positive max_scans kills the QR on its
    // first scan while the create response happily echoes it back.
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

    if (!destination_url) {
      return new Response(
        JSON.stringify({ error: "destination_url is required" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }

    // Validate splash_config before it gets stored + rendered into HTML later.
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

    // Helper function to validate URLs
    // Relaxed validation to allow "weird utility" protocols
    const isValidUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
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

    // Validate destination_url format and protocol
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

    // Validate routing_config URLs if provided
    if (routing_config) {
      try {
        const config = typeof routing_config === "string"
          ? JSON.parse(routing_config)
          : routing_config;

        const urlsToValidate: string[] = [];

        // Sequential mode: validate all URLs in array
        if (config.urls && Array.isArray(config.urls)) {
          urlsToValidate.push(...config.urls);
        }

        // Device mode: validate ios, android, fallback
        if (config.ios) urlsToValidate.push(config.ios);
        if (config.android) urlsToValidate.push(config.android);
        if (config.fallback) urlsToValidate.push(config.fallback);

        // Time mode: validate activeUrl, inactiveUrl
        if (config.activeUrl) urlsToValidate.push(config.activeUrl);
        if (config.inactiveUrl) urlsToValidate.push(config.inactiveUrl);

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

    // Generate unique short code
    let shortCode = generateShortCode();
    let attempts = 0;

    // Ensure uniqueness (max 10 attempts)
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("dynamic_qr_codes")
        .select("short_code")
        .eq("short_code", shortCode)
        .single();

      if (!existing) break;
      shortCode = generateShortCode();
      attempts++;
    }

    const ownerToken = generateOwnerToken();

    // Create dynamic QR record
    const { error: insertError } = await supabase
      .from("dynamic_qr_codes")
      .insert({
        short_code: shortCode,
        destination_url,
        max_scans: max_scans || null,
        expires_at: expires_at || null,
        password_hash: password_hash || null,
        routing_mode: routing_mode || "simple",
        routing_config: routing_config || null,
        splash_config: splashCheck.value,
        owner_token: ownerToken,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Use APP_URL from environment, fallback to localhost for dev
    const baseUrl = Deno.env.get("APP_URL") ||
      (Deno.env.get("DENO_DEPLOYMENT_ID")
        ? "https://qrbuddy.app"
        : "http://localhost:8000");

    return new Response(
      JSON.stringify({
        success: true,
        short_code: shortCode,
        redirect_url: `${baseUrl}/r?code=${shortCode}`,
        edit_url: `${baseUrl}/edit?token=${ownerToken}`,
        owner_token: ownerToken,
        scan_count: 0,
        max_scans: max_scans || null,
        expires_at: expires_at || null,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[SECURITY] Create dynamic QR failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
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
