// Mint, list and revoke API keys.
// Public route: qrbuddy.app/v1/api-keys → the "api-keys" edge function.
//
// Self-contained on purpose. On this deployment a newly added route that
// imports a newly added module dies before the handler runs (proved
// 2026-11-05: inline /v1/health answered, the same code imported returned 500).
// The duplication is the price of a working public contract; the note lives in
// docs/DEPLOY-RUNBOOK.md.
import { Handlers } from "$fresh/server.ts";

const NAME = "api-keys";
const MAX_BODY_BYTES = 256 * 1024;
const TIMEOUT_MS = 25_000;

function cors(req: Request): Record<string, string> {
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

function reply(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(req) },
  });
}

async function proxy(req: Request): Promise<Response> {
  let supabaseUrl = "";
  let anonKey = "";
  try {
    supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
    anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  } catch {
    return reply(
      { error: "API is not configured on this deployment." },
      503,
      req,
    );
  }
  if (!supabaseUrl) {
    return reply(
      { error: "API is not configured on this deployment." },
      503,
      req,
    );
  }

  const incoming = new URL(req.url);
  const target = new URL(`${supabaseUrl}/functions/v1/${NAME}`);
  target.search = incoming.search;

  const headers: Record<string, string> = {};
  if (anonKey) {
    headers["apikey"] = anonKey;
    if (anonKey.split(".").length === 3) {
      headers["Authorization"] = `Bearer ${anonKey}`;
    }
  }
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

  // The gateway in front of the edge functions checks Authorization for a JWT
  // and rejects anything else before our code runs, so `Bearer qb_…` would die
  // at the door. Rewrite that one case into the header the gateway ignores.
  const bearer = headers["authorization"]?.match(
    /^Bearer\s+(qb_[A-Za-z0-9_-]+)$/i,
  );
  if (bearer) {
    headers["x-api-key"] = bearer[1];
    if (anonKey) {
      headers["Authorization"] = `Bearer ${anonKey}`;
    } else {
      delete headers["authorization"];
    }
  }

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const raw = await req.arrayBuffer();
    if (raw.byteLength > MAX_BODY_BYTES) {
      return reply({ error: "Request body too large (256 KB max)." }, 413, req);
    }
    if (raw.byteLength) body = raw;
  }

  const upstream = await fetch(target.toString(), {
    method: req.method,
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...cors(req),
      "Content-Type": upstream.headers.get("content-type") ??
        "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

async function handle(req: Request): Promise<Response> {
  try {
    return await proxy(req);
  } catch (error) {
    return reply(
      {
        error: "API upstream unavailable. Try again shortly.",
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
      req,
    );
  }
}

export const handler: Handlers = {
  OPTIONS(req) {
    return new Response(null, { status: 204, headers: cors(req) });
  },
  GET: handle,
  POST: handle,
  PATCH: handle,
  PUT: handle,
  DELETE: handle,
};
