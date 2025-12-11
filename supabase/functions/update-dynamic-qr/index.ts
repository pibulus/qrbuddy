// Edge Function: Update Dynamic QR
// Edit QR settings using owner token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
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

    if (!owner_token) {
      return new Response(
        JSON.stringify({ error: "owner_token is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
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

    // Validate destination_url if provided
    if (destination_url !== undefined) {
      if (!isValidUrl(destination_url)) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid URL format or protocol. Allowed: HTTP, HTTPS, WIFI, MAILTO, TEL, SMS, FACETIME.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    // Validate routing_config URLs if provided
    if (routing_config !== undefined) {
      try {
        const config = typeof routing_config === "string"
          ? JSON.parse(routing_config)
          : routing_config;

        // Validate all URLs in routing config
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
                headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    // Build update object (only update provided fields)
    const updates: Record<string, string | number | null | object> = {};
    if (destination_url !== undefined) {
      updates.destination_url = destination_url;
    }
    if (max_scans !== undefined) updates.max_scans = max_scans;
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (is_active !== undefined) updates.is_active = is_active;
    if (routing_mode !== undefined) updates.routing_mode = routing_mode;
    if (routing_config !== undefined) updates.routing_config = routing_config;
    if (splash_config !== undefined) updates.splash_config = splash_config;

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Update dynamic QR failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
