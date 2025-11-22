// Edge Function: Dynamic QR Redirect
// Privacy-first editable redirects with NO tracking/analytics

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
    // Rate limiting: 100 redirects per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    });

    if (rateLimitResult.isLimited) {
      // For redirects, we return JSON rather than redirecting
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");

    if (!shortCode) {
      return new Response("No short code provided", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch the dynamic QR record
    const { data: qr, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("short_code", shortCode)
      .single();

    if (fetchError || !qr) {
      // QR doesn't exist - redirect to home
      return Response.redirect("/", 302);
    }

    // Check if QR is active
    if (!qr.is_active) {
      return Response.redirect("/boom", 302);
    }

    // Check if expired
    if (qr.expires_at) {
      const now = new Date();
      const expiry = new Date(qr.expires_at);
      if (now > expiry) {
        // Mark as inactive and redirect to KABOOM
        await supabase
          .from("dynamic_qr_codes")
          .update({ is_active: false })
          .eq("short_code", shortCode);
        return Response.redirect("/boom", 302);
      }
    }

    // Check if max scans reached
    if (qr.max_scans && qr.scan_count >= qr.max_scans) {
      // Mark as inactive and redirect to KABOOM
      await supabase
        .from("dynamic_qr_codes")
        .update({ is_active: false })
        .eq("short_code", shortCode);
      return Response.redirect("/boom", 302);
    }

    // Increment scan count (no other tracking!)
    await supabase
      .from("dynamic_qr_codes")
      .update({ scan_count: qr.scan_count + 1 })
      .eq("short_code", shortCode);

    // Redirect to destination
    return Response.redirect(qr.destination_url, 302);
  } catch (error) {
    console.error("Redirect failed:", error);
    return Response.redirect("/", 302);
  }
});
