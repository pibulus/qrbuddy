import { Handlers } from "$fresh/server.ts";
import {
  fetchWithTimeout,
  getAuthHeaders,
  getSupabaseUrl,
} from "../utils/api.ts";

function routingUnavailable() {
  return new Response(
    "QRBuddy couldn't reach the routing service. Please try again shortly.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "5",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

// This route handles QR code redirects
// It forwards to the Supabase edge function which manages the actual redirect logic

const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 12;

function unlockCookieName(shortCode: string): string {
  return `qru_${shortCode.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function readCookie(req: Request, name: string): string {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function unlockCookieHeader(
  req: Request,
  shortCode: string,
  token: string,
): string {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${unlockCookieName(shortCode)}=${
    encodeURIComponent(token)
  }; Path=/r; Max-Age=${UNLOCK_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * A locked code is a page, not a redirect: the scanner types the PIN on
 * QRBuddy, and only then does the destination open.
 */
function pinPage(shortCode: string, invalid = false): Response {
  const code = escapeHtml(shortCode);
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Locked code</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 24px; background: #fff8ec; color: #1e1714;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
  main { width: 100%; max-width: 380px; border: 2px solid #1e1714; border-radius: 24px;
    background: #fffef7; padding: 26px 22px; box-shadow: 5px 5px 0 #1e1714; }
  h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
  p { margin: 8px 0 0; font-size: 14px; line-height: 1.5; color: #6b625b; }
  label { display: block; margin-top: 20px; font-size: 11px; font-weight: 900;
    letter-spacing: 0.14em; text-transform: uppercase; color: #6b625b; }
  input { width: 100%; margin-top: 7px; padding: 14px; font-size: 17px;
    border: 2px solid #1e1714; border-radius: 14px; background: #fffef7; }
  input:focus { outline: 3px solid #ffd166; outline-offset: 1px; }
  button { width: 100%; margin-top: 14px; padding: 15px; font-size: 15px;
    font-weight: 900; border: 2px solid #1e1714; border-radius: 14px;
    background: #ff6ac2; color: #1e1714; cursor: pointer; box-shadow: 3px 3px 0 #1e1714; }
  button:active { transform: translateY(2px); box-shadow: 1px 1px 0 #1e1714; }
  .error { margin-top: 12px; font-size: 13px; font-weight: 800; color: #b3266b; }
</style>
</head>
<body>
<main>
  <h1>This code is locked</h1>
  <p>Enter the PIN from whoever shared it. It opens for the rest of the day on this device.</p>
  <form method="post" action="/r?code=${encodeURIComponent(shortCode)}">
    <label for="pin">PIN or password</label>
    <input id="pin" name="pin" type="password" autocomplete="off"
      inputmode="text" autofocus required aria-describedby="pin-help" />
    <p id="pin-help" style="font-size:12px">Code <strong>${code}</strong></p>
    ${
      invalid
        ? '<p class="error" role="alert">That PIN did not match. Try again.</p>'
        : ""
    }
    <button type="submit">Unlock</button>
  </form>
</main>
</body>
</html>`,
    {
      status: invalid ? 401 : 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

/** Shared upstream call so GET and POST forward identical client context. */
async function callUpstream(
  req: Request,
  supabaseUrl: string,
  shortCode: string,
  extraHeaders: Record<string, string>,
): Promise<Response> {
  const forwardHeaders: Record<string, string> = {
    ...getAuthHeaders(),
    ...extraHeaders,
  };
  const clientHeaders = [
    "user-agent",
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "cf-ipcountry",
    "cf-ipcity",
    "cf-timezone",
    "accept-language",
  ];
  const MAX_FORWARDED_HEADER_LENGTH = 500;
  for (const headerName of clientHeaders) {
    const headerValue = req.headers.get(headerName);
    if (headerValue) {
      forwardHeaders[headerName] = headerValue.slice(
        0,
        MAX_FORWARDED_HEADER_LENGTH,
      );
    }
  }

  return await fetchWithTimeout(
    `${supabaseUrl}/functions/v1/redirect-qr?code=${
      encodeURIComponent(shortCode)
    }`,
    { headers: forwardHeaders, redirect: "manual" },
  );
}

export const handler: Handlers = {
  async GET(req, _ctx) {
    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");

    if (!shortCode) {
      // No code provided, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    // Forward to Supabase edge function for redirect logic
    const supabaseUrl = getSupabaseUrl();

    if (!supabaseUrl) {
      console.error("SUPABASE_URL not configured");
      return routingUnavailable();
    }

    const redirectUrl = `${supabaseUrl}/functions/v1/redirect-qr?code=${
      encodeURIComponent(shortCode)
    }`;

    // Forward scanner client headers to edge function so Device Routing (iOS/Android),
    // Time Routing (local scanner timezone), and IP-based analytics/rate-limiting work accurately.
    const forwardHeaders: Record<string, string> = {
      ...getAuthHeaders(),
    };

    const clientHeaders = [
      "user-agent",
      "cf-connecting-ip",
      "x-forwarded-for",
      "x-real-ip",
      "cf-ipcountry",
      "cf-ipcity",
      "cf-timezone",
      "accept-language",
    ];

    // Cap at a length no legitimate value of any of these headers approaches
    // (UAs run ~100-300 chars; country/city/timezone are single words) — a
    // scanner can put anything it wants in a request header, and cf-ipcountry/
    // cf-ipcity land straight in the scan_logs TEXT columns with no column
    // limit downstream. Bound here, at the one place these values cross from
    // "client-supplied" to "forwarded for storage."
    const MAX_FORWARDED_HEADER_LENGTH = 500;

    for (const headerName of clientHeaders) {
      const headerValue = req.headers.get(headerName);
      if (headerValue) {
        forwardHeaders[headerName] = headerValue.slice(
          0,
          MAX_FORWARDED_HEADER_LENGTH,
        );
      }
    }

    try {
      // Fetch with redirect: "manual" so the Fresh server doesn't proxy the third-party
      // destination website or crash on non-HTTP schemes (mailto:, tel:, sms:, wifi:, etc.)
      const unlock = readCookie(req, unlockCookieName(shortCode));
      if (unlock) forwardHeaders["x-qr-unlock"] = unlock;

      const response = await fetchWithTimeout(redirectUrl, {
        headers: forwardHeaders,
        redirect: "manual",
      });

      // Locked code: ask for the PIN instead of leaking the destination.
      if (response.status === 401) {
        const invalid = response.headers.get("X-QR-Pin-Invalid") === "1";
        return pinPage(shortCode, invalid);
      }

      // Handle redirect responses from edge function (301, 302, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location") ||
          response.headers.get("location");
        if (location) {
          const headers: Record<string, string> = {
            Location: location,
            "Cache-Control": "no-store, max-age=0",
          };
          const unlockToken = response.headers.get("X-QR-Unlock");
          if (unlockToken) {
            headers["Set-Cookie"] = unlockCookieHeader(
              req,
              shortCode,
              unlockToken,
            );
          }
          return new Response(null, { status: 302, headers });
        }
      }

      // Handle HTML responses (e.g. Intro / Splash Page & Roulette Spin Card).
      // Supabase Edge Runtime's gateway rewrites Content-Type to text/plain on
      // *.supabase.co/functions/v1/*, so detect HTML payloads and serve them as
      // text/html; charset=utf-8 so browsers render the card instead of raw text.
      if (response.status === 200) {
        const body = await response.text();
        const trimmed = body.trimStart();
        const isHtml = /^<!doctype\s+html/i.test(trimmed) ||
          /^<html[\s>]/i.test(trimmed);
        const contentType = isHtml
          ? "text/html; charset=utf-8"
          : (response.headers.get("Content-Type") ||
            "text/html; charset=utf-8");
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": response.headers.get("Cache-Control") ??
              "no-store, max-age=0",
          },
        });
      }

      // Expired / Limit reached / Inactive / Boom
      if (response.status === 410 || response.status === 404) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/boom",
            "Cache-Control": "no-store, max-age=0",
          },
        });
      }

      if (response.status === 429 || response.status >= 500) {
        return new Response(
          "QRBuddy couldn't route this code right now. Please try again shortly.",
          {
            status: response.status,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Retry-After": response.headers.get("Retry-After") ?? "5",
              "Cache-Control": "no-store, max-age=0",
            },
          },
        );
      }

      // If we got here with any other status, redirect to home
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    } catch (error) {
      console.error("[ROUTE:r] Redirect error:", error);
      return routingUnavailable();
    }
  },

  /**
   * PIN submission. Posting (not a query param) keeps the PIN out of history,
   * referrers and any proxy logs that would otherwise record the URL.
   */
  async POST(req, _ctx) {
    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");
    if (!shortCode) {
      return new Response(null, { status: 302, headers: { Location: "/" } });
    }

    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      console.error("SUPABASE_URL not configured");
      return routingUnavailable();
    }

    let pin = "";
    try {
      const form = await req.formData();
      pin = String(form.get("pin") ?? "").trim();
    } catch {
      pin = "";
    }
    if (!pin) return pinPage(shortCode, true);

    try {
      const response = await callUpstream(req, supabaseUrl, shortCode, {
        "x-qr-pin": pin.slice(0, 128),
      });

      if (response.status === 401) return pinPage(shortCode, true);

      const location = response.headers.get("Location") ??
        response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        const headers: Record<string, string> = {
          Location: location,
          "Cache-Control": "no-store, max-age=0",
        };
        const unlockToken = response.headers.get("X-QR-Unlock");
        if (unlockToken) {
          headers["Set-Cookie"] = unlockCookieHeader(
            req,
            shortCode,
            unlockToken,
          );
        }
        return new Response(null, { status: 302, headers });
      }

      // A splash page behind the PIN is still a valid destination.
      if (response.status === 200) {
        const body = await response.text();
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, max-age=0",
          },
        });
      }

      return new Response(null, {
        status: 302,
        headers: { Location: "/boom" },
      });
    } catch (error) {
      console.error("[ROUTE:r] PIN submission failed:", error);
      return routingUnavailable();
    }
  },
};
