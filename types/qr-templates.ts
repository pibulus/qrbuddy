// QR code type definitions
// Supports various QR code data formats beyond simple URLs

export type QRTemplateType =
  | "url"
  | "social"
  | "media"
  | "wifi"
  | "vcard"
  | "sms"
  | "email"
  | "phone"
  | "text";

export interface QRTemplate {
  type: QRTemplateType;
  label: string;
  icon: string;
  description: string;
}

export const QR_TEMPLATES: Record<QRTemplateType, QRTemplate> = {
  url: {
    type: "url",
    label: "Link",
    icon: "🔗",
    description: "Send scanners to a website or page",
  },
  social: {
    type: "social",
    label: "Social profile",
    icon: "🤳",
    description: "Instagram, X, & more",
  },
  media: {
    type: "media",
    label: "Share a File",
    icon: "📂",
    description: "Create a secure file page",
  },
  wifi: {
    type: "wifi",
    label: "WiFi",
    icon: "📶",
    description: "Connect to WiFi instantly",
  },
  vcard: {
    type: "vcard",
    label: "Contact Card",
    icon: "👤",
    description: "Share contact details",
  },
  sms: {
    type: "sms",
    label: "Text Message",
    icon: "💬",
    description: "Send a text message",
  },
  email: {
    type: "email",
    label: "Email",
    icon: "✉️",
    description: "Send an email",
  },
  phone: {
    type: "phone",
    label: "Phone call",
    icon: "📞",
    description: "Dial a number on scan",
  },
  text: {
    type: "text",
    label: "Plain text",
    icon: "📝",
    description: "Display plain text",
  },
};

// WiFi QR type data
export interface WiFiData {
  ssid: string;
  password?: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

// vCard QR type data
export interface VCardData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  website: string;
  organization: string;
  jobTitle: string;
  address: string;
  note?: string;
}

// SMS QR type data
export interface SMSData {
  phone: string;
  message: string;
}

// Email QR type data
export interface EmailData {
  email: string;
  subject: string;
  body: string;
}

// Phone QR type data
export interface PhoneData {
  phone: string;
}

// Social profile QR type data
export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "twitter"
  | "whatsapp"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "github";

export interface SocialData {
  platform: string;
  username: string;
}

// Format functions for each QR type
export function formatWiFi(data: WiFiData): string {
  const fields = [
    `T:${data.encryption}`,
    `S:${escapeSpecialChars(data.ssid)}`,
  ];
  if (data.encryption !== "nopass") {
    fields.push(`P:${escapeSpecialChars(data.password || "")}`);
  }
  if (data.hidden) {
    fields.push("H:true");
  }
  return `WIFI:${fields.join(";")};;`;
}

// vCard text values must escape backslash, newline, comma, and semicolon
// (RFC 6350 §3.4) — otherwise "Foo, Inc." or "Smith; Jr." breaks the card.
function escapeVCard(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/([;,])/g, "\\$1");
}

function unescapeVCard(str: string): string {
  return str.replace(
    /\\(.)/g,
    (_, ch: string) => (ch === "n" || ch === "N" ? "\n" : ch),
  );
}

