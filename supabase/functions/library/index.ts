// Edge Function: Library
// Provides authenticated access to user's saved dynamic QR codes, quota inspection,
// and legacy code claiming. Requires Supabase Auth user JWT.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { getAuthenticatedUser, isPlusLibraryEnabled } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (!isPlusLibraryEnabled()) {
    return new Response(
      JSON.stringify({
        error: "FEATURE_DISABLED",
        message: "Library feature is not active",
      }),
      { headers: jsonHeaders, status: 404 },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { user, error: authError } = await getAuthenticatedUser(req, supabase);
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "UNAUTHORIZED",
        message: "Authentication required to access library.",
        details: authError,
      }),
      { headers: jsonHeaders, status: 401 },
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  try {
    // 1. Quota check: GET /library/quota
    if (req.method === "GET" && path.endsWith("/quota")) {
      const { data: quota, error: quotaError } = await supabase.rpc(
        "get_library_quota",
        { p_user_id: user.id },
      );
      if (quotaError) throw quotaError;

      return new Response(
        JSON.stringify({ success: true, quota }),
        { headers: jsonHeaders },
      );
    }

    // 2. Claim legacy grandfathered code: POST /library/claim-legacy
    if (req.method === "POST" && path.endsWith("/claim-legacy")) {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: "INVALID_JSON",
            message: "Invalid JSON body",
          }),
          { headers: jsonHeaders, status: 400 },
        );
      }

      const { owner_token, title } = body;
      if (
        !owner_token || typeof owner_token !== "string" || !owner_token.trim()
      ) {
        return new Response(
          JSON.stringify({
            error: "MISSING_TOKEN",
            message: "owner_token is required",
          }),
          { headers: jsonHeaders, status: 400 },
        );
      }

      const { data: claimResult, error: claimError } = await supabase.rpc(
        "claim_legacy_qr_code",
        {
          p_user_id: user.id,
          p_owner_token: owner_token.trim(),
          p_title: typeof title === "string" ? title.trim() : null,
        },
      );

      if (claimError) throw claimError;

      if (!claimResult?.success) {
        const statusCode = claimResult?.error === "NOT_FOUND"
          ? 404
          : claimResult?.error === "ALREADY_CLAIMED"
          ? 409
          : 400;

        return new Response(
          JSON.stringify(claimResult),
          { headers: jsonHeaders, status: statusCode },
        );
      }

      return new Response(
        JSON.stringify(claimResult),
        { headers: jsonHeaders },
      );
    }

    // 3. List codes: GET /library
    if (req.method === "GET") {
      const search = url.searchParams.get("search")?.trim() || "";
      const limit = Math.min(
        Math.max(1, parseInt(url.searchParams.get("limit") || "100", 10)),
        100,
      );
      const offset = Math.max(
        0,
        parseInt(url.searchParams.get("offset") || "0", 10),
      );

      let query = supabase
        .from("dynamic_qr_codes")
        .select(
          "id, short_code, destination_url, title, created_at, expires_at, max_scans, scan_count, is_active, is_legacy, routing_mode",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        // Safe parameterised substring match on title or destination_url
        query = query.or(
          `title.ilike.%${search}%,destination_url.ilike.%${search}%`,
        );
      }

      const [
        { data: codes, error: codesError },
        { data: quota, error: quotaError },
      ] = await Promise.all([
        query,
        supabase.rpc("get_library_quota", { p_user_id: user.id }),
      ]);

      if (codesError) throw codesError;
      if (quotaError) throw quotaError;

      const baseUrl = Deno.env.get("APP_URL") ||
        (Deno.env.get("DENO_DEPLOYMENT_ID")
          ? "https://qrbuddy.app"
          : "http://localhost:8000");

      const enrichedCodes = (codes || []).map((code) => ({
        ...code,
        redirect_url: `${baseUrl}/r?code=${code.short_code}`,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          codes: enrichedCodes,
          quota,
          pagination: {
            offset,
            limit,
            count: enrichedCodes.length,
          },
        }),
        { headers: jsonHeaders },
      );
    }

    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      { headers: jsonHeaders, status: 405 },
    );
  } catch (err) {
    console.error("[LIBRARY_ERROR]", err);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message:
          "An unexpected error occurred while processing library request",
      }),
      { headers: jsonHeaders, status: 500 },
    );
  }
});
