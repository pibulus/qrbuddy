// Edge Function: Get & Destroy File
// Serves file then deletes it after max downloads reached

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function redirectTo(path: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders,
      "Location": path,
    },
  });
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

    if (!fileId) {
      return redirectTo("/boom");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get file metadata
    const { data: file, error: fetchError } = await supabase
      .from("destructible_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      return redirectTo("/boom");
    }

    // Treat null/undefined as unlimited (999999)
    const maxDownloads = file.max_downloads || 999999;
    const downloadCount = file.download_count || 0;

    // Check if already exploded (but not for unlimited files)
    if (
      file.accessed || (maxDownloads < 999999 && downloadCount >= maxDownloads)
    ) {
      return redirectTo("/boom");
    }

    // Check if a specific file path is requested (for multi-file)
    const requestedPath = url.searchParams.get("path");

    let targetPath = file.file_name;
    let targetName = file.original_name;
    let targetMime = file.mime_type;

    if (requestedPath && file.files && Array.isArray(file.files)) {
      const subFile = file.files.find((
        f: { path: string; name: string; type: string },
      ) => f.path === requestedPath);
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

    // Check if client is requesting a byte range (for video/audio scrubbing)
    const rangeHeader = req.headers.get("Range");
    const fileSize = fileData.size;

    // Increment download count
    const newDownloadCount = downloadCount + 1;
    const willExplode = newDownloadCount >= maxDownloads;

    await supabase
      .from("destructible_files")
      .update({
        download_count: newDownloadCount,
        accessed: willExplode, // Mark as accessed when limit reached
      })
      .eq("id", fileId);

    // Delete file from storage if limit reached
    if (willExplode) {
      await supabase
        .storage
        .from("qr-files")
        .remove([file.file_name]);
    }

    // Handle range requests for video/audio scrubbing
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.substring(6).split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const headers = {
        ...corsHeaders,
        "Content-Type": targetMime || "application/octet-stream",
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Destructible": "true",
        "X-Downloads-Remaining": String(maxDownloads - newDownloadCount),
        "X-Will-Explode": willExplode ? "true" : "false",
      };

      // Slice the blob to the requested range
      const chunk = fileData.slice(start, end + 1);
      return new Response(chunk, { status: 206, headers });
    }

    // Serve the full file
    const headers = {
      ...corsHeaders,
      "Content-Type": targetMime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${targetName}"`,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Destructible": "true",
      "X-Downloads-Remaining": String(maxDownloads - newDownloadCount),
      "X-Will-Explode": willExplode ? "true" : "false",
    };

    // Return the Blob directly to prevent truncation
    // Converting to arrayBuffer causes Deno edge runtime to truncate to ~1KB
    return new Response(fileData, { headers });
  } catch (error) {
    console.error("File download error:", error);
    return redirectTo("/boom");
  }
});
