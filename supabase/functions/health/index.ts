// Edge Function: Health Check
// Returns the status of the system (Database, Storage)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

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

    const startTime = Date.now();

    // 1. Check Database
    const { error: dbError } = await supabase.from("file_buckets").select("count", { count: "exact", head: true });
    const dbLatency = Date.now() - startTime;

    // 2. Check Storage (List buckets)
    const storageStart = Date.now();
    const { error: storageError } = await supabase.storage.listBuckets();
    const storageLatency = Date.now() - storageStart;

    const status = {
      status: !dbError && !storageError ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbError ? "down" : "up",
          latency_ms: dbLatency,
          error: dbError?.message,
        },
        storage: {
          status: storageError ? "down" : "up",
          latency_ms: storageLatency,
          error: storageError?.message,
        },
      },
      version: "1.0.0",
    };

    return new Response(
      JSON.stringify(status),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: status.status === "healthy" ? 200 : 503,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
