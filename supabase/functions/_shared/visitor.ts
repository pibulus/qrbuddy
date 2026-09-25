// visitor.ts — what a request honestly tells you about who scanned, with the
// identifying bits used and thrown away in the same call.
//
// Country/city come from the edge headers (Cloudflare fronts Supabase
// functions). Device/OS are coarse buckets from the UA, then the UA is gone.
// The "people" hash is sha256(ip + day + secret): it lets a day tally
// uniques and returns, and tomorrow it is a different hash. The IP is never
// stored and cannot be recovered from the hash without the secret.

export interface Visitor {
  country: string | null;
  city: string | null;
  device: "mobile" | "tablet" | "desktop" | "bot";
  os: "ios" | "android" | "macos" | "windows" | "linux" | "other";
  referred: boolean;
  /** Primary language tag, e.g. "es", "en". */
  lang: string | null;
  /** Which app carried the link here (bucketed referrer host). */
  app: string | null;
  /** Rounded to 1 decimal (~10 km) — coarse on purpose. */
  lat: number | null;
  lon: number | null;
}

// Referrer host → the app people would recognise. Anything else is "web";
// QRBuddy itself (the maker clicking Open) doesn't count.
const APP_HOSTS: [RegExp, string][] = [
  [/whatsapp/, "WhatsApp"],
  [/instagram/, "Instagram"],
  [/facebook|fb\.com|fbcdn/, "Facebook"],
  [/messenger/, "Messenger"],
  [/t\.me|telegram/, "Telegram"],
  [/twitter|x\.com|t\.co/, "X"],
  [/tiktok/, "TikTok"],
  [/discord/, "Discord"],
  [/slack/, "Slack"],
  [/reddit/, "Reddit"],
  [/linkedin/, "LinkedIn"],
  [/snapchat/, "Snapchat"],
  [/mail\.google|outlook|mail\.yahoo|protonmail/, "Email"],
  [/google\./, "Google"],
];

function bucketApp(referer: string | null): string | null {
  if (!referer) return null;
  let host = "";
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.includes("qrbuddy")) return null;
  for (const [re, name] of APP_HOSTS) if (re.test(host)) return name;
  return "Web";
}

function coarse(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
}

export function describeVisitor(req: Request): Visitor {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();

  let os: Visitor["os"] = "other";
  if (/iphone|ipad|ipod/.test(ua)) os = "ios";
  else if (ua.includes("android")) os = "android";
  else if (ua.includes("mac os")) os = "macos";
  else if (ua.includes("windows")) os = "windows";
  else if (ua.includes("linux")) os = "linux";

  let device: Visitor["device"] = "desktop";
  if (ua.includes("mobile")) device = "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) device = "tablet";
  if (/bot|crawler|spider|preview|facebookexternalhit/.test(ua)) {
    device = "bot";
  }

  const country = req.headers.get("cf-ipcountry");
  const city = req.headers.get("cf-ipcity");
  // A QR scan opens the page with no referrer; a pasted/forwarded link
  // usually carries one. Free and honest "scan vs share" signal.
  const referer = req.headers.get("referer");
  const referred = Boolean(referer);
  const lang = (req.headers.get("accept-language") || "")
    .split(",")[0].trim().split("-")[0].toLowerCase() || null;

  return {
    country: country && country !== "XX" ? country : null,
    city: city ? decodeURIComponent(city) : null,
    device,
    os,
    referred,
    lang: lang && /^[a-z]{2,3}$/.test(lang) ? lang : null,
    app: bucketApp(referer),
    lat: coarse(req.headers.get("cf-iplatitude")),
    lon: coarse(req.headers.get("cf-iplongitude")),
  };
}

/** Daily-salted visitor hash. Same person, same day → same hash; next day →
 * unrelated. Needs SHARE_STATS_SALT in function secrets; without it the
 * hash is skipped (views still count, "people" just won't). */
export async function visitorDayHash(
  req: Request,
  day: string,
): Promise<string | null> {
  const salt = Deno.env.get("SHARE_STATS_SALT");
  if (!salt) return null;
  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  if (!ip) return null;
  const bytes = new TextEncoder().encode(`${ip}|${day}|${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Owner tokens for shares — same shape dynamic QRs use. */
export function generateOwnerToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** ISO date (UTC) + hour for the ledger. Owners see their week in UTC days,
 * which is close enough for "busiest night". */
export function dayAndHour(now = new Date()): { day: string; hour: number } {
  return { day: now.toISOString().slice(0, 10), hour: now.getUTCHours() };
}
