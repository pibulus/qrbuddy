// ===================================================================
// LOCAL MOCK API SERVER - For testing without Supabase
// Mimics Supabase edge functions for destructible files + dynamic QRs
// ===================================================================

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.216.0/crypto/mod.ts";
import QRCode from "npm:qrcode@1.5.4";
import { QR_STYLES } from "../utils/qr-styles.ts";

const PORT = 8005;
const FILES_DIR = "./local-api/files";
const DB_FILE = "./local-api/db.json";
const QR_DEFAULT_SIZE = 384;
const QR_MIN_SIZE = 128;
const QR_MAX_SIZE = 1024;
const QR_QUIET_ZONE = 4;
const QR_MAX_DATA_LENGTH = 512;

// Ensure directories exist
try {
  await Deno.mkdir(FILES_DIR, { recursive: true });
} catch {
  // Directory already exists
}

// CORS headers for local dev
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ===================================================================
// DATABASE HELPERS (JSON file as mock database)
// ===================================================================

interface DestructibleFile {
  id: string;
  file_name: string;
  original_name: string;
  size: number;
  mime_type: string;
  created_at: string;
  accessed: boolean;
}

interface DynamicQR {
  id: string;
  short_code: string;
  destination_url: string;
  created_at: string;
  expires_at: string | null;
  max_scans: number | null;
  scan_count: number;
  owner_token: string;
  is_active: boolean;
}

interface Database {
  destructible_files: DestructibleFile[];
  dynamic_qr_codes: DynamicQR[];
}

type RenderStyleName = keyof typeof QR_STYLES;
type PaintConfig = {
  color?: string;
  gradient?: {
    type?: "linear" | "radial";
    rotation?: number;
    colorStops?: Array<{ offset: number; color: string }>;
  };
};

async function loadDB(): Promise<Database> {
  try {
    const data = await Deno.readTextFile(DB_FILE);
    return JSON.parse(data);
  } catch {
    return { destructible_files: [], dynamic_qr_codes: [] };
  }
}

async function saveDB(db: Database) {
  await Deno.writeTextFile(DB_FILE, JSON.stringify(db, null, 2));
}

// ===================================================================
// UPLOAD FILE ENDPOINT
// ===================================================================

