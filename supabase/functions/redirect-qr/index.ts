// Edge Function: Dynamic QR Redirect
// Privacy-first editable redirects with NO tracking/analytics

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { corsHeaders } from "../_shared/cors.ts";


/**
 * Validate URL for redirect to prevent open redirect attacks
 * Relaxed validation to allow "weird utility" protocols
 */
function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return [
      "http:",
      "https:",
      "wifi:",
      "mailto:",
      "tel:",
      "sms:",
      "facetime:",
    ].includes(parsed.protocol);
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Rate limiting: 100 redirects per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = checkRateLimit(clientIP, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    });

    if (rateLimitResult.isLimited) {
      // For redirects, we return JSON rather than redirecting
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");

    if (!shortCode) {
      return new Response("No short code provided", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch the dynamic QR record
    const { data: qr, error: fetchError } = await supabase
      .from("dynamic_qr_codes")
      .select("*")
      .eq("short_code", shortCode)
      .single();

    if (fetchError || !qr) {
      // QR doesn't exist - redirect to home
      return Response.redirect("/", 302);
    }

    // Check if QR is active
    if (!qr.is_active) {
      return Response.redirect("/boom", 302);
    }

    // Check if expired
    if (qr.expires_at) {
      const now = new Date();
      const expiry = new Date(qr.expires_at);
      if (now > expiry) {
        // Mark as inactive and redirect to KABOOM
        await supabase
          .from("dynamic_qr_codes")
          .update({ is_active: false })
          .eq("short_code", shortCode);
        return Response.redirect("/boom", 302);
      }
    }

    // Check if max scans reached
    if (qr.max_scans && qr.scan_count >= qr.max_scans) {
      // Mark as inactive and redirect to KABOOM
      await supabase
        .from("dynamic_qr_codes")
        .update({ is_active: false })
        .eq("short_code", shortCode);
      return Response.redirect("/boom", 302);
    }

    // --------------------------------------------------------------------------
    // 1. ANALYTICS LOGGING (Fire and Forget)
    // --------------------------------------------------------------------------
    const userAgent = req.headers.get("user-agent") || "";
    const country = req.headers.get("cf-ipcountry") || "Unknown"; // Cloudflare header
    const city = req.headers.get("cf-ipcity") || "Unknown";

    // Simple UA Parsing
    let deviceType = "desktop";
    let os = "other";
    let browser = "other";

    const ua = userAgent.toLowerCase();

    // OS Detection
    if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
      os = "ios";
    } else if (ua.includes("android")) os = "android";
    else if (ua.includes("mac os")) os = "macos";
    else if (ua.includes("windows")) os = "windows";
    else if (ua.includes("linux")) os = "linux";

    // Device Type Detection
    if (ua.includes("mobile")) deviceType = "mobile";
    if (ua.includes("tablet") || ua.includes("ipad")) deviceType = "tablet";
    if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) {
      deviceType = "bot";
    }

    // Browser Detection
    if (ua.includes("chrome")) browser = "chrome";
    else if (ua.includes("safari")) browser = "safari";
    else if (ua.includes("firefox")) browser = "firefox";
    else if (ua.includes("edge")) browser = "edge";

    // Log to DB (Async - don't await to keep redirect fast?)
    // Actually, for Edge Functions, we should await or use EdgeRuntime.waitUntil if available.
    // Deno Deploy doesn't support waitUntil yet in standard serve, so we await but keep it fast.
    const logPromise = supabase
      .from("scan_logs")
      .insert({
        qr_id: qr.id,
        device_type: deviceType,
        os: os,
        browser: browser,
        country: country,
        city: city,
      });

    // Increment scan count (Legacy counter)
    const countPromise = supabase
      .from("dynamic_qr_codes")
      .update({ scan_count: qr.scan_count + 1 })
      .eq("short_code", shortCode);

    // Run DB updates in parallel
    await Promise.all([logPromise, countPromise]);

    // --------------------------------------------------------------------------
    // 2. SMART ROUTING ENGINE
    // --------------------------------------------------------------------------
    let destinationUrl = qr.destination_url;

    if (qr.routing_mode === "sequential" && qr.routing_config) {
      // ... (Existing Sequential Logic) ...
      try {
        const config = typeof qr.routing_config === "string"
          ? JSON.parse(qr.routing_config)
          : qr.routing_config;

        const urls = config.urls || [];
        const loop = config.loop || false;

        if (urls.length > 0) {
          let index = 0;
          if (loop) {
            index = qr.scan_count % urls.length;
          } else {
            index = Math.min(qr.scan_count, urls.length - 1);
          }
          destinationUrl = urls[index];
        }
      } catch (e) {
        console.error("Error parsing sequential config:", e);
      }
    } else if (qr.routing_mode === "device" && qr.routing_config) {
      // DEVICE ROUTING
      try {
        const config = typeof qr.routing_config === "string"
          ? JSON.parse(qr.routing_config)
          : qr.routing_config;

        if (os === "ios" && config.ios) destinationUrl = config.ios;
        else if (os === "android" && config.android) {
          destinationUrl = config.android;
        } else if (config.fallback) destinationUrl = config.fallback;
      } catch (e) {
        console.error("Error parsing device config:", e);
      }
    } else if (qr.routing_mode === "time" && qr.routing_config) {
      // TIME ROUTING
      try {
        const config = typeof qr.routing_config === "string"
          ? JSON.parse(qr.routing_config)
          : qr.routing_config;

        // Config format: { startTime: "09:00", endTime: "17:00", activeUrl: "...", inactiveUrl: "..." }
        // We assume the time is in the user's target timezone or UTC?
        // For MVP, let's assume UTC or server time, or simple hour check.
        // Better: Store timezone in config, or just use simple HH:MM comparison against UTC?
        // Let's stick to simple UTC for now or allow user to specify offset.
        // Actually, let's keep it simple: "Work Hours" (9-5) usually implies local time.
        // But we don't know the user's local time easily without complex UI.
        // Let's implement a simple "Current Hour" check based on a provided timezone offset in config.

        const now = new Date();
        const utcHour = now.getUTCHours();
        const offset = config.timezoneOffset || 0; // Hours offset from UTC
        const localHour = (utcHour + offset + 24) % 24;

        const startHour = parseInt(config.startHour || "9");
        const endHour = parseInt(config.endHour || "17");

        if (localHour >= startHour && localHour < endHour) {
          destinationUrl = config.activeUrl;
        } else {
          destinationUrl = config.inactiveUrl;
        }
      } catch (e) {
        console.error("Error parsing time config:", e);
      }
    }


    // Validate URL before redirecting to prevent open redirect attacks
    if (!isValidRedirectUrl(destinationUrl)) {
      console.error("[SECURITY] Invalid redirect URL blocked:", {
        url: destinationUrl,
        shortCode: shortCode,
        timestamp: new Date().toISOString(),
      });
      // Redirect to home instead of malicious URL
      return Response.redirect("/", 302);
    }

    // --------------------------------------------------------------------------
    // 3. SPLASH PAGE MIDDLEWARE
    // --------------------------------------------------------------------------
    if (qr.splash_config && qr.splash_config.enabled) {
      const {
        title = "Welcome",
        buttonText = "Continue",
        imageUrl,
        description,
      } = qr.splash_config;

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 24px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
              padding: 32px;
              width: 100%;
              max-width: 400px;
              text-align: center;
              border: 4px solid black;
            }
            .image-container {
              margin-bottom: 24px;
              border-radius: 16px;
              overflow: hidden;
              border: 3px solid black;
              background: #eee;
            }
            img {
              width: 100%;
              height: auto;
              display: block;
            }
            h1 {
              font-size: 24px;
              font-weight: 900;
              margin: 0 0 12px 0;
              color: #111827;
            }
            p {
              color: #4b5563;
              margin: 0 0 24px 0;
              line-height: 1.5;
            }
            .btn {
              display: inline-block;
              background: black;
              color: white;
              font-weight: 700;
              padding: 16px 32px;
              border-radius: 16px;
              text-decoration: none;
              transition: transform 0.1s;
              width: 100%;
              box-sizing: border-box;
              border: none;
              cursor: pointer;
              font-size: 18px;
            }
            .btn:active {
              transform: scale(0.98);
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${
        imageUrl
          ? `<div class="image-container"><img src="${imageUrl}" alt="Splash Image"></div>`
          : ""
      }
            <h1>${title}</h1>
            ${description ? `<p>${description}</p>` : ""}
            <a href="${destinationUrl}" class="btn">${buttonText}</a>
          </div>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders,
        },
      });
    }

    // Redirect to destination
    return Response.redirect(destinationUrl, 302);
  } catch (error) {
    // Log detailed error information for security monitoring
    console.error("[SECURITY] Redirect failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // For database/auth errors, show error page instead of silently redirecting
    if (
      error instanceof Error &&
      (error.message.includes("auth") ||
        error.message.includes("permission") ||
        error.message.includes("security"))
    ) {
      return new Response("Security error occurred", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // For all other errors, redirect to home as fallback
    return Response.redirect("/", 302);
  }
});
