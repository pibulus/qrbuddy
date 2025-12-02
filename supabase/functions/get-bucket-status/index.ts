// Edge Function: Get Bucket Status
// Returns bucket metadata and state without downloading content

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

    // Get bucket (without sensitive data initially)
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
        created_at,
        owner_token,
        password_hash,
        delete_on_download
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

    // Check authorization for full metadata
    const ownerToken = url.searchParams.get("owner_token");
    const password = url.searchParams.get("password"); // Optional: allow password to unlock metadata

    let isAuthorized = false;

    // Check owner token
    if (ownerToken) {
      if (bucket.owner_token.length === 64) {
        // Hash check
        const encoder = new TextEncoder();
        const data = encoder.encode(ownerToken);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (hashHex === bucket.owner_token) isAuthorized = true;
      } else {
        // Legacy check
        if (bucket.owner_token === ownerToken) isAuthorized = true;
      }
    }

    // Check password (if provided and bucket is protected)
    if (
      !isAuthorized && password && bucket.is_password_protected &&
      bucket.password_hash
    ) {
      const encoder = new TextEncoder();

      if (bucket.password_hash.includes(":")) {
        // New Salted Hash
        const [saltHex, storedHash] = bucket.password_hash.split(":");
        const data = encoder.encode(saltHex + password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const computedHash = hashArray.map((b) =>
          b.toString(16).padStart(2, "0")
        ).join("");
        if (computedHash === storedHash) isAuthorized = true;
      } else {
        // Legacy Unsalted Hash
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map((b) =>
          b.toString(16).padStart(2, "0")
        ).join("");
        if (passwordHash === bucket.password_hash) isAuthorized = true;
      }
    }

    // Redact metadata if not authorized and bucket is password protected
    // If it's NOT password protected, maybe we still want to hide filenames?
    // The plan says: "At minimum omit filenames for password-protected buckets."
    // Let's be safe: if password protected and not authorized, redact content_metadata.

    let safeMetadata = bucket.content_metadata;
    if (bucket.is_password_protected && !isAuthorized) {
      safeMetadata = null; // Hide all metadata (filename, size, mimetype)
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
          delete_on_download: bucket.delete_on_download,
          is_empty: bucket.is_empty,
          content_type: bucket.content_type,
          content_metadata: safeMetadata,
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
