// Client & Server Auth Utility for QRBuddy Recoverable Library
// Lightweight session reader for optional server-library feature flag.

import { IS_BROWSER } from "$fresh/runtime.ts";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
}

const SESSION_STORAGE_KEY = "qrbuddy_auth_session";

/** Check if the Plus Recoverable Library feature flag is enabled.
 * Off by default on both client and server. */
export function isPlusLibraryEnabled(): boolean {
  if (typeof Deno !== "undefined" && typeof Deno.env?.get === "function") {
    if (Deno.env.get("FEATURE_PLUS_LIBRARY") === "true") return true;
  }
  if (typeof globalThis !== "undefined") {
    const g = globalThis as typeof globalThis & {
      __FEATURE_PLUS_LIBRARY__?: boolean;
    };
    if (g.__FEATURE_PLUS_LIBRARY__ === true) return true;
    try {
      if (
        globalThis.localStorage?.getItem("qrb_feature_plus_library") === "true"
      ) {
        return true;
      }
    } catch {
      // Storage unavailable
    }
  }
  return false;
}

/** Get the currently authenticated session from storage. */
export function getCurrentSession(): Promise<AuthSession | null> {
  if (!IS_BROWSER) return Promise.resolve(null);
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_STORAGE_KEY);
    if (!raw) return Promise.resolve(null);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.access_token) {
      return Promise.resolve(parsed as AuthSession);
    }
    return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}

/** Get current user access token for authenticated API headers. */
export async function getUserAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}
