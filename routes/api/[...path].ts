// Public API surface: qrbuddy.app/api/<function>
//
// Forwards to the Supabase edge functions so the API lives on our own domain.
// That matters commercially: a business integrating this sees one predictable
// host now, and can later point their own subdomain at it — their printed codes
// and their integrations never expose a third-party hostname.
//
// Deliberately dumb: no rewriting, no auth logic of its own. Every rule stays
// in the function, so the API and the app can never disagree about who may do
// what.

import { Handlers } from "$fresh/server.ts";
import {
  fetchWithTimeout,
  getAuthHeaders,
  getSupabaseUrl,
} from "../../utils/api.ts";

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

const handlerValue: Handlers = {
  OPTIONS(req) {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  },

  async GET(req, ctx) {
    return await proxy(req, ctx.params.path ?? "");
  },
  async POST(req, ctx) {
    return await proxy(req, ctx.params.path ?? "");
  },
  async PATCH(req, ctx) {
    return await proxy(req, ctx.params.path ?? "");
  },
  async PUT(req, ctx) {
    return await proxy(req, ctx.params.path ?? "");
  },
  async DELETE(req, ctx) {
    return await proxy(req, ctx.params.path ?? "");
  },
};

async function proxy(req: Request, path: string): Promise<Response> {
  // Validate the path before anything else: a malformed endpoint must be a 404
  // whether or not this deployment happens to have a backend configured.
  const name = path.replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(name)) {
    return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    return new Response(
      JSON.stringify({ error: "API is not configured on this deployment." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders(req) },
      },
    );
  }

  const incoming = new URL(req.url);
  const target = new URL(`${supabaseUrl}/functions/v1/${name}`);
  target.search = incoming.search;

  const headers: Record<string, string> = { ...getAuthHeaders() };

  for (const [key, value] of req.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      HOP_BY_HOP.has(lower) || lower === "host" || lower === "content-length"
    ) {
      continue;
    }
    // Keep the caller's own credentials and content type.
    if (
      lower === "authorization" || lower === "x-api-key" ||
      lower === "x-passport-id" || lower === "content-type" ||
      lower === "user-agent" || lower === "accept"
    ) {
      headers[lower] = value;
    }
  }

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await req.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: "Request body too large (256 KB max)." }),
        {
          status: 413,
          headers: { "Content-Type": "application/json", ...corsHeaders(req) },
        },
      );
    }
    body = raw.byteLength ? raw : undefined;
  }

  try {
    const upstream = await fetchWithTimeout(target.toString(), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(corsHeaders(req));
    for (const [key, value] of upstream.headers.entries()) {
      const lower = key.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === "content-encoding") continue;
      responseHeaders.set(key, value);
    }
    responseHeaders.set("Cache-Control", "no-store, max-age=0");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API proxy] upstream failed:", error);
    return new Response(
      JSON.stringify({ error: "API upstream unavailable. Try again shortly." }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "5",
          ...corsHeaders(req),
        },
      },
    );
  }
}

export const handler = handlerValue;
