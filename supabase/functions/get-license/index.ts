// Edge Function: Get License
// The browser polls this after returning from Square checkout. The checkout_id
// is a bearer capability (same model as owner tokens) — knowing the uuid you
// were just redirected back with is the authorization.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { verifySupporterToken } from "../_shared/license.ts";
import {
  hashPassportPhrase,
  mintPassportCode,
  mintPassportPhrase,
} from "../_shared/passport.ts";
import {
  isCode,
  parseFourWordPasskey,
} from "../../../utils/softstack-passport/index.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  const jsonHeaders = {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        headers: jsonHeaders,
        status: 400,
      });
    }

    const rawPhrase = typeof body.phrase === "string"
      ? body.phrase.trim()
      : typeof body.code === "string"
      ? body.code.trim()
      : "";

    if (rawPhrase) {
      if (isCode(rawPhrase)) {
        return new Response(
          JSON.stringify({
            error:
              "Enter the 4-word passkey to restore this Passport. The SS- code is a public identifier.",
          }),
          { headers: jsonHeaders, status: 400 },
        );
      }

      const ipLimit = await checkRateLimit(getClientIP(req), {
        scope: "restore-passkey-ip",
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
      });
      if (ipLimit.isLimited) {
        return createRateLimitResponse(ipLimit, getCorsHeaders(req));
      }

      const parsed = parseFourWordPasskey(rawPhrase);
      if (!parsed) {
        return new Response(
          JSON.stringify({
            error: "Enter a valid 4-word passkey.",
          }),
          { headers: jsonHeaders, status: 400 },
        );
      }

      const phraseKey = await hashPassportPhrase(parsed.phrase);
      const phraseLimit = await checkRateLimit(phraseKey || parsed.phrase, {
        scope: "restore-passkey-lockout",
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
      });
      if (phraseLimit.isLimited) {
        return createRateLimitResponse(phraseLimit, getCorsHeaders(req));
      }

      const targetCode = await mintPassportCode(parsed.phrase);
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      const { data: rows, error: listError } = await supabase
        .from("supporter_checkouts")
        .select("checkout_id, status, license")
        .eq("status", "paid")
        .not("license", "is", null)
        .order("paid_at", { ascending: false })
        .limit(500);
      if (listError) throw listError;

      for (const row of rows ?? []) {
        if (!row.license) continue;
        const verified = await verifySupporterToken(row.license);
        if (!verified) continue;
        if (
          verified.phrase === parsed.phrase ||
          verified.code === targetCode ||
          (row.checkout_id &&
            (await mintPassportPhrase(row.checkout_id)) === parsed.phrase)
        ) {
          return new Response(
            JSON.stringify({
              status: "paid",
              license: row.license,
              code: verified.code || targetCode,
              phrase: parsed.phrase,
              name: verified.name || parsed.name,
            }),
            { headers: jsonHeaders },
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Passkey not recognized." }),
        { headers: jsonHeaders, status: 404 },
      );
    }

    // Generous — the client polls every few seconds while Square's webhook
    // lands, but a scanner brute-forcing uuids gets nowhere fast.
    const rateLimitResult = await checkRateLimit(getClientIP(req), {
      scope: "get-license",
      windowMs: 5 * 60 * 1000,
      maxRequests: 60,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const checkoutId = typeof body.checkout_id === "string"
      ? body.checkout_id
      : "";
    if (!UUID_RE.test(checkoutId)) {
      return new Response(JSON.stringify({ error: "checkout_id required" }), {
        headers: jsonHeaders,
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await supabase
      .from("supporter_checkouts")
      .select("status, license")
      .eq("checkout_id", checkoutId)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return new Response(JSON.stringify({ error: "Unknown checkout" }), {
        headers: jsonHeaders,
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({ status: data.status, license: data.license }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error("Get license failed:", error);
    return new Response(
      JSON.stringify({ error: "Could not check the pass. Please try again." }),
      { headers: jsonHeaders, status: 500 },
    );
  }
});
