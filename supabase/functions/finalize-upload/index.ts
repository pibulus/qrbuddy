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
import { generateOwnerToken } from "../_shared/visitor.ts";

const UNLIMITED_DOWNLOADS = 999999;
const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

type FinalizationResult = {
  kind?: string;
  error_code?: string;
  file_id?: string;
  owner_token?: string;
  file_name?: string;
  size?: number;
  max_downloads?: number;
};

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    status,
  });
}

function respondWithFinalization(
  req: Request,
  result: FinalizationResult,
): Response {
  if (result.error_code === "not_found") {
    return jsonResponse(req, { error: "Unknown or expired upload" }, 404);
  }
  if (result.error_code === "expired") {
    return jsonResponse(req, { error: "Upload grant expired" }, 410);
  }
  if (result.error_code === "bucket_conflict") {
    return jsonResponse(
      req,
      {
        error:
          "Bucket was filled by someone else. Download current content first.",
      },
      409,
    );
  }
  if (result.kind === "bucket" && result.error_code === undefined) {
    return jsonResponse(req, {
      success: true,
      message: "Content uploaded to bucket",
      content_type: "file",
      is_empty: false,
    });
  }
  if (
    result.kind === "destructible" && result.file_id && result.owner_token &&
    typeof result.max_downloads === "number"
  ) {
    const baseUrl = Deno.env.get("APP_URL") ||
      (Deno.env.get("DENO_DEPLOYMENT_ID")
        ? "https://qrbuddy.app"
        : "http://localhost:8000");
    const maxDownloads = result.max_downloads;
    const message = maxDownloads === UNLIMITED_DOWNLOADS
      ? "Files uploaded! Ready to share — unlimited downloads."
      : maxDownloads === 1
      ? "Files uploaded! They will self-destruct after 1 download."
      : `Files uploaded! They will self-destruct after ${maxDownloads} downloads.`;

    return jsonResponse(req, {
      success: true,
      fileId: result.file_id,
      ownerToken: result.owner_token,
      url: `${baseUrl}/f/${result.file_id}`,
      fileName: result.file_name ?? "download",
      size: result.size ?? 0,
      maxDownloads,
      message,
    });
  }

  return jsonResponse(req, { error: "Could not finalize this upload" }, 500);
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

    // A completed grant retains its response briefly. This makes a retry after
    // a dropped network response return the same share URL and owner token.
    if (pending.finalized_at) {
      if (pending.finalization_result) {
        return respondWithFinalization(
          req,
          pending.finalization_result as FinalizationResult,
        );
      }
      return jsonResponse(req, { error: "Could not recover this upload" }, 500);
    }

    if (
      !Number.isFinite(new Date(pending.created_at).getTime()) ||
      Date.now() - new Date(pending.created_at).getTime() >
        PENDING_UPLOAD_TTL_MS
    ) {
      return jsonResponse(req, { error: "Upload grant expired" }, 410);
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
      const deleted = await deleteObjects([pending.storage_key]);
      if (!deleted.includes(pending.storage_key)) {
        const { error: queueError } = await supabase
          .from("r2_reap_queue")
          .upsert({
            storage_key: pending.storage_key,
            reap_after: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
        if (queueError) {
          console.error("Mismatched upload reap enqueue failed:", queueError);
          return jsonResponse(
            req,
            { error: "Could not safely clean up this upload. Please retry." },
            503,
          );
        }
      }

      const { error: pendingDeleteError } = await supabase
        .from("pending_uploads")
        .delete()
        .eq("id", uploadId);
      if (pendingDeleteError) {
        console.error(
          "Mismatched upload grant cleanup failed:",
          pendingDeleteError,
        );
      }
      return jsonResponse(
        req,
        { error: "Uploaded file doesn't match the declared size." },
        400,
      );
    }

    const ownerToken = pending.kind === "destructible"
      ? generateOwnerToken()
      : null;
    const { data: finalized, error: finalizeError } = await supabase.rpc(
      "finalize_pending_upload",
      { p_upload_id: uploadId, p_owner_token: ownerToken },
    );
    if (finalizeError) throw finalizeError;
    if (!finalized || typeof finalized !== "object") {
      throw new Error("Pending upload finalization returned no result");
    }

    return respondWithFinalization(req, finalized as FinalizationResult);
  } catch (error) {
    console.error("Finalize upload failed:", error);
    return jsonResponse(
      req,
      { error: "An unexpected error occurred. Please try again." },
      500,
    );
  }
});
