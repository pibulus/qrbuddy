// Edge Function: Get & Destroy File
// Serves file then deletes it after max downloads reached

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-expect-error — esm.sh's jszip types omit the default export the runtime ESM build has
import JSZip from "https://esm.sh/jszip@3.10.1";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

type StoredFile = {
  path: string;
  name: string;
  type: string;
};

type StoredFileMetadata = {
  files: StoredFile[] | null;
  max_downloads: number | null;
};

type ClaimedFile = {
  id: string;
  file_name: string;
  original_name: string;
  size: number;
  mime_type: string;
  files: StoredFile[] | null;
  max_downloads: number;
  download_count: number;
  will_expire: boolean;
};

type FinalizedDownload = {
  max_downloads: number;
  download_count: number;
  will_expire: boolean;
};

function safeDownloadFilename(filename: unknown): string {
  const fallback = "download";
  if (typeof filename !== "string" || filename.trim() === "") return fallback;
  return filename.replace(/[\r\n"\\]/g, "_");
}

function safeZipEntryName(filename: unknown, index: number): string {
  const fallback = `file-${index + 1}`;
  if (typeof filename !== "string" || filename.trim() === "") return fallback;
  return filename.replace(/[/\\\0\r\n]/g, "_");
}

function redirectTo(path: string, request?: Request, status = 302) {
  return new Response(null, {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Location": path,
    },
  });
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  // Hoisted so the catch block can release a claim slot if the download fails
  // after claiming (otherwise a transient storage/zip error burns a finite
  // download for up to 1 minute via the download_started_at guard).
  let claimedFileId: string | null = null;

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

    if (!fileId) {
      return redirectTo("/boom", req);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const requestedPath = url.searchParams.get("path");
    const wantsZip = url.searchParams.get("download") === "zip";

    if (requestedPath) {
      const { data: metadata, error: metadataError } = await supabase
        .from("destructible_files")
        .select("files,max_downloads")
        .eq("id", fileId)
        .maybeSingle<StoredFileMetadata>();

      if (
        metadataError ||
        !metadata?.files?.some((file) => file.path === requestedPath)
      ) {
        return redirectTo("/boom", req);
      }

      const isFiniteMultiFile = metadata.files.length > 1 &&
        (metadata.max_downloads ?? 999999) < 999999;
      if (isFiniteMultiFile) {
        return redirectTo("/boom", req);
      }
    }

    const { data: file, error: claimError } = await supabase
      .rpc("claim_destructible_file_download", { p_file_id: fileId })
      .maybeSingle<ClaimedFile>();

    if (claimError) {
      console.error("File claim error:", claimError);
      return redirectTo("/boom", req);
    }

    if (!file) {
      return redirectTo("/boom", req);
    }

    // Claim succeeded — remember it so a later failure can release the slot.
    claimedFileId = fileId;

    if (wantsZip && file.files && file.files.length > 1) {
      const zip = new JSZip();

      for (const [index, storedFile] of file.files.entries()) {
        const { data: storedFileData, error: storedFileError } = await supabase
          .storage
          .from("qr-files")
          .download(storedFile.path);

        if (storedFileError) throw storedFileError;

        zip.file(
          safeZipEntryName(storedFile.name, index),
          await storedFileData.arrayBuffer(),
        );
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      const { data: finalizedDownload, error: finalizeError } = await supabase
        .rpc("finalize_destructible_file_download", { p_file_id: fileId })
        .maybeSingle<FinalizedDownload>();

      if (finalizeError || !finalizedDownload) {
        if (finalizeError) {
          console.error("File finalize error:", finalizeError);
        }
        return redirectTo("/boom", req);
      }

      // Finalized: the slot is committed (finalize nulls download_started_at
      // itself), so the catch must not touch it.
      claimedFileId = null;

      if (finalizedDownload.will_expire) {
        const { error: removeError } = await supabase
          .storage
          .from("qr-files")
          .remove(file.files.map((storedFile) => storedFile.path));

        if (removeError) {
          console.error("Expired file cleanup failed:", removeError);
        }
      }

      const headers = {
        ...getCorsHeaders(req),
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${
          safeDownloadFilename(file.original_name || "files")
        }.zip"`,
        "Content-Length": String(zipBlob.size),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Destructible": "true",
        "X-Downloads-Remaining": String(
          finalizedDownload.max_downloads - finalizedDownload.download_count,
        ),
        "X-Will-Explode": finalizedDownload.will_expire ? "true" : "false",
      };

      return new Response(zipBlob, { headers });
    }

    let targetPath = file.file_name;
    let targetName = file.original_name;
    let targetMime = file.mime_type;

    if (requestedPath && file.files && Array.isArray(file.files)) {
      const subFile = file.files.find((f) => f.path === requestedPath);
      if (subFile) {
        targetPath = subFile.path;
        targetName = subFile.name;
        targetMime = subFile.type;
      }
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("qr-files")
      .download(targetPath);

    if (downloadError) throw downloadError;

    const { data: finalizedDownload, error: finalizeError } = await supabase
      .rpc("finalize_destructible_file_download", { p_file_id: fileId })
      .maybeSingle<FinalizedDownload>();

    if (finalizeError || !finalizedDownload) {
      if (finalizeError) {
        console.error("File finalize error:", finalizeError);
      }
      return redirectTo("/boom", req);
    }

    // Finalized: slot committed, catch must not release it.
    claimedFileId = null;

    // Check if client is requesting a byte range (for video/audio scrubbing)
    const rangeHeader = req.headers.get("Range");
    const fileSize = fileData.size;

    // Delete file from storage if limit reached
    if (finalizedDownload.will_expire) {
      const paths = file.files && file.files.length > 0
        ? file.files.map((storedFile) => storedFile.path)
        : [file.file_name];

      const { error: removeError } = await supabase
        .storage
        .from("qr-files")
        .remove(paths);

      if (removeError) {
        console.error("Expired file cleanup failed:", removeError);
      }
    }

    // Handle range requests for video/audio scrubbing
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.substring(6).split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const headers = {
        ...getCorsHeaders(req),
        "Content-Type": targetMime || "application/octet-stream",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Destructible": "true",
        "X-Downloads-Remaining": String(
          finalizedDownload.max_downloads - finalizedDownload.download_count,
        ),
        "X-Will-Explode": finalizedDownload.will_expire ? "true" : "false",
      };

      // Slice the blob to the requested range
      const chunk = fileData.slice(start, end + 1);
      return new Response(chunk, { status: 206, headers });
    }

    // Serve the full file
    const headers = {
      ...getCorsHeaders(req),
      "Content-Type": targetMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${
        safeDownloadFilename(targetName)
      }"`,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Destructible": "true",
      "X-Downloads-Remaining": String(
        finalizedDownload.max_downloads - finalizedDownload.download_count,
      ),
      "X-Will-Explode": finalizedDownload.will_expire ? "true" : "false",
    };

    // Return the Blob directly to prevent truncation
    // Converting to arrayBuffer causes Deno edge runtime to truncate to ~1KB
    return new Response(fileData, { headers });
  } catch (error) {
    console.error("File download error:", error);
    // If we claimed a finite download but never finalized it (storage/zip
    // failure mid-flight), release the slot so the user can retry immediately
    // instead of waiting out the 1-minute download_started_at guard.
    if (claimedFileId) {
      try {
        const recovery = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        const { error: releaseError } = await recovery
          .from("destructible_files")
          .update({ download_started_at: null })
          .eq("id", claimedFileId)
          .eq("accessed", false); // never resurrect an already-finalized file
        if (releaseError) {
          console.error("Failed to release claim slot:", releaseError);
        }
      } catch (releaseErr) {
        console.error("Failed to release claim slot:", releaseErr);
      }
    }
    return redirectTo("/boom", req);
  }
});
