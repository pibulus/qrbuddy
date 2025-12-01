// Edge Function: Create File Bucket
// Creates a persistent QR bucket for file/text/link storage

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
    // Rate limiting: 10 bucket creations per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
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
      bucket_type = "file", // 'file', 'text', 'link'
      style = "sunset",
      password,
      is_reusable = true,
    } = body;

    // Validate bucket type
    if (!["file", "text", "link"].includes(bucket_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket_type" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Generate unique short code
    let bucketCode = generateShortCode();
    let attempts = 0;

    // Ensure uniqueness (max 10 attempts)
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("file_buckets")
        .select("bucket_code")
        .eq("bucket_code", bucketCode)
        .single();

      if (!existing) break;
      bucketCode = generateShortCode();
      attempts++;
    }

    const ownerToken = generateOwnerToken();

    // Hash owner token for storage (SHA-256)
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(ownerToken);
    const tokenHashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHashArray = Array.from(new Uint8Array(tokenHashBuffer));
    const ownerTokenHash = tokenHashArray.map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash password if provided (Salted SHA-256)
    let passwordHash = null;
    if (password) {
      // Generate random salt
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt).map((b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      const encoder = new TextEncoder();
      const data = encoder.encode(saltHex + password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Store as salt:hash
      passwordHash = `${saltHex}:${hashHex}`;
    }

    // Create bucket record
    // Store HASHED token in owner_token column
    const { error: insertError } = await supabase
      .from("file_buckets")
      .insert({
        bucket_code: bucketCode,
        owner_token: ownerTokenHash, // Store hash, return raw token to user
        bucket_type,
        style,
        is_password_protected: !!password,
        password_hash: passwordHash,
        is_reusable,
        is_empty: true,
      });

    if (insertError) throw insertError;

    const baseUrl = Deno.env.get("APP_URL") ||
      (Deno.env.get("DENO_DEPLOYMENT_ID")
        ? "https://qrbuddy.app"
        : "http://localhost:8000");

    return new Response(
      JSON.stringify({
        success: true,
        bucket_code: bucketCode,
        bucket_url: `${baseUrl}/bucket/${bucketCode}`,
        owner_token: ownerToken,
        bucket_type,
        style,
        is_empty: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[SECURITY] Create bucket failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

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
