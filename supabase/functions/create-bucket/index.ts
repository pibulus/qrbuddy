// Edge Function: Create File Bucket
// Creates a persistent QR bucket for file/text/link storage

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

// Generate short code (6 chars, URL-safe).
// Uses crypto.getRandomValues (not Math.random) so codes aren't predictable
// from generation time. Rejection sampling avoids modulo bias on the 36-char
// alphabet (256 % 36 != 0). The code is a public-ish shareable id, not the
// auth boundary (that's the crypto.randomUUID owner token), but unguessable
// is still the right default.
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
    // Rate limiting: 10 bucket creations per hour per IP
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

    // Abuse guard only. Do not permanently block an IP from creating lockers:
    // lockers have no owner account delete flow, so an "active locker" cap
    // becomes a permanent product break after a few experiments.
    const dailyWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString();
    const { count: dailyLockers, error: countError } = await supabase
      .from("file_buckets")
      .select("*", { count: "exact", head: true })
      .eq("creator_ip", clientIP)
      .gte("created_at", dailyWindowStart);

    if (countError) {
      console.error("Failed to check locker limit:", countError);
      // Fail open or closed? Let's fail open but log it, or fail closed for security.
      // Let's fail closed to be safe against abuse.
      throw new Error("System busy, please try again.");
    }

    if (dailyLockers !== null && dailyLockers >= 25) {
      return new Response(
        JSON.stringify({
          error: "Daily locker limit reached. Try again tomorrow.",
        }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 403,
        },
      );
    }

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
      bucket_type = "file", // 'file', 'text', 'link'
      style = "sunset",
      password,
      is_reusable = true,
      delete_on_download = false,
    } = body;

    // Validate bucket type
    if (!["file", "text", "link"].includes(bucket_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket_type" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
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
    const ownerTokenHash = tokenHashArray.map((b) =>
      b.toString(16).padStart(2, "0")
    )
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
        delete_on_download,
        is_empty: true,
        creator_ip: clientIP,
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
        owner_token: ownerToken, // ⚠️ KEEP SECURE: This token allows full control (edit/delete) of the bucket. Do not expose to public.
        bucket_type,
        style,
        is_empty: true,
        delete_on_download,
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
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
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
