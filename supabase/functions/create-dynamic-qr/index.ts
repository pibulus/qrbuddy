// Edge Function: Create Dynamic QR
// Generates editable QR redirect with owner token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Generate short code (6 chars, URL-safe)
function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
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
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting: 20 QR creations per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20,
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
      destination_url,
      max_scans,
      expires_at,
      password_hash,
      routing_mode,
      routing_config,
    } = body;

    if (!destination_url) {
      return new Response(
        JSON.stringify({ error: "destination_url is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Validate URL format and protocol to prevent XSS via javascript: or data: URLs
    try {
      const url = new URL(destination_url);
      const allowedProtocols = ["http:", "https:"];
      if (!allowedProtocols.includes(url.protocol)) {
        return new Response(
          JSON.stringify({
            error:
              `Invalid URL protocol. Only HTTP and HTTPS are allowed. Received: ${url.protocol}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    } catch (urlError) {
      return new Response(
        JSON.stringify({
          error: `Invalid URL format: ${
            urlError instanceof Error ? urlError.message : String(urlError)
          }`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Create dynamic QR failed:", error);
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
