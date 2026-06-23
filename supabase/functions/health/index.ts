// Edge Function: Health Check
// Returns the status of the system (Database, Storage)

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const startTime = Date.now();

    // Check Database liveness only. We deliberately do NOT call
    // storage.listBuckets() here: this endpoint is unauthenticated, and there
    // is no reason to run a service-role storage enumeration on every public
    // ping. A lightweight head-count against an indexed table is enough to
    // tell whether the backend is reachable, and the result is not exposed.
    const { error: dbError } = await supabase.from("file_buckets").select(
      "count",
      { count: "exact", head: true },
    );
    const dbLatency = Date.now() - startTime;

    const status = {
      status: !dbError ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbError ? "down" : "up",
          latency_ms: dbLatency,
        },
      },
      version: "1.0.0",
    };

    return new Response(
      JSON.stringify(status),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: status.status === "healthy" ? 200 : 503,
      },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
