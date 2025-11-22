// API URL utilities for Supabase edge functions

/**
 * Get the Supabase API URL for edge functions
 * Falls back to local dev server if SUPABASE_URL is not set
 * Use this for client-side code (islands, hooks)
 */
export function getApiUrl(): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  return supabaseUrl ? `${supabaseUrl}/functions/v1` : "http://localhost:8005";
}

/**
 * Get the Supabase base URL
 * Returns null if not configured
 * Use this for server-side routes that need to check availability
 */
export function getSupabaseUrl(): string | null {
  return Deno.env.get("SUPABASE_URL") || null;
}
