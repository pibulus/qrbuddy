// Edge Function: Download from Bucket
// Downloads content from bucket and empties it (if configured)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";

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
    let bucketCode: string | null = null;
    let password: string | null = null;

    // Support both GET (for non-password) and POST (for password security)
    if (req.method === "POST") {
      const body = await req.json();
      bucketCode = body.bucket_code || null;
      password = body.password || null; // Password from body (secure)
    } else {
      bucketCode = url.searchParams.get("bucket_code");
      password = url.searchParams.get("password"); // Legacy: password in URL (insecure, deprecated)
    }

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

    const responseHeaders: Record<string, string> = { ...corsHeaders };

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
    } else if (
      bucket.content_type === "text" || bucket.content_type === "link"
    ) {
      // Return text or link as JSON
      const payload = {
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
        JSON.stringify(payload),
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
