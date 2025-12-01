// Edge Function: Upload to Bucket
// Uploads content (file/text/link) to a file bucket

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateFile } from "../_shared/file-validation.ts";

type BucketContentMetadata = Record<string, unknown>;
type UploadContentType = "file" | "text" | "link";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting: 15 uploads per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 15,
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
    const ownerToken = url.searchParams.get("owner_token");

    if (!bucketCode || !ownerToken) {
      return new Response(
        JSON.stringify({ error: "bucket_code and owner_token required" }),
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
        JSON.stringify({ error: "Invalid bucket" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Verify owner token
    // We support both legacy (plain text) and new (hashed) tokens
    // If bucket.owner_token is 32 chars (hex), it might be a legacy token or a hash?
    // Actually, legacy tokens were UUIDs without hyphens (32 chars hex).
    // SHA-256 hash is 64 chars hex.
    
    let isTokenValid = false;
    
    if (bucket.owner_token.length === 64) {
      // It's a hash, verify incoming token
      const encoder = new TextEncoder();
      const data = encoder.encode(ownerToken);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      isTokenValid = hashHex === bucket.owner_token;
    } else {
      // Legacy plain text token
      isTokenValid = bucket.owner_token === ownerToken;
    }

    if (!isTokenValid) {
       return new Response(
        JSON.stringify({ error: "Invalid owner token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    // Check if bucket is already full
    if (!bucket.is_empty) {
      return new Response(
        JSON.stringify({
          error: "Bucket is full. Download current content first.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let contentData: string | null = null;
    let contentMetadata: BucketContentMetadata = {};
    let uploadedContentType: UploadContentType = "text";

    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Upload file to storage
      const fileId = crypto.randomUUID();
      const fileName = `bucket-${bucketCode}-${fileId}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("qr-files")
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      contentData = fileId;
      uploadedContentType = "file";
      contentMetadata = {
        filename: file.name,
        size: file.size,
        mimetype: file.type,
        storage_path: fileName,
      };
    } else {
      // Handle text or link (JSON)
      const body = await req.json();
      const { type, content } = body;

      if (!type || !content) {
        return new Response(
          JSON.stringify({ error: "type and content required" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      if (type === "text") {
        contentData = content;
        uploadedContentType = "text";
        contentMetadata = { length: content.length };
      } else if (type === "link") {
        contentData = content;
        uploadedContentType = "link";
        contentMetadata = { url: content };
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid type. Must be 'text' or 'link'" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    // Update bucket with content
    const { error: updateError } = await supabase
      .from("file_buckets")
      .update({
        content_type: uploadedContentType,
        content_data: contentData,
        content_metadata: contentMetadata,
        is_empty: false,
        last_filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bucket.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Content uploaded to bucket",
        content_type: uploadedContentType,
        is_empty: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Upload to bucket failed:", error);
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
