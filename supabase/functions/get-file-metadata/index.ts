// Edge Function: Get File Metadata
// Returns file info without downloading (for landing page)

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return createCorsResponse(req);
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");
    // The owner asks with their token and gets stats + the daily ledger back.
    // Anyone else gets the public shape. Token in a query param only on this
    // read, from the vault, over HTTPS — never in the share URL.
    const ownerToken = url.searchParams.get("owner");

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "File ID required" }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
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
      return new Response(
        JSON.stringify({ error: "File not found or already destroyed" }),
        {
          status: 404,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Treat null/undefined as unlimited (999999)
    const maxDownloads = file.max_downloads || 999999;
    const downloadCount = file.download_count || 0;

    // Check if file is expired
    const isExpired = file.accessed ||
      (maxDownloads < 999999 && downloadCount >= maxDownloads);

    const remainingDownloads = maxDownloads - downloadCount;

    const isOwner = Boolean(ownerToken) && Boolean(file.owner_token) &&
      ownerToken === file.owner_token;

    let ledger: unknown[] | undefined;
    if (isOwner) {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      const { data } = await supabase
        .from("share_stats_daily")
        .select(
          "day, views, people, returns, countries, cities, devices, hours, items, dwell_s, dwell_n, completions, shares, downloads, referred, languages, apps, farthest_km, farthest_place",
        )
        .eq("file_id", fileId)
        .gte("day", since)
        .order("day", { ascending: true });
      ledger = data ?? [];
    }

    return new Response(
      JSON.stringify({
        fileId: file.id,
        fileName: file.original_name,
        fileSize: file.size,
        mimeType: file.mime_type,
        files: file.files, // Return multi-file array
        theme: file.theme,
        maxDownloads,
        downloadCount,
        remainingDownloads,
        isExpired,
        ...(isOwner
          ? {
            isOwner: true,
            stats: file.stats ?? {},
            ledger,
            createdAt: file.created_at,
          }
          : {}),
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
