// Edge Function: Get Dynamic QR Details
// Fetch QR settings by owner token for editing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ownerToken = url.searchParams.get("token");

    if (!ownerToken) {
      return new Response(
        JSON.stringify({ error: "owner_token is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch the dynamic QR record
    const { data, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("owner_token", ownerToken)
      .single();

    if (fetchError || !data) {
      return new Response(
        JSON.stringify({ error: "QR code not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Fetch analytics (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs, error: _logsError } = await supabase
      .from("scan_logs")
      .select("scanned_at, device_type, os")
      .eq("qr_id", data.id)
      .gte("scanned_at", sevenDaysAgo.toISOString())
      .order("scanned_at", { ascending: true });

    // Process logs for sparkline
    const sparklineData = new Array(7).fill(0);
    const today = new Date();

    logs?.forEach((log: { scanned_at: string }) => {
      const logDate = new Date(log.scanned_at);
      const diffTime = Math.abs(today.getTime() - logDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        sparklineData[6 - diffDays]++;
      }
    });

    // Get last scan time
    const lastScan = logs && logs.length > 0
      ? logs[logs.length - 1].scanned_at
      : null;

    // Device stats
    const deviceStats = { ios: 0, android: 0, desktop: 0, other: 0 };
    logs?.forEach((log: { os: string; device_type: string }) => {
      if (log.os === "ios") deviceStats.ios++;
      else if (log.os === "android") deviceStats.android++;
      else if (log.device_type === "desktop") deviceStats.desktop++;
      else deviceStats.other++;
    });

    // Return QR details + Analytics
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          short_code: data.short_code,
          destination_url: data.destination_url,
          created_at: data.created_at,
          expires_at: data.expires_at,
          max_scans: data.max_scans,
          scan_count: data.scan_count,
          is_active: data.is_active,
          routing_mode: data.routing_mode,
          routing_config: data.routing_config,
          analytics: {
            sparkline: sparklineData,
            last_scan: lastScan,
            devices: deviceStats,
          },
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Get dynamic QR failed:", error);
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
