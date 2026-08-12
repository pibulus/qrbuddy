// Edge Function: Create Upload URL (supporter big files)
// Mints a presigned R2 PUT so the browser uploads directly to R2 — the edge
// function body limit never sees the bytes. Supporter pass REQUIRED.
//
// Flow: this function validates + records a pending_uploads grant, the
// browser PUTs to R2, then finalize-upload verifies the object and creates
// the real destructible_files / file_buckets record. Never trust that the
// PUT happened — the pending row only becomes a live file at finalize.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { requestHasValidPass } from "../_shared/license.ts";
import {
  BLOCKED_EXTENSIONS,
  BLOCKED_MIME_TYPES,
  SUPPORTER_MAX_FILE_SIZE,
} from "../_shared/file-validation.ts";
import { verifyOwnerToken, verifyPassword } from "../_shared/bucket-auth.ts";
import { presignPut } from "../_shared/r2.ts";

const UNLIMITED_DOWNLOADS = 999999;

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    status,
  });
}

/** Mirrors validateFile's name/mime checks — there's no File object here,
 * only the client's declared filename/size/mimetype. */
function validateDeclaredFile(
  filename: unknown,
  size: unknown,
  mimetype: unknown,
): string | null {
  if (typeof filename !== "string" || filename.trim() === "") {
    return "filename required";
  }
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f]/.test(filename)) {
    return "Filename contains invalid characters.";
  }
  const lower = filename.toLowerCase();
  const lastExt = lower.includes(".") ? lower.split(".").pop() ?? "" : "";
  if (lastExt && BLOCKED_EXTENSIONS.includes(lastExt)) {
    return `File type '.${lastExt}' is not allowed for security reasons.`;
  }
  if (
    typeof mimetype === "string" && mimetype &&
    BLOCKED_MIME_TYPES.includes(mimetype)
  ) {
    return "This file type is not allowed for security reasons.";
  }
  if (
    typeof size !== "number" || !Number.isInteger(size) || size <= 0
  ) {
    return "size (bytes) required";
  }
  if (size > SUPPORTER_MAX_FILE_SIZE) {
    return `File too large (max ${
      Math.round(SUPPORTER_MAX_FILE_SIZE / 1024 / 1024)
    }MB)`;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    // The pass IS the product gate — no pass, no big files.
    if (!(await requestHasValidPass(req))) {
      return jsonResponse(
        req,
        { error: "Supporter pass required for big files" },
        403,
      );
    }

    // Supporters skip the free-tier throttles, but presign minting still gets
    // a generous ceiling so a leaked pass can't script-mint forever.
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100,
    });
    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Invalid JSON body" }, 400);
    }

    const { kind, filename, size, mimetype } = body;
    if (kind !== "destructible" && kind !== "bucket") {
      return jsonResponse(
        req,
        { error: "kind must be 'destructible' or 'bucket'" },
        400,
      );
    }

    const validationError = validateDeclaredFile(filename, size, mimetype);
    if (validationError) {
      return jsonResponse(req, { error: validationError }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let storageKey: string;
    let params: Record<string, unknown>;

    if (kind === "bucket") {
      const bucketCode = body.bucket_code;
      if (typeof bucketCode !== "string" || bucketCode === "") {
        return jsonResponse(req, { error: "bucket_code required" }, 400);
      }

      const { data: bucket, error: bucketError } = await supabase
        .from("file_buckets")
        .select(
          "id, bucket_code, is_empty, owner_token, is_password_protected, password_hash",
        )
        .eq("bucket_code", bucketCode)
        .maybeSingle();

      if (bucketError || !bucket) {
        return jsonResponse(req, { error: "Invalid bucket" }, 404);
      }
      if (!bucket.is_empty) {
        return jsonResponse(
          req,
          { error: "Bucket is full. Download current content first." },
          400,
        );
      }

      // Same authorization as upload-to-bucket: owner token, or PIN/password
      // when the locker demands one.
      const ownerToken = typeof body.owner_token === "string"
        ? body.owner_token
        : null;
      const password = typeof body.password === "string" ? body.password : null;
      if (ownerToken) {
        if (!(await verifyOwnerToken(bucket.owner_token, ownerToken))) {
          return jsonResponse(req, { error: "Invalid owner token" }, 403);
        }
      } else if (
        bucket.is_password_protected &&
        !(await verifyPassword(bucket.password_hash, password))
      ) {
        return jsonResponse(
          req,
          { error: "Locker PIN required or invalid" },
          401,
        );
      }

      storageKey = `r2/bucket-${bucketCode}-${crypto.randomUUID()}`;
      params = {
        bucket_id: bucket.id,
        bucket_code: bucketCode,
        ...(typeof body.title === "string" && body.title
          ? { title: body.title }
          : {}),
        ...(typeof body.description === "string" && body.description
          ? { description: body.description }
          : {}),
        ...(typeof body.creator === "string" && body.creator
          ? { creator: body.creator }
          : {}),
      };
    } else {
      // Destructible one-time file. Same clamp logic as upload-file.
      const parsedMaxDownloads = typeof body.max_downloads === "number"
        ? body.max_downloads
        : UNLIMITED_DOWNLOADS;
      const maxDownloads =
        Number.isFinite(parsedMaxDownloads) && parsedMaxDownloads > 0
          ? Math.min(Math.floor(parsedMaxDownloads), UNLIMITED_DOWNLOADS)
          : UNLIMITED_DOWNLOADS;
      const theme = typeof body.theme === "string" && body.theme
        ? body.theme
        : "sunset";

      const mainId = crypto.randomUUID();
      const fileId = crypto.randomUUID();
      // Keys stay URL-safe by construction: uuids + a sanitized extension.
      const rawExt = (filename as string).toLowerCase().includes(".")
        ? (filename as string).toLowerCase().split(".").pop() ?? ""
        : "";
      const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 10);
      storageKey = `r2/${mainId}/${fileId}${ext ? `.${ext}` : ""}`;
      params = {
        main_id: mainId,
        file_id: fileId,
        max_downloads: maxDownloads,
        theme,
        creator_ip: clientIP,
      };
    }

    const { data: pending, error: pendingError } = await supabase
      .from("pending_uploads")
      .insert({
        kind,
        storage_key: storageKey,
        declared_size: size,
        filename,
        mimetype: typeof mimetype === "string" ? mimetype : null,
        params,
      })
      .select("id")
      .single();

    if (pendingError) throw pendingError;

    // 1h to start the PUT — signature validity is checked at request start,
    // so slow uplinks finishing after expiry are fine.
    const uploadUrl = await presignPut(storageKey, 3600);

    return jsonResponse(req, {
      success: true,
      upload_id: pending.id,
      upload_url: uploadUrl,
      storage_key: storageKey,
    });
  } catch (error) {
    console.error("Create upload URL failed:", error);
    return jsonResponse(
      req,
      { error: "An unexpected error occurred. Please try again." },
      500,
    );
  }
});
