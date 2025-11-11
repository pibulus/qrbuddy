// Edge Function: Get Bucket Status
// Returns bucket metadata and state without downloading content

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

    const url = new URL(req.url);
    const bucketCode = url.searchParams.get("bucket_code");

    if (!bucketCode) {
      return new Response(
        JSON.stringify({ error: "bucket_code required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get bucket (without sensitive data)
    const { data: bucket, error: bucketError } = await supabase
      .from("file_buckets")
      .select(`
        bucket_code,
        bucket_type,
        style,
        is_password_protected,
        is_reusable,
        content_type,
        content_metadata,
        is_empty,
        last_filled_at,
        last_emptied_at,
        created_at
      `)
      .eq("bucket_code", bucketCode)
      .single();

    if (bucketError || !bucket) {
      return new Response(
        JSON.stringify({ error: "Bucket not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bucket: {
          bucket_code: bucket.bucket_code,
          bucket_type: bucket.bucket_type,
          style: bucket.style,
          is_password_protected: bucket.is_password_protected,
          is_reusable: bucket.is_reusable,
          is_empty: bucket.is_empty,
          content_type: bucket.content_type,
          content_metadata: bucket.content_metadata,
          last_filled_at: bucket.last_filled_at,
          last_emptied_at: bucket.last_emptied_at,
          created_at: bucket.created_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Get bucket status failed:", error);
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
