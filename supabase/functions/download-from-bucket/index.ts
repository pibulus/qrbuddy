// Edge Function: Download from Bucket
// Downloads content from bucket and empties it (if configured)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";

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
    // Rate limiting: 100 downloads per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100,
    });

    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const url = new URL(req.url);
    const bucketCode = url.searchParams.get("bucket_code");
    const password = url.searchParams.get("password");

    if (!bucketCode) {
      return new Response(
        JSON.stringify({ error: "bucket_code required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Get bucket
    const { data: bucket, error: bucketError } = await supabase
      .from("file_buckets")
      .select("*")
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

    // Check if bucket is empty
    if (bucket.is_empty) {
      return new Response(
        JSON.stringify({ error: "Bucket is empty" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Check password if protected
    if (bucket.is_password_protected) {
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          },
        );
      }

      // Hash provided password and compare
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (passwordHash !== bucket.password_hash) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          },
        );
      }
    }

    let responseData: any = null;
    let responseHeaders: any = { ...corsHeaders };

    // Handle different content types
    if (bucket.content_type === "file") {
      // Download file from storage
      const storagePath = bucket.content_metadata.storage_path;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("qr-files")
        .download(storagePath);

      if (downloadError) throw downloadError;

      // Empty bucket and delete file if not reusable
      if (!bucket.is_reusable) {
        await supabase.storage.from("qr-files").remove([storagePath]);
        await supabase.from("file_buckets").delete().eq("id", bucket.id);
      } else {
        await supabase
          .from("file_buckets")
          .update({
            content_type: null,
            content_data: null,
            content_metadata: null,
            is_empty: true,
            last_emptied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      }

      // Return file
      responseHeaders["Content-Type"] = bucket.content_metadata.mimetype;
      responseHeaders["Content-Disposition"] =
        `attachment; filename="${bucket.content_metadata.filename}"`;
      responseHeaders["X-Bucket-Emptied"] = "true";
      responseHeaders["X-Bucket-Reusable"] = bucket.is_reusable.toString();

      return new Response(fileData, { headers: responseHeaders });
    } else if (bucket.content_type === "text" || bucket.content_type === "link") {
      // Return text or link as JSON
      responseData = {
        success: true,
        content_type: bucket.content_type,
        content: bucket.content_data,
        metadata: bucket.content_metadata,
      };

      // Empty bucket if not reusable
      if (!bucket.is_reusable) {
        await supabase.from("file_buckets").delete().eq("id", bucket.id);
      } else {
        await supabase
          .from("file_buckets")
          .update({
            content_type: null,
            content_data: null,
            content_metadata: null,
            is_empty: true,
            last_emptied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      }

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown content type" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error("Download from bucket failed:", error);
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
