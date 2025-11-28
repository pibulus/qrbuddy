// API URL utilities for Supabase edge functions that work in both
// server-side (Deno) and client-side (browser) contexts.

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

  // When no Supabase URL is configured, default to the local mock API
  // (used in development without Supabase).
  if (typeof globalThis !== "undefined" && "location" in globalThis) {
    const hostname = (globalThis as typeof globalThis & { location?: Location })
      .location?.hostname;
    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname?.startsWith("127.")
    ) {
      return "http://localhost:8005";
    }
  }

  // Production fallback (should rarely be hit): assume same-origin edge
  // function proxy is unavailable and tell the caller to use local mock.
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
 * Get authorization headers for Supabase edge function requests
 */
export function getAuthHeaders(): Record<string, string> {
  const anonKey = getSupabaseAnonKey();
  if (anonKey) {
    return {
      "Authorization": `Bearer ${anonKey}`,
      "apikey": anonKey,
    };
  }
  return {};
}
