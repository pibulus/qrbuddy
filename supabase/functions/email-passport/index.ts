// Edge Function: Email Passport
// Emails the caller's own Passport key to an address they type. The key is a
// bearer capability, so this is deliberately narrow: verified key, rate limited,
// never stored, and never logged.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import { verifySupporterToken } from "../_shared/license.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL = 254;
const FROM = "QRBuddy <passport@qrbuddy.app>";

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function emailHtml(key: string): string {
  return `<!doctype html><html><body style="margin:0;background:#fbf1e4;color:#1e1714;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="background:#fffef7;border:2px solid #1e1714;border-radius:24px;padding:28px;box-shadow:0 3px 0 #1e1714">
      <p style="margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ec4899">QRBuddy Passport</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2">The key, kept safe.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55">Paste this key under <strong>Restore a Passport</strong> on any browser.</p>
      <p style="margin:0 0 20px;padding:14px;border:2px solid #1e1714;border-radius:14px;background:#fbf1e4;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all">${
    key.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  }</p>
      <p style="margin:0 0 20px"><a href="https://qrbuddy.app/" style="display:inline-block;padding:12px 18px;border:2px solid #1e1714;border-radius:999px;background:#ffbe0b;color:#1e1714;font-weight:800;text-decoration:none">Open QRBuddy</a></p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#57524b">Anyone with this key can use the Passport. Keep the email to yourself.</p>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse(req);
  if (req.method !== "POST") return json(req, { error: "Use POST" }, 405);

  try {
    const limited = await checkRateLimit(getClientIP(req), {
      scope: "email-passport",
      windowMs: 60 * 60 * 1000,
      maxRequests: 5,
    });
    if (limited.isLimited) {
      return createRateLimitResponse(limited, getCorsHeaders(req));
    }

    let body: { email?: unknown; pass?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "Invalid JSON body" }, 400);
    }

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const pass = typeof body.pass === "string" ? body.pass.trim() : "";
    if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return json(req, { error: "That email address looks off" }, 400);
    }
    if (pass.length < 20 || pass.length > 4096) {
      return json(req, { error: "That key looks off" }, 400);
    }

    const payload = await verifySupporterToken(pass);
    if (!payload) {
      return json(req, { error: "That key does not match" }, 401);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    if (!apiKey) {
      return json(req, { error: "Email is not set up yet" }, 503);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Your QRBuddy Passport key",
        html: emailHtml(pass),
        text:
          `Your QRBuddy Passport key:\n\n${pass}\n\nPaste it under "Restore a Passport" on any browser.\nKeep this email private — anyone with the key can use the Passport.\nhttps://qrbuddy.app/`,
      }),
    });

    if (!response.ok) {
      // Never log the address or the key.
      console.error("Resend rejected the email:", response.status);
      return json(req, { error: "The email did not send. Try again." }, 502);
    }

    return json(req, { ok: true });
  } catch (error) {
    console.error("Email passport failed:", error);
    return json(req, { error: "The email did not send. Try again." }, 500);
  }
});