async function handleUploadFile(req: Request): Promise<Response> {
  try {
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
    const fileId = crypto.randomUUID();
    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${fileId}.${fileExt}`;

    // Save file to disk
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    await Deno.writeFile(`${FILES_DIR}/${fileName}`, fileBytes);

    // Store metadata in database
    const db = await loadDB();
    db.destructible_files.push({
      id: fileId,
      file_name: fileName,
      original_name: file.name,
      size: file.size,
      mime_type: file.type,
      created_at: new Date().toISOString(),
      accessed: false,
    });
    await saveDB(db);

    // Return retrieval URL
    const retrievalUrl = `http://localhost:${PORT}/get-file?id=${fileId}`;

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
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
}

// ===================================================================
// GET FILE ENDPOINT (One-time download + self-destruct)
// ===================================================================

async function handleGetFile(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fileId = url.searchParams.get("id");

  if (!fileId) {
    return new Response("No file ID provided", { status: 400 });
  }

  const db = await loadDB();
  const fileRecord = db.destructible_files.find((f) => f.id === fileId);

  if (!fileRecord) {
    // File not found - serve KABOOM page
    return serveBoomPage();
  }

  if (fileRecord.accessed) {
    // Already accessed - serve KABOOM page
    return serveBoomPage();
  }

  // Read file from disk
  try {
    const filePath = `${FILES_DIR}/${fileRecord.file_name}`;
    const fileBytes = await Deno.readFile(filePath);

    // Mark as accessed
    fileRecord.accessed = true;
    await saveDB(db);

    // Delete file from disk
    await Deno.remove(filePath);

    // Return file
    return new Response(fileBytes, {
      headers: {
        "Content-Type": fileRecord.mime_type || "application/octet-stream",
        "Content-Disposition":
          `attachment; filename="${fileRecord.original_name}"`,
        "X-Destructible": "true",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return serveBoomPage();
  }
}

// ===================================================================
// CREATE DYNAMIC QR ENDPOINT
// ===================================================================

async function handleCreateDynamicQR(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { destination_url, max_scans, expires_at } = body;

    if (!destination_url) {
      return new Response(
        JSON.stringify({ error: "destination_url is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    // Generate short code (6 chars)
    const shortCode = generateShortCode();
    const ownerToken = crypto.randomUUID().replace(/-/g, "");

    const db = await loadDB();
    const qrRecord: DynamicQR = {
      id: crypto.randomUUID(),
      short_code: shortCode,
      destination_url,
      created_at: new Date().toISOString(),
      expires_at: expires_at || null,
      max_scans: max_scans || null,
      scan_count: 0,
      owner_token: ownerToken,
      is_active: true,
    };

    db.dynamic_qr_codes.push(qrRecord);
    await saveDB(db);

    // Return URLs
    const redirectUrl =
      `http://localhost:${PORT}/redirect-qr?code=${shortCode}`;
    const editUrl = `http://localhost:8004/edit?token=${ownerToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        short_code: shortCode,
        redirect_url: redirectUrl,
        edit_url: editUrl,
        owner_token: ownerToken,
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
}

// ===================================================================
// REDIRECT QR ENDPOINT (Handle scans + redirects)
// ===================================================================

async function handleRedirectQR(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const shortCode = url.searchParams.get("code");

  if (!shortCode) {
    return new Response("No QR code provided", { status: 400 });
  }

  const db = await loadDB();
  const qrRecord = db.dynamic_qr_codes.find((q) => q.short_code === shortCode);

  if (!qrRecord) {
    return new Response("QR code not found", { status: 404 });
  }

  // Check if expired
  if (qrRecord.expires_at && new Date(qrRecord.expires_at) < new Date()) {
    return new Response("QR code expired", { status: 410 });
  }

  // Check scan limit
  if (qrRecord.max_scans && qrRecord.scan_count >= qrRecord.max_scans) {
    return serveBoomPage();
  }

  // Increment scan count
  qrRecord.scan_count++;
  await saveDB(db);

  // Redirect to destination
  return Response.redirect(qrRecord.destination_url, 302);
}

// ===================================================================
// UPDATE DYNAMIC QR ENDPOINT
// ===================================================================

async function handleUpdateDynamicQR(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { owner_token, destination_url, max_scans, expires_at } = body;

    if (!owner_token) {
      return new Response(
        JSON.stringify({ error: "owner_token is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    const db = await loadDB();
    const qrRecord = db.dynamic_qr_codes.find((q) =>
      q.owner_token === owner_token
    );

    if (!qrRecord) {
      return new Response(
        JSON.stringify({ error: "QR code not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Update fields
    if (destination_url) qrRecord.destination_url = destination_url;
    if (max_scans !== undefined) qrRecord.max_scans = max_scans;
    if (expires_at !== undefined) qrRecord.expires_at = expires_at;

    await saveDB(db);

    return new Response(
      JSON.stringify({
        success: true,
        short_code: qrRecord.short_code,
        destination_url: qrRecord.destination_url,
        scan_count: qrRecord.scan_count,
        max_scans: qrRecord.max_scans,
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
}

// ===================================================================
// GET DYNAMIC QR ENDPOINT (For edit page)
// ===================================================================

async function handleGetDynamicQR(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const ownerToken = url.searchParams.get("token");

  if (!ownerToken) {
    return new Response(
      JSON.stringify({ error: "owner_token is required" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }

  const db = await loadDB();
  const qrRecord = db.dynamic_qr_codes.find((q) =>
    q.owner_token === ownerToken
  );

  if (!qrRecord) {
    return new Response(
      JSON.stringify({ error: "QR code not found" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      },
    );
  }

  return new Response(
    JSON.stringify({
      short_code: qrRecord.short_code,
      destination_url: qrRecord.destination_url,
      scan_count: qrRecord.scan_count,
      max_scans: qrRecord.max_scans,
      expires_at: qrRecord.expires_at,
      created_at: qrRecord.created_at,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ===================================================================
// RENDER QR ENDPOINT (Styled static SVG)
// ===================================================================

async function handleRenderQR(req: Request): Promise<Response> {
  try {
    const params = await getRenderQRParams(req);

    if (!params.data) {
      return jsonError("QR data is required", 400);
    }

    if (params.data.length > QR_MAX_DATA_LENGTH) {
      return jsonError(`QR data is too long (max ${QR_MAX_DATA_LENGTH})`, 413);
    }

    const svg = renderStyledQrSvg(params.data, params.style, params.size);

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error));
  }
}

// ===================================================================
// HELPERS
// ===================================================================

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function getRenderQRParams(req: Request): Promise<{
  data: string;
  style: RenderStyleName;
  size: number;
}> {
  const url = new URL(req.url);
  let data = url.searchParams.get("d") || url.searchParams.get("data") || "";
  let style = normalizeStyle(
    url.searchParams.get("s") || url.searchParams.get("style"),
  );
  let size = normalizeSize(url.searchParams.get("size"));

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    if (typeof body.data === "string") data = body.data;
    if (typeof body.style === "string") style = normalizeStyle(body.style);
    if (typeof body.size === "number" || typeof body.size === "string") {
      size = normalizeSize(String(body.size));
    }
  }

  return { data, style, size };
}

function normalizeStyle(style: string | null): RenderStyleName {
  if (style && style in QR_STYLES) return style as RenderStyleName;
  return "sunset";
}

function normalizeSize(size: string | null): number {
  const parsed = Number.parseInt(size || "", 10);
  if (!Number.isFinite(parsed)) return QR_DEFAULT_SIZE;
  return Math.min(QR_MAX_SIZE, Math.max(QR_MIN_SIZE, parsed));
}

function renderStyledQrSvg(
  data: string,
  styleName: RenderStyleName,
  size: number,
): string {
  const qr = QRCode.create(data, {
    errorCorrectionLevel: "Q",
    margin: 0,
  });
  const moduleCount = qr.modules.size;
  const viewSize = moduleCount + QR_QUIET_ZONE * 2;
  const style = QR_STYLES[styleName];
  const backgroundPaint = getPaint(
    "passportBackground",
    style.background,
    "#FFF8F0",
  );
  const dotPaint = getPaint("passportDots", style.dots, "#111827");
  const cells: string[] = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qr.modules.data[row * moduleCount + column]) continue;

      cells.push(
        `<rect x="${column + QR_QUIET_ZONE}" y="${
          row + QR_QUIET_ZONE
        }" width="1" height="1" rx="0.28" ry="0.28" fill="${dotPaint.fill}" />`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewSize} ${viewSize}" role="img" aria-label="QRBuddy QR code" shape-rendering="geometricPrecision">`,
    "<defs>",
    backgroundPaint.definition,
    dotPaint.definition,
    "</defs>",
    `<rect width="${viewSize}" height="${viewSize}" rx="3.5" fill="${backgroundPaint.fill}" />`,
    cells.join(""),
    "</svg>",
  ].join("");
}

function getPaint(id: string, paint: PaintConfig, fallbackColor: string): {
  definition: string;
  fill: string;
} {
  if (!paint.gradient?.colorStops?.length) {
    return { definition: "", fill: escapeXml(paint.color || fallbackColor) };
  }

  const stops = paint.gradient.colorStops
    .map((stop) =>
      `<stop offset="${Number(stop.offset) * 100}%" stop-color="${
        escapeXml(stop.color)
      }" />`
    )
    .join("");

  if (paint.gradient.type === "radial") {
    return {
      definition:
        `<radialGradient id="${id}" cx="50%" cy="50%" r="72%">${stops}</radialGradient>`,
      fill: `url(#${id})`,
    };
  }

  const rotation = Number.isFinite(paint.gradient.rotation)
    ? paint.gradient.rotation
    : 45;

  return {
    definition:
      `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${rotation} .5 .5)">${stops}</linearGradient>`,
    fill: `url(#${id})`,
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function serveBoomPage(): Response {
  const boomHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>💥 KABOOM! - QRBuddy</title>
  <style>
    body { margin: 0; font-family: system-ui; background: linear-gradient(135deg, #ff9a56, #ff6b6b, #feca57); min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .container { text-align: center; padding: 2rem; max-width: 600px; }
    .box { background: black; border: 8px solid #feca57; border-radius: 24px; padding: 3rem; box-shadow: 12px 12px 0 rgba(255,107,107,0.5), 24px 24px 0 rgba(255,230,109,0.3); }
    h1 { font-size: 6rem; color: #feca57; margin: 1rem 0; text-shadow: 3px 3px 0 #ff6b6b; }
    .ascii { font-family: monospace; font-size: 1.5rem; color: #feca57; white-space: pre; }
    .message { font-size: 2rem; color: white; font-weight: bold; margin: 2rem 0; }
    .info { background: #feca57; color: black; padding: 1.5rem; border-radius: 16px; border: 4px solid black; font-size: 1.1rem; font-weight: 600; margin: 2rem 0; }
    .footer { color: #feca57; font-size: 1.2rem; margin-top: 2rem; }
    a { display: inline-block; margin-top: 2rem; padding: 1rem 2rem; background: #feca57; color: black; text-decoration: none; font-weight: bold; border-radius: 12px; border: 4px solid black; box-shadow: 4px 4px 0 rgba(0,0,0,0.3); transition: all 0.2s; }
    a:hover { transform: scale(1.05); box-shadow: 6px 6px 0 rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div class="container">
    <div class="box">
      <div class="ascii">     \\  |  /
      \\ | /
    -- BOOM --
      / | \\
     /  |  \\</div>
      <h1>KABOOM!</h1>
      <div class="message">THIS FILE<br/>ALREADY EXPLODED</div>
      <div class="info">
        One-time use only.<br/>
        Someone already grabbed it.<br/>
        It's gone forever.
      </div>
      <div class="footer">The ephemeral nature of digital existence</div>
      <a href="http://localhost:8004">← Back to QRBuddy</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(boomHtml, {
    headers: { "Content-Type": "text/html" },
    status: 410,
  });
}

// ===================================================================
// MAIN SERVER
// ===================================================================

function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return Promise.resolve(new Response("ok", { headers: corsHeaders }));
  }

  const url = new URL(req.url);

  // Route requests
  if (url.pathname === "/upload-file" && req.method === "POST") {
    return handleUploadFile(req);
  }

  if (url.pathname === "/get-file" && req.method === "GET") {
    return handleGetFile(req);
  }

  if (url.pathname === "/create-dynamic-qr" && req.method === "POST") {
    return handleCreateDynamicQR(req);
  }

  if (url.pathname === "/redirect-qr" && req.method === "GET") {
    return handleRedirectQR(req);
  }

  if (url.pathname === "/update-dynamic-qr" && req.method === "POST") {
    return handleUpdateDynamicQR(req);
  }

  if (url.pathname === "/get-dynamic-qr" && req.method === "GET") {
    return handleGetDynamicQR(req);
  }

  if (
    url.pathname === "/render-qr" &&
    (req.method === "GET" || req.method === "POST")
  ) {
    return handleRenderQR(req);
  }

  return Promise.resolve(
    new Response("QRBuddy Local API Server - Not Found", { status: 404 }),
  );
}

console.log(`🚀 QRBuddy Local API running on http://localhost:${PORT}`);
console.log(`📁 Files stored in: ${FILES_DIR}`);
console.log(`📊 Database: ${DB_FILE}`);

await serve(handler, { port: PORT });
