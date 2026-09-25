// API URL utilities for Supabase edge functions that work in both
// server-side (Deno) and client-side (browser) contexts.

import { getSupporterPass } from "./supporter-pass.ts";

declare global {
  interface Window {
    __SUPABASE_URL__?: string;
    __SUPABASE_ANON_KEY__?: string;
  }
}

function resolveSupabaseUrl(): string | null {
  // Prefer env vars when running on the server (Deno/Fresh)
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    const fromEnv = Deno.env.get("SUPABASE_URL");
    if (fromEnv) {
      return fromEnv;
    }
  }

  // Fall back to window-injected global when running in the browser
  if (typeof globalThis !== "undefined") {
    const fromWindow = (globalThis as Window & typeof globalThis)
      .__SUPABASE_URL__;
    if (fromWindow) {
      return fromWindow;
    }
  }

  return null;
}

/**
 * Get the Supabase API URL for edge functions
 * Falls back to local mock API when Supabase is not configured
 * Works in both islands/hooks (client) and routes (server)
 */
export function getApiUrl(): string {
  const supabaseUrl = resolveSupabaseUrl();
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1`;
  }

  // No Supabase URL configured: local dev against the mock API. In a browser
  // on a real domain that's a deploy misconfiguration — fail loud instead of
  // silently pointing every fetch at localhost.
  const hostname = (globalThis as typeof globalThis & { location?: Location })
    .location?.hostname;
  if (
    hostname &&
    hostname !== "localhost" &&
    hostname !== "0.0.0.0" &&
    !hostname.startsWith("127.")
  ) {
    throw new Error(
      "SUPABASE_URL is not configured — refusing to fall back to the local mock API in production",
    );
  }

  return "http://localhost:8005";
}

/**
 * Get the Supabase base URL regardless of execution environment
 */
export function getSupabaseUrl(): string | null {
  return resolveSupabaseUrl();
}

function resolveSupabaseAnonKey(): string | null {
  // Prefer env vars when running on the server (Deno/Fresh)
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    const fromEnv = Deno.env.get("SUPABASE_ANON_KEY");
    if (fromEnv) {
      return fromEnv;
    }
  }

  // Fall back to window-injected global when running in the browser
  if (typeof globalThis !== "undefined") {
    const fromWindow = (globalThis as Window & typeof globalThis)
      .__SUPABASE_ANON_KEY__;
    if (fromWindow) {
      return fromWindow;
    }
  }

  return null;
}

/**
 * Get the Supabase anon key for authorization
 * Works in both islands/hooks (client) and routes (server)
 */
export function getSupabaseAnonKey(): string | null {
  return resolveSupabaseAnonKey();
}

/**
 * fetch() with a hard timeout. Four of the five server-side routes that call
 * a Supabase edge function (r, f/[code], bucket/[code], note/[code]) used a
 * bare `fetch()` with no deadline — a hung edge function hung the page render
 * forever, with no error boundary able to save it because the `await` never
 * returns. One AbortSignal covers all four.
 *
 * `api/download-file.ts` is the fifth call site and deliberately does NOT use
 * this: it streams `response.body` straight through to the client, so the
 * same AbortSignal would cover the whole download, not just the connect — a
 * timeout there would kill a legitimate slow/large file transfer, not just a
 * hang. See the comment at that call site.
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  return await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Get authorization headers for Supabase edge function requests
 */
export function getAuthHeaders(): Record<string, string> {
  const apiKey = getSupabaseAnonKey();
  if (!apiKey) {
    return {};
  }

  const headers: Record<string, string> = {
    "apikey": apiKey,
  };

  // Legacy anon/service-role keys are JWTs and can be used as Bearer tokens.
  // New Supabase publishable keys are opaque and should only be sent as apikey.
  if (apiKey.split(".").length === 3) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  // Supporter pass rides along on every API call (browser only — server-side
  // renders have no localStorage and no business holding a pass).
  const pass = getSupporterPass();
  if (pass) {
    headers["x-qrb-pass"] = pass;
  }

  return headers;
}