export function formatVCard(data: VCardData): string {
  const first = escapeVCard(data.firstName);
  const last = escapeVCard(data.lastName);
  const fullName = [first, last].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
    `N:${last};${first};;;`,
  ];

  if (data.organization) {
    lines.push(`ORG:${escapeVCard(data.organization)}`);
  }
  if (data.jobTitle) {
    lines.push(`TITLE:${escapeVCard(data.jobTitle)}`);
  }
  if (data.phone) {
    lines.push(`TEL:${data.phone}`);
  }
  if (data.email) {
    lines.push(`EMAIL:${data.email}`);
  }
  if (data.website) {
    lines.push(`URL:${data.website}`);
  }
  if (data.address) {
    lines.push(`ADR:;;${escapeVCard(data.address)};;;;`);
  }
  if (data.note) {
    lines.push(`NOTE:${escapeVCard(data.note)}`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

export function formatSMS(data: SMSData): string {
  const cleanPhone = data.phone.trim().replace(/[\s().-]/g, "");
  if (!data.message) {
    return `SMSTO:${cleanPhone}`;
  }
  return `SMSTO:${cleanPhone}:${data.message}`;
}

export function formatPhone(data: PhoneData): string {
  // tel: URIs want no separators — keep digits, +, and letters (vanity nums).
  return `tel:${data.phone.trim().replace(/[\s().-]/g, "")}`;
}

export function formatEmail(data: EmailData): string {
  const email = data.email.trim();
  const params: string[] = [];
  if (data.subject) {
    params.push(`subject=${encodeURIComponent(data.subject)}`);
  }
  if (data.body) {
    params.push(`body=${encodeURIComponent(data.body)}`);
  }
  return params.length > 0
    ? `mailto:${email}?${params.join("&")}`
    : `mailto:${email}`;
}

export function formatSocialUrl(data: SocialData): string;
export function formatSocialUrl(platform: string, username: string): string;
export function formatSocialUrl(
  platformOrData: string | SocialData,
  maybeUsername?: string,
): string {
  const platform = typeof platformOrData === "string"
    ? platformOrData
    : platformOrData.platform;
  const rawUsername = typeof platformOrData === "string"
    ? (maybeUsername ?? "")
    : platformOrData.username;

  const cleanHandle = extractSocialHandle(rawUsername, platform);
  if (!cleanHandle) return "";

  switch (platform.toLowerCase()) {
    case "instagram":
      return `https://instagram.com/${cleanHandle}`;
    case "facebook":
      return `https://facebook.com/${cleanHandle}`;
    case "twitter":
    case "x":
      return `https://x.com/${cleanHandle}`;
    case "whatsapp": {
      const digits = cleanHandle.replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : "";
    }
    case "tiktok":
      return `https://tiktok.com/@${cleanHandle}`;
    case "linkedin":
      return `https://linkedin.com/in/${cleanHandle}`;
    case "youtube":
      return `https://youtube.com/@${cleanHandle}`;
    case "github":
      return `https://github.com/${cleanHandle}`;
    default:
      return `https://${platform.toLowerCase()}.com/${cleanHandle}`;
  }
}

// Inverse payload parsers for round-trip form hydration
export function parseWiFi(payload: string): WiFiData | null {
  if (!payload || !/^\s*WIFI:/i.test(payload)) return null;
  const body = payload.replace(/^\s*WIFI:/i, "").replace(/\s+$/, "");
  const segments = splitUnescaped(body, ";");

  let ssid = "";
  let hasSsid = false;
  let password = "";
  let rawType: string | null = null;
  let hidden = false;

  for (const seg of segments) {
    if (!seg) continue;
    const colonIdx = seg.indexOf(":");
    if (colonIdx <= 0) continue;
    const key = seg.slice(0, colonIdx).toUpperCase();
    const val = unescapeWiFi(seg.slice(colonIdx + 1));

    switch (key) {
      case "S":
        ssid = val;
        hasSsid = true;
        break;
      case "P":
        password = val;
        break;
      case "T":
        rawType = val;
        break;
      case "H":
        hidden = val.toLowerCase() === "true" || val === "1";
        break;
    }
  }

  if (!hasSsid || !ssid) return null;

  let encryption: WiFiData["encryption"];
  if (rawType === null) {
    encryption = password ? "WPA" : "nopass";
  } else {
    const normalized = rawType.trim().toLowerCase();
    if (!normalized || normalized === "nopass" || normalized === "none") {
      encryption = "nopass";
    } else if (normalized === "wep") {
      encryption = "WEP";
    } else if (normalized.startsWith("wpa")) {
      encryption = "WPA";
    } else {
      return null;
    }
  }

  return {
    ssid,
    password: encryption === "nopass" ? "" : password,
    encryption,
    hidden,
  };
}

export function parseVCard(payload: string): VCardData | null {
  if (
    !payload ||
    !/^\s*BEGIN:VCARD[\r\n]/i.test(payload) ||
    !/[\r\n]END:VCARD\s*$/i.test(payload)
  ) {
    return null;
  }

  // RFC 6350 §3.2 line unfolding: CRLF/LF followed by space or tab joins lines.
  const unfolded = payload.trim().replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let firstName = "";
  let lastName = "";
  let hasN = false;
  let fnFallback = "";
  let phone = "";
  let email = "";
  let website = "";
  let organization = "";
  let jobTitle = "";
  let address = "";
  let note = "";

  for (const line of lines) {
    const match = line.match(
      /^(?:[A-Za-z0-9-]+\.)?([A-Za-z0-9-]+)(?:;[^:]*)?:(.*)$/,
    );
    if (!match) continue;
    const prop = match[1].toUpperCase();
    const rawVal = match[2];

    switch (prop) {
      case "N": {
        const parts = splitUnescaped(rawVal, ";");
        lastName = unescapeVCard(parts[0] ?? "");
        firstName = unescapeVCard(parts[1] ?? "");
        hasN = true;
        break;
      }
      case "FN":
        fnFallback = unescapeVCard(rawVal);
        break;
      case "ORG": {
        const orgParts = splitUnescaped(rawVal, ";")
          .map(unescapeVCard)
          .filter(Boolean);
        organization = orgParts.join(", ");
        break;
      }
      case "TITLE":
        jobTitle = unescapeVCard(rawVal);
        break;
      case "TEL":
        if (!phone) phone = unescapeVCard(rawVal);
        break;
      case "EMAIL":
        if (!email) email = unescapeVCard(rawVal);
        break;
      case "URL":
        if (!website) website = unescapeVCard(rawVal);
        break;
      case "ADR": {
        const adrParts = splitUnescaped(rawVal, ";")
          .map(unescapeVCard)
          .filter(Boolean);
        if (!address) address = adrParts.join(", ");
        break;
      }
      case "NOTE":
        note = unescapeVCard(rawVal);
        break;
    }
  }

  if (!hasN && fnFallback.trim()) {
    const trimmedFn = fnFallback.trim();
    const spaceIdx = trimmedFn.indexOf(" ");
    if (spaceIdx === -1) {
      firstName = trimmedFn;
    } else {
      firstName = trimmedFn.slice(0, spaceIdx);
      lastName = trimmedFn.slice(spaceIdx + 1).trim();
    }
  }

  if (
    !firstName && !lastName && !phone && !email && !website &&
    !organization && !jobTitle && !address && !note
  ) {
    return null;
  }

  return {
    firstName,
    lastName,
    phone,
    email,
    website,
    organization,
    jobTitle,
    address,
    note,
  };
}

export function parseEmail(payload: string): EmailData | null {
  if (!payload || !/^\s*mailto:/i.test(payload)) return null;
  const rest = payload.trim().replace(/^mailto:/i, "");
  const qIdx = rest.indexOf("?");
  const rawAddress = qIdx === -1 ? rest : rest.slice(0, qIdx);
  const rawQuery = qIdx === -1 ? "" : rest.slice(qIdx + 1);

  const email = safeDecodeURIComponent(rawAddress).trim();
  if (!email) return null;

  let subject = "";
  let body = "";

  if (rawQuery) {
    for (const pair of rawQuery.split("&")) {
      if (!pair) continue;
      const eqIdx = pair.indexOf("=");
      const key = (eqIdx === -1 ? pair : pair.slice(0, eqIdx)).toLowerCase();
      const val = eqIdx === -1
        ? ""
        : safeDecodeURIComponent(pair.slice(eqIdx + 1));
      if (key === "subject") subject = val;
      else if (key === "body") body = val;
    }
  }

  return { email, subject, body };
}

export function parseSMS(payload: string): SMSData | null {
  if (!payload) return null;
  const trimmed = payload.trim();

  if (/^smsto:/i.test(trimmed)) {
    const rest = trimmed.slice(6);
    const colonIdx = rest.indexOf(":");
    const phone = (colonIdx === -1 ? rest : rest.slice(0, colonIdx)).trim();
    const message = colonIdx === -1 ? "" : rest.slice(colonIdx + 1);
    if (!phone) return null;
    return { phone, message };
  }

  if (/^sms:/i.test(trimmed)) {
    const rest = trimmed.slice(4);
    const sepIdx = rest.search(/[?&]/);
    const rawPhone = sepIdx === -1 ? rest : rest.slice(0, sepIdx);
    const rawQuery = sepIdx === -1 ? "" : rest.slice(sepIdx + 1);
    const phone = safeDecodeURIComponent(rawPhone).trim();
    if (!phone) return null;

    let message = "";
    if (rawQuery) {
      for (const pair of rawQuery.split("&")) {
        if (!pair) continue;
        const eqIdx = pair.indexOf("=");
        const key = (eqIdx === -1 ? pair : pair.slice(0, eqIdx)).toLowerCase();
        if (key === "body") {
          message = eqIdx === -1
            ? ""
            : safeDecodeURIComponent(pair.slice(eqIdx + 1));
        }
      }
    }
    return { phone, message };
  }

  return null;
}

export function parsePhone(payload: string): PhoneData | null {
  if (!payload || !/^\s*tel:/i.test(payload)) return null;
  const rest = payload.trim().slice(4).split(/[?;]/)[0];
  const phone = safeDecodeURIComponent(rest).trim();
  if (!phone) return null;
  return { phone };
}

const KNOWN_SOCIAL_HOST_RE =
  /^(?:https?:\/\/)?(?:(?:www|mobile|m|[a-z]{2})\.)?(?:instagram\.com|instagr\.am|twitter\.com|x\.com|tiktok\.com|linkedin\.com|youtube\.com|github\.com|facebook\.com|fb\.com|wa\.me|api\.whatsapp\.com|whatsapp\.com)\//i;

export function parseSocialUrl(
  payload: string,
): { platform: string; username: string } | null {
  if (!payload) return null;
  const trimmed = payload.trim();
  if (!trimmed) return null;

  const hasScheme = /^https?:\/\//i.test(trimmed);
  if (!hasScheme && !KNOWN_SOCIAL_HOST_RE.test(trimmed)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  let host = parsed.hostname.toLowerCase().replace(/^(?:www|mobile|m)\./, "");
  if (host.endsWith(".linkedin.com")) {
    host = "linkedin.com";
  }

  const segments = parsed.pathname
    .split("/")
    .filter(Boolean)
    .map(safeDecodeURIComponent);

  const cleanSeg = (s: string | undefined) =>
    (s ?? "").replace(/^@+/, "").trim();

  if (host === "instagram.com" || host === "instagr.am") {
    const first = segments[0];
    if (
      !first ||
      ["p", "reel", "reels", "stories", "explore", "tv"].includes(
        first.toLowerCase(),
      )
    ) {
      return null;
    }
    const username = cleanSeg(first);
    return username ? { platform: "instagram", username } : null;
  }

  if (host === "x.com" || host === "twitter.com") {
    const first = segments[0];
    if (
      !first ||
      ["i", "intent", "share", "home", "explore", "search", "hashtag"].includes(
        first.toLowerCase(),
      )
    ) {
      return null;
    }
    const username = cleanSeg(first);
    return username ? { platform: "twitter", username } : null;
  }

  if (host === "tiktok.com") {
    const username = cleanSeg(segments[0]);
    return username ? { platform: "tiktok", username } : null;
  }

  if (host === "linkedin.com") {
    const firstLower = segments[0]?.toLowerCase();
    const target = firstLower === "in" || firstLower === "pub" ||
        firstLower === "company"
      ? segments[1]
      : segments[0];
    const username = cleanSeg(target);
    return username ? { platform: "linkedin", username } : null;
  }

  if (host === "youtube.com") {
    const firstLower = segments[0]?.toLowerCase();
    if (
      !firstLower ||
      ["watch", "shorts", "playlist", "feed", "results"].includes(firstLower)
    ) {
      return null;
    }
    const target = ["c", "user", "channel"].includes(firstLower)
      ? segments[1]
      : segments[0];
    const username = cleanSeg(target);
    return username ? { platform: "youtube", username } : null;
  }

  if (host === "github.com") {
    const username = cleanSeg(segments[0]);
    return username ? { platform: "github", username } : null;
  }

  if (host === "facebook.com" || host === "fb.com") {
    if (segments[0]?.toLowerCase() === "profile.php") {
      const id = parsed.searchParams.get("id")?.trim() ?? "";
      return id ? { platform: "facebook", username: id } : null;
    }
    const username = cleanSeg(segments[0]);
    return username ? { platform: "facebook", username } : null;
  }

  if (host === "wa.me") {
    const digits = (segments[0] ?? "").replace(/[^0-9]/g, "");
    return digits ? { platform: "whatsapp", username: digits } : null;
  }

  if (host === "api.whatsapp.com" || host === "whatsapp.com") {
    const digits = (parsed.searchParams.get("phone") ?? "").replace(
      /[^0-9]/g,
      "",
    );
    return digits ? { platform: "whatsapp", username: digits } : null;
  }

  return null;
}

export function extractSocialHandle(raw: string, platform?: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parsedSocial = parseSocialUrl(trimmed);
  if (parsedSocial) {
    return parsedSocial.username;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean).map(
        safeDecodeURIComponent,
      );
      const candidate = parts[parts.length - 1] ?? "";
      return candidate.replace(/^@+/, "").trim();
    } catch {
      // Fall through to plain-string cleanup
    }
  }

  let cleaned = trimmed.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
  if (platform?.toLowerCase() === "linkedin") {
    cleaned = cleaned.replace(/^in\//i, "");
  }
  cleaned = cleaned.replace(/^\/+|\/+$/g, "").replace(/^@+/, "").trim();
  return cleaned;
}

// Validation functions
export function validateWiFi(data: WiFiData): string | null {
  if (!data.ssid.trim()) return "Network name (SSID) is required";
  if (data.encryption !== "nopass" && !data.password) {
    return "Password is required for secured networks";
  }
  return null;
}

export function validateVCard(data: VCardData): string | null {
  if (!data.firstName.trim() && !data.lastName.trim()) {
    return "Name is required";
  }
  const hasDetail = Boolean(
    data.phone.trim() ||
      data.email.trim() ||
      data.organization.trim() ||
      data.jobTitle.trim() ||
      data.website.trim() ||
      data.address.trim() ||
      (data.note ?? "").trim(),
  );
  if (!hasDetail) {
    return "Add phone, email, or website to complete card";
  }
  return null;
}

function isValidPhoneInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const cleaned = trimmed.replace(/[\s().-]/g, "");
  if (!/^\+?[0-9A-Za-z]+$/.test(cleaned)) return false;
  const body = cleaned.replace(/^\+/, "");
  return body.length >= 3 && /\d/.test(body);
}

function isValidEmailInput(raw: string): boolean {
  const trimmed = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateSMS(data: SMSData): string | null {
  if (!data.phone.trim()) return "Phone number is required";
  if (!isValidPhoneInput(data.phone)) return "Valid phone number required";
  return null;
}

export function validatePhone(data: PhoneData): string | null {
  if (!data.phone.trim()) return "Phone number is required";
  if (!isValidPhoneInput(data.phone)) return "Valid phone number required";
  return null;
}

export function validateEmail(data: EmailData): string | null {
  if (!data.email.trim()) return "Email address is required";
  if (!isValidEmailInput(data.email)) return "Valid email required";
  return null;
}

// Helper to escape special characters in WiFi string
function escapeSpecialChars(str: string): string {
  return str.replace(/([\\;,:"])/g, "\\$1");
}

function unescapeWiFi(str: string): string {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      out += str[i + 1];
      i++;
    } else {
      out += str[i];
    }
  }
  return out;
}

function splitUnescaped(str: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "\\" && i + 1 < str.length) {
      current += ch + str[i + 1];
      i++;
    } else if (ch === delimiter) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}
