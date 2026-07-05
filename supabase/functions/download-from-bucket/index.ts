// Edge Function: Download from Bucket
// Downloads content from bucket and empties it (if configured)

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

function safeDownloadFilename(filename: unknown): string {
  const fallback = "download";
  if (typeof filename !== "string" || filename.trim() === "") return fallback;
  return filename.replace(/[\r\n"\\]/g, "_");
}

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(value),
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(
  storedHash: string | null,
  incomingPassword: string | null,
): Promise<boolean> {
  if (!storedHash || !incomingPassword) return false;

  if (storedHash.includes(":")) {
    const [saltHex, hashHex] = storedHash.split(":");
    return (await sha256Hex(saltHex + incomingPassword)) === hashHex;
  }

  return (await sha256Hex(incomingPassword)) === storedHash;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  // Hoisted so the catch block can release the claim slot if delivery fails
  // after claiming (otherwise a transient storage error locks a one-time or
  // ping-pong bucket for a minute via the download_started_at guard).
  let claimedBucketId: string | null = null;

  try {
    // Rate limiting: 50 downloads per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50,
    });

    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
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
      let body: { bucket_code?: string; password?: string };
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 400,
          },
        );
      }
      bucketCode = body.bucket_code || null;
      password = body.password || null; // Password from body (secure)
    } else {
      bucketCode = url.searchParams.get("bucket_code");
      // REMOVED: password from URL query params
      // password = url.searchParams.get("password");
    }

    if (!bucketCode) {
      return new Response(
        JSON.stringify({ error: "bucket_code required" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 400,
        },
      );
    }

    const { data: bucketAuth, error: authFetchError } = await supabase
      .from("file_buckets")
      .select("is_password_protected, password_hash")
      .eq("bucket_code", bucketCode)
      .maybeSingle();

    if (authFetchError) {
      console.error("Bucket auth fetch error:", authFetchError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 500,
        },
      );
    }

    if (!bucketAuth) {
      return new Response(
        JSON.stringify({ error: "Bucket not found, empty, or busy" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 404,
        },
      );
    }

    if (bucketAuth.is_password_protected) {
      if (req.method !== "POST") {
        return new Response(
          JSON.stringify({
            error: "Password protected buckets require POST request",
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 405,
          },
        );
      }

      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password required" }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 401,
          },
        );
      }

      if (!(await verifyPassword(bucketAuth.password_hash, password))) {
        return new Response(
          JSON.stringify({ error: "Invalid password" }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
            status: 401,
          },
        );
      }
    }

    // Atomic Claim (Fixes Race Condition)
    const { data: bucket, error: bucketError } = await supabase
      .rpc("claim_bucket_download", { p_bucket_code: bucketCode })
      // deno-lint-ignore no-explicit-any
      .maybeSingle<any>(); // Cast to any or specific interface to fix TS errors

    if (bucketError) {
      console.error("RPC Error:", bucketError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 500,
        },
      );
    }

    if (!bucket) {
      // Could be not found, locked, or empty
      // We can do a secondary check to see WHICH it is, but for security/speed, generic 404/400 is fine.
      // But let's check if it exists but is empty for better error message?
      // For now, "Bucket not found or unavailable"
      return new Response(
        JSON.stringify({ error: "Bucket not found, empty, or busy" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 404,
        },
      );
    }

    // Claim succeeded — remember it so a later failure can release the slot.
    claimedBucketId = bucket.id;

    const responseHeaders: Record<string, string> = { ...getCorsHeaders(req) };

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
      } else if (bucket.delete_on_download) {
        // Ping Pong Mode: Delete content but keep bucket
        await supabase.storage.from("qr-files").remove([storagePath]);
        await supabase
          .from("file_buckets")
          .update({
            content_type: null,
            content_data: null,
            content_metadata: null,
            is_empty: true,
            download_started_at: null,
            last_emptied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      } else {
        // For reusable buckets, keep content and update access time
        await supabase
          .from("file_buckets")
          .update({
            last_accessed_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      }

      // Return file
      responseHeaders["Content-Type"] = bucket.content_metadata.mimetype;
      responseHeaders["Content-Disposition"] = `attachment; filename="${
        safeDownloadFilename(bucket.content_metadata.filename)
      }"`;
      responseHeaders["X-Bucket-Emptied"] =
        (!bucket.is_reusable || bucket.delete_on_download).toString();
      responseHeaders["X-Bucket-Reusable"] = bucket.is_reusable.toString();

      // Delivered: the slot is committed, the catch must not release it.
      claimedBucketId = null;
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
      } else if (bucket.delete_on_download) {
        // Ping Pong Mode: Empty content but keep bucket
        await supabase
          .from("file_buckets")
          .update({
            content_type: null,
            content_data: null,
            content_metadata: null,
            is_empty: true,
            download_started_at: null,
            last_emptied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      } else {
        // For reusable buckets, keep content and update access time
        await supabase
          .from("file_buckets")
          .update({
            last_accessed_at: new Date().toISOString(),
          })
          .eq("id", bucket.id);
      }

      responseHeaders["Content-Type"] = "application/json";
      responseHeaders["X-Bucket-Emptied"] =
        (!bucket.is_reusable || bucket.delete_on_download).toString();
      responseHeaders["X-Bucket-Reusable"] = bucket.is_reusable.toString();

      // Delivered: the slot is committed, the catch must not release it.
      claimedBucketId = null;
      return new Response(
        JSON.stringify(payload),
        {
          headers: responseHeaders,
        },
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown content type" }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error("Download from bucket failed:", error);
    // If we claimed a download but never delivered it (storage failure
    // mid-flight), release the slot so a retry works immediately instead of
    // waiting out the 1-minute download_started_at guard. Same pattern as
    // get-file's claim release.
    if (claimedBucketId) {
      try {
        const recovery = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const { error: releaseError } = await recovery
          .from("file_buckets")
          .update({ download_started_at: null })
          .eq("id", claimedBucketId)
          .eq("is_empty", false); // never resurrect an already-emptied bucket
        if (releaseError) {
          console.error("Failed to release bucket claim:", releaseError);
        }
      } catch (releaseErr) {
        console.error("Failed to release bucket claim:", releaseErr);
      }
    }
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
