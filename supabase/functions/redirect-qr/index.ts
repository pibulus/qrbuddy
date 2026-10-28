// Edge Function: Dynamic QR Redirect
// Privacy-conscious editable redirects. Each scan logs COARSE analytics for
// the owner's dashboard (device type / os / browser / country / city from CF
// headers) — no IP addresses, no raw user agents, no cross-site tracking.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import {
  createNeutralFiniteQrPreviewResponse,
  isLinkPreviewBot,
} from "../_shared/dynamic-qr-preview.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import { isQrUnbranded } from "../_shared/splash-validation.ts";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function hourInTimeZone(date: Date, timeZone: string): number | null {
  try {
    const hourText = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).find((part) => part.type === "hour")?.value;
    const hour = Number(hourText);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null;
  }
}

function redirectWithCors(path: string, request?: Request, status = 302) {
  return new Response(null, {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Cache-Control": "no-store, max-age=0",
      "Location": path,
    },
  });
}

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
    return createCorsResponse(req);
  }

  try {
    // Rate limiting: 100 redirects per minute per IP
    const clientIP = getClientIP(req);
    const rateLimitResult = await checkRateLimit(clientIP, {
      scope: "redirect-qr",
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    });

    if (rateLimitResult.isLimited) {
      // For redirects, we return JSON rather than redirecting
      return createRateLimitResponse(rateLimitResult, getCorsHeaders(req));
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
      .maybeSingle();

    if (fetchError) {
      console.error("QR lookup failed:", fetchError.message);
      return new Response("Temporary redirect failure. Please retry.", {
        status: 503,
        headers: {
          ...getCorsHeaders(req),
          "Retry-After": "5",
          "Cache-Control": "no-store",
        },
      });
    }
    if (!qr) {
      // QR doesn't exist - redirect to home
      return redirectWithCors("/", req);
    }

    // Check if QR is active
    if (!qr.is_active) {
      return redirectWithCors("/boom", req);
    }

    // Check if expired
    if (qr.expires_at) {
      const now = new Date();
      const expiry = new Date(qr.expires_at);
      if (now >= expiry) {
        // Mark as inactive and redirect to KABOOM
        await supabase
          .from("dynamic_qr_codes")
          .update({ is_active: false })
          .eq("short_code", shortCode);
        return redirectWithCors("/boom", req);
      }
    }

    const userAgent = req.headers.get("user-agent") || "";
    const isPreviewBot = isLinkPreviewBot(userAgent);

    if (isPreviewBot && qr.max_scans !== null) {
      return createNeutralFiniteQrPreviewResponse(getCorsHeaders(req));
    }

    let scanIndex: number;
    if (isPreviewBot) {
      // Unlimited QRs have no protected scan allowance to consume.
      const currentCount = Number(qr.scan_count) || 0;
      if (qr.max_scans !== null && currentCount >= qr.max_scans) {
        return redirectWithCors("/boom", req);
      }
      scanIndex = currentCount;
    } else {
      // Atomically increment scan count and get the new value.
      // increment_scan_count serializes concurrent scans and enforces limits.
      const { data: newScanCount, error: scanCountError } = await supabase
        .rpc("increment_scan_count", { p_short_code: shortCode });

      if (scanCountError) {
        console.error("Scan counter RPC failed:", scanCountError.message);
        return new Response(
          JSON.stringify({
            error: "Temporary redirect failure. Please retry.",
          }),
          {
            status: 503,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
              "Retry-After": "5",
              "Cache-Control": "no-store, max-age=0",
            },
          },
        );
      }

      if (newScanCount === -1) {
        // The QR is missing, inactive, or its scan limit has been reached.
        // Marking it inactive is safe only for this explicit denied result.
        await supabase
          .from("dynamic_qr_codes")
          .update({ is_active: false })
          .eq("short_code", shortCode);
        return redirectWithCors("/boom", req);
      }

      if (!Number.isInteger(newScanCount) || newScanCount < 1) {
        console.error("Unexpected scan counter result:", newScanCount);
        return new Response(
          JSON.stringify({
            error: "Temporary redirect failure. Please retry.",
          }),
          {
            status: 503,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
              "Retry-After": "5",
              "Cache-Control": "no-store, max-age=0",
            },
          },
        );
      }

      // The scan index for routing is the pre-increment value (0-based).
      scanIndex = newScanCount - 1;
    }

    // --------------------------------------------------------------------------
    // 1. ANALYTICS LOGGING (Fire and Forget)
    // --------------------------------------------------------------------------
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

    // Log scan analytics (fire and forget - don't block redirect)
    if (!isPreviewBot) {
      supabase
        .from("scan_logs")
        .insert({
          qr_id: qr.id,
          device_type: deviceType,
          os: os,
          browser: browser,
          country: country,
          city: city,
        })
        .then(({ error }) => {
          if (error) console.error("Scan log insert failed:", error.message);
        });
    }

    // --------------------------------------------------------------------------
    // 2. SMART ROUTING ENGINE
    // --------------------------------------------------------------------------
    let destinationUrl = qr.destination_url;
    let isRouletteMode = false;
    let rouletteUrls: string[] = [];
    let rouletteDailySpins: number | null = null;

    if (qr.routing_mode === "sequential" && qr.routing_config) {
      try {
        const config = typeof qr.routing_config === "string"
          ? JSON.parse(qr.routing_config)
          : qr.routing_config;

        const urls = (config.urls || []).filter(
          (u: unknown): u is string =>
            typeof u === "string" && isValidRedirectUrl(u),
        );
        const loop = config.loop || false;
        const random = config.random === true;
        const dailySpins = typeof config.dailySpins === "number" &&
            Number.isInteger(config.dailySpins) &&
            config.dailySpins >= 1 &&
            config.dailySpins <= 99
          ? config.dailySpins
          : null;

        if (urls.length > 0) {
          let index = 0;
          if (random) {
            index = Math.floor(Math.random() * urls.length);
            isRouletteMode = true;
            rouletteUrls = urls;
            rouletteDailySpins = dailySpins;
          } else if (loop) {
            index = scanIndex % urls.length;
          } else {
            index = Math.min(scanIndex, urls.length - 1);
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
      // TIME ROUTING - uses scanner's timezone via Cloudflare header,
      // falls back to config.timezone IANA string, then UTC
      try {
        const config = typeof qr.routing_config === "string"
          ? JSON.parse(qr.routing_config)
          : qr.routing_config;

        const now = new Date();
        const scannerTimezone = req.headers.get("cf-timezone");
        const configuredTimezone = typeof config.timezone === "string"
          ? config.timezone
          : "UTC";
        const localHour =
          (scannerTimezone ? hourInTimeZone(now, scannerTimezone) : null) ??
            hourInTimeZone(now, configuredTimezone) ?? now.getUTCHours();

        // Fall back to business hours when config holds garbage — NaN
        // comparisons would otherwise silently route every scan inactive.
        const parsedStart = parseInt(config.startHour, 10);
        const parsedEnd = parseInt(config.endHour, 10);
        const startHour =
          Number.isInteger(parsedStart) && parsedStart >= 0 && parsedStart <= 23
            ? parsedStart
            : 9;
        const endHour =
          Number.isInteger(parsedEnd) && parsedEnd >= 0 && parsedEnd <= 24
            ? parsedEnd
            : 17;

        const isWithinActiveHours = startHour < endHour
          ? localHour >= startHour && localHour < endHour
          : startHour > endHour &&
            (localHour >= startHour || localHour < endHour);

        if (isWithinActiveHours) {
          if (config.activeUrl) destinationUrl = config.activeUrl;
        } else {
          if (config.inactiveUrl) destinationUrl = config.inactiveUrl;
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
      return redirectWithCors("/", req);
    }

    // --------------------------------------------------------------------------
    // 3. SPLASH PAGE & ROULETTE DAILY LOCK MIDDLEWARE
    // --------------------------------------------------------------------------
    if (
      (qr.splash_config && qr.splash_config.enabled) ||
      (isRouletteMode && rouletteDailySpins !== null)
    ) {
      const splash = qr.splash_config || {};
      const {
        title = isRouletteMode ? "Roulette Draw" : "Welcome",
        buttonText = isRouletteMode ? "Open result" : "Continue",
        imageUrl,
        description,
      } = splash;

      let safeImageUrl: string | null = null;
      if (imageUrl) {
        try {
          const parsed = new URL(imageUrl);
          if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            safeImageUrl = parsed.href;
          }
        } catch { /* drop invalid image URL */ }
      }

      const safeTitle = escapeHtml(title);
      const safeButtonText = escapeHtml(buttonText);
      const safeDescription = description ? escapeHtml(description) : null;
      const isUnbranded = isQrUnbranded(qr);
      const imgHtml = safeImageUrl
        ? `<div class="image-container"><img src="${
          escapeHtml(safeImageUrl)
        }" alt="Splash Image"></div>`
        : "";
      const footerHtml = isUnbranded ? "" : `<div class="footer-tag">
              <a href="https://qrbuddy.app" target="_blank" rel="noopener" class="footer-pill">
                <span>⚡</span>
                <span>Built with <strong>QRBuddy</strong> · Free forever</span>
              </a>
            </div>`;

      const rouletteBlockHtml = isRouletteMode
        ? `<div id="roulette-stage" class="roulette-box">
             <div id="roulette-badge" class="roulette-badge">🎲 Roulette Draw</div>
             <div id="roulette-slot" class="roulette-slot">${
          escapeHtml(destinationUrl)
        }</div>
           </div>
           <button id="roulette-respin" type="button" class="respin-btn" hidden>🎲 Spin again</button>`
        : "";

      const rouletteScriptHtml = isRouletteMode
        ? `<script>
            (function() {
              var urls = ${
          JSON.stringify(rouletteUrls).replace(/</g, "\\u003c")
        };
              var serverPick = ${
          JSON.stringify(destinationUrl).replace(/</g, "\\u003c")
        };
              var dailyLimit = ${
          rouletteDailySpins === null ? "null" : String(rouletteDailySpins)
        };
              var code = ${JSON.stringify(shortCode).replace(/</g, "\\u003c")};
              var cta = document.getElementById("roulette-cta");
              var slot = document.getElementById("roulette-slot");
              var badge = document.getElementById("roulette-badge");
              var respinBtn = document.getElementById("roulette-respin");
              if (!cta || !slot || !badge || !urls.length) return;

              function labelFor(raw) {
                try {
                  var u = new URL(raw);
                  var p = u.pathname && u.pathname !== "/" ? u.pathname : "";
                  return (u.hostname.replace(/^www\\./, "") + p).slice(0, 42);
                } catch (_) {
                  return String(raw).slice(0, 42);
                }
              }

              var now = new Date();
              var dayKey = now.getFullYear() + "-" +
                String(now.getMonth() + 1).padStart(2, "0") + "-" +
                String(now.getDate()).padStart(2, "0");
              var storageKey = "qrb_spin_qr_" + code.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + dayKey;

              function readState() {
                try {
                  var raw = localStorage.getItem(storageKey);
                  if (!raw) return { count: 0, lastValue: null };
                  var p = JSON.parse(raw);
                  return {
                    count: Number.isInteger(p.count) && p.count >= 0 ? p.count : 0,
                    lastValue: typeof p.lastValue === "string" && urls.indexOf(p.lastValue) !== -1 ? p.lastValue : null
                  };
                } catch (_) {
                  return { count: 0, lastValue: null };
                }
              }

              function writeState(count, lastValue) {
                try {
                  localStorage.setItem(storageKey, JSON.stringify({
                    count: count,
                    lastIndex: urls.indexOf(lastValue),
                    lastValue: lastValue
                  }));
                } catch (_) {}
              }

              function updateUi(chosen, count, locked) {
                cta.setAttribute("href", chosen);
                slot.textContent = labelFor(chosen);
                if (dailyLimit !== null) {
                  if (locked || count >= dailyLimit) {
                    badge.textContent = "🔒 Daily roll locked (" + Math.min(count, dailyLimit) + "/" + dailyLimit + " today) · Resets tomorrow";
                    if (respinBtn) respinBtn.hidden = true;
                  } else {
                    var rem = Math.max(0, dailyLimit - count);
                    badge.textContent = "🎲 Roll " + count + " of " + dailyLimit + " today";
                    if (respinBtn) {
                      respinBtn.hidden = rem <= 0;
                      respinBtn.textContent = "🎲 Spin again (" + rem + " left today)";
                    }
                  }
                } else {
                  badge.textContent = "🎲 Rolled option " + (urls.indexOf(chosen) + 1) + " of " + urls.length;
                  if (respinBtn) {
                    respinBtn.hidden = urls.length < 2;
                    respinBtn.textContent = "🎲 Spin again";
                  }
                }
              }

              function runSpin(targetUrl, onDone) {
                if (urls.length < 2) {
                  onDone(targetUrl);
                  return;
                }
                var steps = 10;
                var step = 0;
                badge.textContent = "🎲 Spinning...";
                var tick = function() {
                  step++;
                  if (step < steps) {
                    slot.textContent = labelFor(urls[(step + Math.floor(Math.random() * urls.length)) % urls.length]);
                    if (navigator.vibrate) navigator.vibrate(8);
                    setTimeout(tick, 45 + step * 14);
                  } else {
                    if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
                    onDone(targetUrl);
                  }
                };
                tick();
              }

              var st = readState();
              if (dailyLimit !== null && st.count >= dailyLimit && st.lastValue) {
                updateUi(st.lastValue, st.count, true);
              } else {
                var initialPick = urls.indexOf(serverPick) !== -1 ? serverPick : urls[0];
                runSpin(initialPick, function(finalUrl) {
                  var nextCount = st.count + 1;
                  writeState(nextCount, finalUrl);
                  updateUi(finalUrl, nextCount, false);
                });
              }

              if (respinBtn) {
                respinBtn.addEventListener("click", function() {
                  var cur = readState();
                  if (dailyLimit !== null && cur.count >= dailyLimit) {
                    updateUi(cur.lastValue || serverPick, cur.count, true);
                    return;
                  }
                  var currentHref = cta.getAttribute("href") || serverPick;
                  var curIdx = urls.indexOf(currentHref);
                  var nextIdx = urls.length > 1
                    ? (curIdx + 1 + Math.floor(Math.random() * (urls.length - 1))) % urls.length
                    : 0;
                  var nextPick = urls[nextIdx];
                  runSpin(nextPick, function(finalUrl) {
                    var nextCount = cur.count + 1;
                    writeState(nextCount, finalUrl);
                    updateUi(finalUrl, nextCount, false);
                  });
                });
              }
            })();
          </script>`
        : "";

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${safeTitle}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: linear-gradient(135deg, #FAF8F5 0%, #FFE5F0 50%, #FFF5EB 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              min-height: 100dvh;
              margin: 0;
              padding: 24px;
              color: #1e1714;
            }
            .card {
              background: #fffef7;
              border-radius: 28px;
              box-shadow: 6px 6px 0px 0px #1e1714;
              padding: 36px 28px;
              width: 100%;
              max-width: 420px;
              text-align: center;
              border: 4px solid #1e1714;
              position: relative;
            }
            .image-container {
              margin-bottom: 24px;
              border-radius: 18px;
              overflow: hidden;
              border: 3px solid #1e1714;
              background: #fdf2f8;
              box-shadow: 3px 3px 0px 0px #1e1714;
            }
            img {
              width: 100%;
              height: auto;
              display: block;
              max-height: 260px;
              object-fit: cover;
            }
            h1 {
              font-size: 26px;
              font-weight: 900;
              margin: 0 0 12px 0;
              color: #1e1714;
              letter-spacing: -0.02em;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            p {
              color: #4b5563;
              margin: 0 0 24px 0;
              line-height: 1.6;
              font-size: 15px;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            .roulette-box {
              background: #fbf1e4;
              border: 3px solid #1e1714;
              border-radius: 18px;
              padding: 14px 16px;
              margin: 0 0 20px 0;
              box-shadow: 3px 3px 0px 0px #1e1714;
            }
            .roulette-badge {
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              color: #6e6058;
              margin-bottom: 6px;
            }
            .roulette-slot {
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
              font-size: 15px;
              font-weight: 800;
              color: #1e1714;
              word-break: break-all;
            }
            .btn {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #1e1714;
              color: #fffef7;
              font-weight: 800;
              font-size: 18px;
              padding: 16px 24px;
              border-radius: 16px;
              text-decoration: none;
              border: 3px solid #1e1714;
              box-shadow: 4px 4px 0px 0px #FF69B4;
              transition: transform 0.1s ease, box-shadow 0.1s ease;
              width: 100%;
              cursor: pointer;
            }
            .btn:hover {
              transform: translate(-1px, -1px);
              box-shadow: 5px 5px 0px 0px #FF69B4;
            }
            .btn:active {
              transform: translate(2px, 2px);
              box-shadow: 2px 2px 0px 0px #FF69B4;
            }
            .respin-btn {
              margin-top: 12px;
              width: 100%;
              min-height: 42px;
              padding: 10px 16px;
              border-radius: 999px;
              border: 2px solid #1e1714;
              background: #fef3c7;
              color: #1e1714;
              font-weight: 800;
              font-size: 13px;
              cursor: pointer;
              box-shadow: 2px 2px 0px 0px #1e1714;
            }
            .footer-tag {
              margin-top: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .footer-pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #fdf2f8;
              border: 2px solid #1e1714;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 11px;
              font-weight: 800;
              color: #1e1714;
              text-decoration: none;
              box-shadow: 2px 2px 0px 0px #1e1714;
              transition: transform 0.1s ease, box-shadow 0.1s ease;
            }
            .footer-pill:hover {
              transform: translate(-1px, -1px);
              box-shadow: 3px 3px 0px 0px #1e1714;
            }
            .footer-pill:active {
              transform: translate(1px, 1px);
              box-shadow: 1px 1px 0px 0px #1e1714;
            }
            @media (max-width: 480px) {
              body {
                padding: 16px;
              }
              .card {
                padding: 28px 18px;
                border-radius: 22px;
              }
              h1 {
                font-size: 22px;
              }
              .btn {
                font-size: 16px;
                padding: 14px 20px;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .btn, .footer-pill {
                transition: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${imgHtml}
            <h1>${safeTitle}</h1>
            ${safeDescription ? `<p>${safeDescription}</p>` : ""}
            ${rouletteBlockHtml}
            <a id="roulette-cta" href="${
        escapeHtml(destinationUrl)
      }" class="btn">${safeButtonText} →</a>
            ${footerHtml}
          </div>
          ${rouletteScriptHtml}
        </body>
        </html>
      `;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, max-age=0",
          ...getCorsHeaders(req),
        },
      });
    }

    // Redirect to destination
    return redirectWithCors(destinationUrl, req);
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
    return redirectWithCors("/", req);
  }
});
