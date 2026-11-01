// API proxy core — one function, several tiny route files.
//
// `qrbuddy.app/api/<function>` forwards to the matching Supabase edge function
// so the API lives on our own domain: one predictable host for integrators,
// and a subdomain can be pointed at it later without reissuing printed codes.
//
// Why explicit route files instead of `routes/api/[fn].ts`: the dynamic
// segment built and worked locally, then failed on Deno Deploy before the
// handler was ever reached (Cloudflare 520 / x-deno-error 500). Named routes
// also make the public contract readable — the file list *is* the API.

import type { Handlers } from "$fresh/server.ts";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
]);

const MAX_BODY_BYTES = 256 * 1024;
const UPSTREAM_TIMEOUT_MS = 25_000;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = origin === "https://qrbuddy.app" ||
      origin === "http://localhost:8004"
    ? origin
    : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-api-key, x-passport-id, content-type, apikey",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  req: Request,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(req),
      ...extra,
    },
  });
}

function resolveSupabaseUrl(): string {
  try {
    const fromEnv = Deno.env.get("SUPABASE_URL") ?? "";
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
  } catch {
    // Not Deno, or no env permission: reported as unconfigured below.
  }
  return "";
}

function resolveAnonKey(): string {
  try {
    return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  } catch {
    return "";
  }
}

async function forward(req: Request, name: string): Promise<Response> {
  const supabaseUrl = resolveSupabaseUrl();
  if (!supabaseUrl) {
    return json(
      { error: "API is not configured on this deployment." },
      503,
      req,
    );
  }

  const incoming = new URL(req.url);
  const target = new URL(`${supabaseUrl}/functions/v1/${name}`);
  target.search = incoming.search;

  const headers: Record<string, string> = {};
  const anonKey = resolveAnonKey();
  if (anonKey) {
    headers["apikey"] = anonKey;
    if (anonKey.split(".").length === 3) {
      headers["Authorization"] = `Bearer ${anonKey}`;
    }
  }

  // The caller's own credentials always win over ours.
  for (
    const key of [
      "authorization",
      "x-api-key",
      "x-passport-id",
      "x-qrb-pass",
      "content-type",
      "user-agent",
      "accept",
    ]
  ) {
    const value = req.headers.get(key);
    if (value) headers[key] = value;
  }

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await req.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
      return json({ error: "Request body too large (256 KB max)." }, 413, req);
    }
    if (raw.byteLength) body = raw;
  }

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  const responseHeaders = new Headers(corsHeaders(req));
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "content-encoding") continue;
    responseHeaders.set(key, value);
  }
  responseHeaders.set("Cache-Control", "no-store, max-age=0");

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

/** Build a Fresh handler that proxies one named edge function. */
export function makeApiHandler(name: string): Handlers {
  const call = async (req: Request): Promise<Response> => {
    try {
      return await forward(req, name);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`[API proxy] ${name} failed:`, detail);
      return json(
        { error: "API upstream unavailable. Try again shortly.", detail },
        502,
        req,
        { "Retry-After": "5" },
      );
    }
  };

  return {
    OPTIONS(req) {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    },
    GET: call,
    POST: call,
    PATCH: call,
    PUT: call,
    DELETE: call,
  };
}
