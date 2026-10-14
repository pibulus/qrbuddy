// Shared Supabase Auth & Feature Flag helpers for edge functions

import {
  createClient,
  SupabaseClient,
  User,
} from "https://esm.sh/@supabase/supabase-js@2";

/** Check if the recoverable library & quota foundation feature flag is enabled.
 * Off by default on client and server. */
export function isPlusLibraryEnabled(): boolean {
  return Deno.env.get("FEATURE_PLUS_LIBRARY") === "true";
}

/** Create a service-role Supabase client with full administrative privileges. */
export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/** Extract and verify the authenticated Supabase user from the request Authorization header.
 * Expects 'Authorization: Bearer <user_jwt>'.
 * Returns { user: User, error: null } on success, or { user: null, error: string } on failure. */
export async function getAuthenticatedUser(
  req: Request,
  adminClient?: SupabaseClient,
): Promise<{ user: User | null; error: string | null }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return { user: null, error: "Missing Authorization header" };
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      user: null,
      error: "Invalid Authorization header format. Expected Bearer token.",
    };
  }

  const token = match[1].trim();
  if (!token) {
    return { user: null, error: "Empty Bearer token" };
  }

  try {
    const supabase = adminClient ?? getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return {
        user: null,
        error: error?.message || "Invalid or expired session token",
      };
    }
    return { user: data.user, error: null };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Failed to verify user token",
    };
  }
}
