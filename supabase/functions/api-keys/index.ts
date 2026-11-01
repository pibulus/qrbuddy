// Edge Function: API keys
//
// Mint, list and revoke Business Passport API keys. The plaintext key is
// returned exactly once, by the POST that created it — after that only its
// prefix is ever readable, because only the hash is stored.
//
// Auth: a Passport (`x-passport-id`) or a Supabase user JWT. A key cannot mint
// another key, so a leaked key has no way to outlive its revocation.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { getAuthenticatedUser } from "../_shared/auth.ts";
import { generateApiKey, keyPrefix, sha256Hex } from "../_shared/api-keys.ts";

const MAX_KEYS_PER_USER = 10;
const MAX_NAME_LENGTH = 60;

function json(
  body: unknown,
  status: number,
  req: Request,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
      ...extraHeaders,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse(req);

  try {
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      scope: "api-keys",
      windowMs: 60 * 60 * 1000,
      maxRequests: 60,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { user, error: authError } = await getAuthenticatedUser(
      req,
      supabase,
    );
    if (!user) {
      return json(
        {
          error: "SIGNIN_REQUIRED",
          message: "Sign in with your Passport to manage API keys.",
          details: authError,
        },
        401,
        req,
      );
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, prefix, name, created_at, last_used_at, revoked_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return json({ success: true, keys: data ?? [] }, 200, req);
    }

    if (req.method === "POST") {
      let name = "";
      try {
        const body = await req.json();
        name = typeof body?.name === "string" ? body.name.trim() : "";
      } catch {
        name = "";
      }
      if (name.length > MAX_NAME_LENGTH) name = name.slice(0, MAX_NAME_LENGTH);

      const { count, error: countError } = await supabase
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("revoked_at", null);

      if (countError) throw countError;
      if ((count ?? 0) >= MAX_KEYS_PER_USER) {
        return json(
          {
            error: "KEY_LIMIT",
            message:
              `Up to ${MAX_KEYS_PER_USER} active keys. Revoke one you no longer use.`,
          },
          402,
          req,
        );
      }

      const rawKey = generateApiKey();
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          key_hash: await sha256Hex(rawKey),
          prefix: keyPrefix(rawKey),
          name: name || null,
        })
        .select("id, prefix, name, created_at")
        .single();

      if (error) throw error;

      // The only time the plaintext exists outside the caller's hands.
      return json(
        { success: true, key: rawKey, record: data },
        201,
        req,
        { "X-Key-Notice": "shown-once" },
      );
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id is required" }, 400, req);

      const { data, error } = await supabase
        .from("api_keys")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return json({ error: "Key not found" }, 404, req);

      return json({ success: true, revoked: data.id }, 200, req);
    }

    return json({ error: "Method not allowed" }, 405, req);
  } catch (error) {
    console.error(
      "API keys function failed:",
      error instanceof Error ? error.message : String(error),
    );
    return json(
      { error: "An unexpected error occurred. Please try again." },
      500,
      req,
    );
  }
});
