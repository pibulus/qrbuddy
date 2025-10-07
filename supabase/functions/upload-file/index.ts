// Edge Function: Upload File for Destructible QR
// Receives file, stores in Supabase, returns URL that self-destructs after one access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get file from request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Check file size (25MB limit)
    if (file.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large (max 25MB)" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Generate unique ID
    const fileId = uuidv4();
    const fileExt = file.name.split(".").pop();
    const fileName = `${fileId}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from("qr-files")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Store metadata in database
    const { error: dbError } = await supabase
      .from("destructible_files")
      .insert({
        id: fileId,
        file_name: fileName,
        original_name: file.name,
        size: file.size,
        mime_type: file.type,
        created_at: new Date().toISOString(),
        accessed: false,
      });

    if (dbError) throw dbError;

    // Generate retrieval URL
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const retrievalUrl = `${baseUrl}/functions/v1/get-file?id=${fileId}`;

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        url: retrievalUrl,
        fileName: file.name,
        size: file.size,
        message: "File uploaded! It will self-destruct after one download.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
