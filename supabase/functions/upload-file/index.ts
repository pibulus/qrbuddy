// Edge Function: Upload File for Destructible QR
// Receives file, stores in Supabase, returns URL that self-destructs after one access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 uploads per hour per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10,
    });

    if (rateLimitResult.isLimited) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get file and options from request
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const maxDownloads = parseInt(
      formData.get("maxDownloads") as string || "1",
      10,
    );

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

    // Validate file type - block dangerous executables
    // Check entire filename (not just last extension) to prevent bypasses like "innocent.txt.exe"
    const fileName = file.name.toLowerCase();
    const blockedExtensions = [
      "exe",
      "bat",
      "cmd",
      "sh",
      "app",
      "dmg",
      "pkg",
      "deb",
      "rpm",
      "msi",
      "scr",
      "vbs",
      "js",
      "jar",
      "apk",
      "ipa",
      "com",
      "pif",
      "application",
      "gadget",
      "msp",
      "cpl",
      "hta",
      "inf",
      "ins",
      "isp",
      "jse",
      "lnk",
      "msc",
      "psc1",
      "reg",
      "scf",
      "vb",
      "vbe",
      "wsf",
      "wsh",
      "ps1",
      "ps1xml",
      "ps2",
      "ps2xml",
      "psc2",
      "msh",
      "msh1",
      "msh2",
      "mshxml",
      "msh1xml",
      "msh2xml",
    ];

    // Check if filename ends with any blocked extension
    const hasBlockedExt = blockedExtensions.some((ext) =>
      fileName.endsWith(`.${ext}`)
    );

    if (hasBlockedExt) {
      const matchedExt = blockedExtensions.find((ext) =>
        fileName.endsWith(`.${ext}`)
      );
      return new Response(
        JSON.stringify({
          error:
            `File type '.${matchedExt}' is not allowed for security reasons. Executable files are blocked.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Extract actual file extension for storage
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "";

    // Also validate MIME type if available
    const blockedMimeTypes = [
      "application/x-msdownload",
      "application/x-msdos-program",
      "application/x-executable",
      "application/x-sh",
      "application/x-bat",
      "application/x-ms-application",
      "application/vnd.microsoft.portable-executable",
    ];

    if (file.type && blockedMimeTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: "This file type is not allowed for security reasons.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Generate unique ID (fileExt already extracted above for validation)
    const fileId = uuidv4();
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
        max_downloads: maxDownloads,
        download_count: 0,
      });

    if (dbError) throw dbError;

    // Generate retrieval URL (prettier format)
    const baseUrl = Deno.env.get("APP_URL") ||
      (Deno.env.get("DENO_DEPLOYMENT_ID")
        ? `https://qrbuddy.app`
        : `http://localhost:8000`);
    const retrievalUrl = `${baseUrl}/f/${fileId}`;

    const message = maxDownloads === 1
      ? "File uploaded! It will self-destruct after 1 download."
      : `File uploaded! It will self-destruct after ${maxDownloads} downloads.`;

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        url: retrievalUrl,
        fileName: file.name,
        size: file.size,
        maxDownloads,
        message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
