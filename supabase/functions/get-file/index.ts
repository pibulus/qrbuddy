// Edge Function: Get & Destroy File
// Serves file ONCE then deletes it - true destructible behavior

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("id");

    if (!fileId) {
      // Redirect to KABOOM page
      return Response.redirect("/boom", 302);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Check if file exists and hasn't been accessed
    const { data: file, error: fetchError } = await supabase
      .from("destructible_files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (fetchError || !file) {
      // File doesn't exist or already exploded - redirect to KABOOM
      return Response.redirect("/boom", 302);
    }

    if (file.accessed) {
      // Already accessed - redirect to KABOOM
      return Response.redirect("/boom", 302);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("qr-files")
      .download(file.file_name);

    if (downloadError) throw downloadError;

    // Mark as accessed (soft delete)
    await supabase
      .from("destructible_files")
      .update({ accessed: true })
      .eq("id", fileId);

    // DELETE the actual file from storage - true destruction!
    await supabase
      .storage
      .from("qr-files")
      .remove([file.file_name]);

    // Serve the file with proper headers
    const headers = {
      ...corsHeaders,
      "Content-Type": file.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.original_name}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Destructible": "true",
      "X-Message": "🔥 This file self-destructed after download",
    };

    // Convert blob to array buffer for response
    const arrayBuffer = await fileData.arrayBuffer();

    return new Response(arrayBuffer, { headers });
  } catch (error) {
    console.error("File explosion failed:", error);
    // Redirect to KABOOM on any error
    return Response.redirect("/boom", 302);
  }
});
