// Edge Function: Get File Metadata
// Returns file info without downloading (for landing page)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

    if (!fileId) {
      return new Response(
        JSON.stringify({ error: "File ID required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(
      JSON.stringify({
        fileId: file.id,
        fileName: file.original_name,
        fileSize: file.size,
        mimeType: file.mime_type,
        maxDownloads,
        downloadCount,
        remainingDownloads,
        isExpired,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Metadata fetch error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
