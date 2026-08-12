// Edge Function: Finalize Upload (supporter big files)
// The second half of the presigned R2 flow: verifies the object actually
// landed in R2 (exists + size matches the create-upload-url declaration),
// then creates the real destructible_files row or fills the locker. The
// client's word that the PUT happened is never trusted.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { requestHasValidPass } from "../_shared/license.ts";
import { deleteObjects, headObjectSize } from "../_shared/r2.ts";

const UNLIMITED_DOWNLOADS = 999999;

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    if (!(await requestHasValidPass(req))) {
      return jsonResponse(
        req,
        { error: "Supporter pass required for big files" },
        403,
      );
    }

    let body: { upload_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Invalid JSON body" }, 400);
    }

    const uploadId = body.upload_id;
    if (typeof uploadId !== "string" || uploadId === "") {
      return jsonResponse(req, { error: "upload_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: pending, error: pendingError } = await supabase
      .from("pending_uploads")
      .select("*")
      .eq("id", uploadId)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) {
      return jsonResponse(req, { error: "Unknown or expired upload" }, 404);
    }

    // The calibration check: is the object really there, at the declared size?
    const actualSize = await headObjectSize(pending.storage_key);
    if (actualSize === null) {
      // PUT hasn't landed (or failed). Keep the pending row — the client can
      // retry finalize; cleanup-expired reaps abandoned grants after 24h.
      return jsonResponse(
        req,
        { error: "File hasn't arrived in storage yet. Try again." },
        400,
      );
    }
    if (actualSize !== pending.declared_size) {
      await deleteObjects([pending.storage_key]);
      await supabase.from("pending_uploads").delete().eq("id", uploadId);
      return jsonResponse(
        req,
        { error: "Uploaded file doesn't match the declared size." },
        400,
      );
    }

    if (pending.kind === "destructible") {
      const params = pending.params as {
        main_id: string;
        file_id: string;
        max_downloads: number;
        theme: string;
        creator_ip: string;
      };
      const maxDownloads = params.max_downloads ?? UNLIMITED_DOWNLOADS;

      const { error: dbError } = await supabase
        .from("destructible_files")
        .insert({
          id: params.main_id,
          file_name: pending.storage_key, // Legacy column — the r2/ prefix marks the backend
          original_name: pending.filename,
          size: pending.declared_size,
          mime_type: pending.mimetype,
          files: [{
            id: params.file_id,
            path: pending.storage_key,
            name: pending.filename,
            size: pending.declared_size,
            type: pending.mimetype,
          }],
          theme: params.theme,
          created_at: new Date().toISOString(),
          accessed: false,
          max_downloads: maxDownloads,
          download_count: 0,
          creator_ip: params.creator_ip,
        });

      if (dbError) throw dbError;

      await supabase.from("pending_uploads").delete().eq("id", uploadId);

      const baseUrl = Deno.env.get("APP_URL") ||
        (Deno.env.get("DENO_DEPLOYMENT_ID")
          ? "https://qrbuddy.app"
          : "http://localhost:8000");

      const message = maxDownloads === UNLIMITED_DOWNLOADS
        ? "Files uploaded! Ready to share — unlimited downloads."
        : maxDownloads === 1
        ? "Files uploaded! They will self-destruct after 1 download."
        : `Files uploaded! They will self-destruct after ${maxDownloads} downloads.`;

      // Same response shape as upload-file so the client flow is identical.
      return jsonResponse(req, {
        success: true,
        fileId: params.main_id,
        url: `${baseUrl}/f/${params.main_id}`,
        fileName: pending.filename,
        size: pending.declared_size,
        maxDownloads,
        message,
      });
    }

    // kind === "bucket": fill the locker, atomically (same .eq(is_empty)
    // guard as upload-to-bucket — a concurrent filler wins, we clean up).
    const params = pending.params as {
      bucket_id: string;
      bucket_code: string;
      title?: string;
      description?: string;
      creator?: string;
    };

    const contentMetadata = {
      filename: pending.filename,
      size: pending.declared_size,
      mimetype: pending.mimetype,
      storage_path: pending.storage_key,
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.creator && { creator: params.creator }),
    };

    const { data: updatedBucket, error: updateError } = await supabase
      .from("file_buckets")
      .update({
        content_type: "file",
        content_data: pending.storage_key,
        content_metadata: contentMetadata,
        is_empty: false,
        download_started_at: null,
        last_filled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.bucket_id)
      .eq("is_empty", true)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updatedBucket) {
      // Someone filled the bucket between presign and finalize — the R2
      // object is orphaned; queue it for the reaper and tell the client.
      await supabase.from("r2_reap_queue").upsert({
        storage_key: pending.storage_key,
        reap_after: new Date().toISOString(),
      });
      await supabase.from("pending_uploads").delete().eq("id", uploadId);
      return jsonResponse(
        req,
        {
          error:
            "Bucket was filled by someone else. Download current content first.",
        },
        409,
      );
    }

    await supabase.from("pending_uploads").delete().eq("id", uploadId);

    return jsonResponse(req, {
      success: true,
      message: "Content uploaded to bucket",
      content_type: "file",
      is_empty: false,
    });
  } catch (error) {
    console.error("Finalize upload failed:", error);
    return jsonResponse(
      req,
      { error: "An unexpected error occurred. Please try again." },
      500,
    );
  }
});
