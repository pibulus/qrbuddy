// Edge Function: Update Dynamic QR
// Edit QR settings using owner token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json();
    const {
      owner_token,
      destination_url,
      max_scans,
      expires_at,
      is_active,
    } = body;

    if (!owner_token) {
      return new Response(
        JSON.stringify({ error: "owner_token is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Verify owner token exists
    const { data: existing, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("owner_token", owner_token)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: "Invalid owner token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Build update object (only update provided fields)
    const updates: Record<string, string | number | null> = {};
    if (destination_url !== undefined) {
      updates.destination_url = destination_url;
    }
    if (max_scans !== undefined) updates.max_scans = max_scans;
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update the record
    const { data, error: updateError } = await supabase
      .from("dynamic_qr_codes")
      .update(updates)
      .eq("owner_token", owner_token)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          short_code: data.short_code,
          destination_url: data.destination_url,
          scan_count: data.scan_count,
          max_scans: data.max_scans,
          expires_at: data.expires_at,
          is_active: data.is_active,
          created_at: data.created_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Update dynamic QR failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
