// Client & Server Auth Utility for QRBuddy Recoverable Library (Supabase Auth REST API)
// Uses lightweight native fetch to eliminate node polyfills, CSP violations, and heavy bundles.

import { IS_BROWSER } from "$fresh/runtime.ts";
import { getSupabaseAnonKey, getSupabaseUrl } from "./api.ts";

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

/** Request a 6-digit email OTP for passwordless sign-in via Supabase Auth REST. */
export async function sendEmailOtp(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Please enter a valid email address" };
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    // Local dev without Supabase configured: simulate code delivery
    console.log(`[DEV_AUTH] Mock OTP sent to ${cleanEmail}`);
    return { success: true };
  }

  try {
    const response = await fetch(`${url}/auth/v1/otp`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
        create_user: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.msg || errData.error_description || errData.error ||
          "Failed to send verification code",
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error sending code",
    };
  }
}

/** Verify a 6-digit email OTP code via Supabase Auth REST. */
export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  if (!cleanToken || cleanToken.length < 6) {
    return {
      success: false,
      error: "Please enter the 6-digit verification code",
    };
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    // Local dev mock session
    const mockSession: AuthSession = {
      access_token: `mock_user_jwt_${Date.now()}`,
      user: {
        id: "mock_user_id_" + cleanEmail.replace(/[^a-z0-9]/gi, "_"),
        email: cleanEmail,
      },
    };
    try {
      if (IS_BROWSER) {
        globalThis.localStorage?.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(mockSession),
        );
      }
    } catch {
      // Ignore
    }
    globalThis.dispatchEvent?.(new CustomEvent("qrb-auth-changed"));
    return { success: true, session: mockSession };
  }

  try {
    const response = await fetch(`${url}/auth/v1/verify`, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "email",
        email: cleanEmail,
        token: cleanToken,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errData.msg || errData.error_description || errData.error ||
          "Invalid or expired verification code",
      };
    }

    const data = await response.json();
    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    };

    if (IS_BROWSER) {
      try {
        globalThis.localStorage?.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify(session),
        );
      } catch {
        // Ignore
      }
    }

    globalThis.dispatchEvent?.(new CustomEvent("qrb-auth-changed"));
    return { success: true, session };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to verify code",
    };
  }
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

/** Get current authenticated user. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/** Sign out from current session. */
export function signOutUser(): Promise<void> {
  if (IS_BROWSER) {
    try {
      globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  globalThis.dispatchEvent?.(new CustomEvent("qrb-auth-changed"));
  return Promise.resolve();
}

/** Listen for auth state changes. */
export function onAuthStateChange(
  callback: (session: AuthSession | null) => void,
): () => void {
  if (!IS_BROWSER) return () => {};
  const handler = () => {
    getCurrentSession().then(callback);
  };
  globalThis.addEventListener("qrb-auth-changed", handler);
  return () => {
    globalThis.removeEventListener("qrb-auth-changed", handler);
  };
}
