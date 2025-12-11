// Edge Function: Upload File for Destructible QR
// Receives file(s), stores in Supabase, returns URL that self-destructs after one access

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";

const UNLIMITED_DOWNLOADS = 999999;
const MAX_DOWNLOADS_LIMIT = UNLIMITED_DOWNLOADS;
const DEFAULT_MAX_DOWNLOADS = UNLIMITED_DOWNLOADS;

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
    const files = formData.getAll("file") as File[]; // Get all files

    // Strict Limit: Max 3 active files per IP
    const { count: activeFiles, error: countError } = await supabase
      .from("destructible_files")
      .select("*", { count: "exact", head: true })
      .eq("creator_ip", clientIP)
      .eq("accessed", false); // Only count active (unaccessed) files

    if (countError) {
      console.error("Failed to check file limit:", countError);
      throw new Error("System busy, please try again.");
    }

    if (activeFiles !== null && activeFiles >= 3) {
      return new Response(
        JSON.stringify({
          error:
            "Limit reached. You can only have 3 active files at a time. Wait for them to be downloaded or expire.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    const parsedMaxDownloads = parseInt(
      formData.get("maxDownloads") as string || String(DEFAULT_MAX_DOWNLOADS),
      10,
    );
    const theme = (formData.get("theme") as string) || "sunset";

    const maxDownloads =
      Number.isFinite(parsedMaxDownloads) && parsedMaxDownloads > 0
        ? Math.min(parsedMaxDownloads, MAX_DOWNLOADS_LIMIT)
        : DEFAULT_MAX_DOWNLOADS;

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Multi-file validation
    if (files.length > 10) {
      return new Response(
        JSON.stringify({ error: "Max 10 files allowed per share." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // If multiple files, enforce IMAGES ONLY
    const isMultiFile = files.length > 1;

    // Validate each file
    for (const file of files) {
      // Check file size (5MB limit per file for multi-file, or 50MB for single)
      const sizeLimit = isMultiFile ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > sizeLimit) {
        return new Response(
          JSON.stringify({
            error: isMultiFile
              ? `File ${file.name} too large (max 5MB for slideshows)`
              : "File too large (max 50MB)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Validate file type
      const fileName = file.name.toLowerCase();

      // If multi-file, MUST be image
      if (isMultiFile && !file.type.startsWith("image/")) {
        return new Response(
          JSON.stringify({
            error:
              `File ${file.name} is not an image. Slideshows only support images.`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Block dangerous extensions (same logic as before)
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

      const hasBlockedExt = blockedExtensions.some((ext) =>
        fileName.endsWith(`.${ext}`)
      );

      if (hasBlockedExt) {
        return new Response(
          JSON.stringify({
            error:
              `File type of '${file.name}' is not allowed for security reasons.`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
    }

    // Generate main ID
    const mainId = uuidv4();
    const uploadedFiles = [];

    // Upload all files
    for (const file of files) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      const fileId = uuidv4(); // Unique ID for each file in storage
      const storageFileName = `${mainId}/${fileId}.${fileExt}`; // Store in folder named after mainId

      const { error: uploadError } = await supabase
        .storage
        .from("qr-files")
        .upload(storageFileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      uploadedFiles.push({
        id: fileId,
        path: storageFileName,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    // Store metadata in database
    // For backward compatibility, store the first file's details in the main columns
    const firstFile = uploadedFiles[0];

    const { error: dbError } = await supabase
      .from("destructible_files")
      .insert({
        id: mainId,
        file_name: firstFile.path, // Legacy column
        original_name: firstFile.name, // Legacy column
        size: firstFile.size, // Legacy column
        mime_type: firstFile.type, // Legacy column
        files: uploadedFiles, // NEW JSON column
        theme: theme,
        created_at: new Date().toISOString(),
        accessed: false,
        max_downloads: maxDownloads,
        download_count: 0,
        creator_ip: clientIP,
      });

    if (dbError) throw dbError;

    // Generate retrieval URL
    const baseUrl = Deno.env.get("APP_URL") ||
      (Deno.env.get("DENO_DEPLOYMENT_ID")
        ? `https://qrbuddy.app`
        : `http://localhost:8000`);
    const retrievalUrl = `${baseUrl}/f/${mainId}`;

    const message = maxDownloads === UNLIMITED_DOWNLOADS
      ? "Files uploaded! Ready to share — unlimited downloads."
      : maxDownloads === 1
      ? "Files uploaded! They will self-destruct after 1 download."
      : `Files uploaded! They will self-destruct after ${maxDownloads} downloads.`;

    return new Response(
      JSON.stringify({
        success: true,
        fileId: mainId,
        url: retrievalUrl,
        fileName: firstFile.name +
          (files.length > 1 ? ` + ${files.length - 1} more` : ""),
        size: files.reduce((acc, f) => acc + f.size, 0),
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
