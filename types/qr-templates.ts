// QR code type definitions
// Supports various QR code data formats beyond simple URLs

export type QRTemplateType =
  | "url"
  | "social"
  | "media"
  | "wifi"
  | "vcard"
  | "whatsapp"
  | "event"
  | "location"
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
  whatsapp: {
    type: "whatsapp",
    label: "WhatsApp",
    icon: "💬",
    description: "Open a pre-filled WhatsApp chat",
  },
  event: {
    type: "event",
    label: "Event",
    icon: "📅",
    description: "Add event straight to calendar",
  },
  location: {
    type: "location",
    label: "Map Pin",
    icon: "📍",
    description: "Open venue or coordinates in maps",
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

export interface WhatsAppData {
  phone: string;
  message: string;
}

export interface CalendarEventData {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
  url: string;
}

export interface LocationData {
  mode: "place" | "coords";
  query: string;
  latitude: string;
  longitude: string;
  useGeoUri?: boolean;
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

export function formatWhatsApp(data: WhatsAppData): string {
  const digits = data.phone.replace(/[^\d]/g, "");
  if (!digits) return "";
  const msg = data.message.trim();
  return msg
    ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/${digits}`;
}

export function validateWhatsApp(data: WhatsAppData): string | null {
  const raw = data.phone.trim();
  if (!raw) return "Phone number is required";
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 7) return "Valid WhatsApp number required";
  return null;
}

export function parseWhatsApp(payload: string): WhatsAppData | null {
  if (!payload) return null;
  const trimmed = payload.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let phone = "";
  if (host === "wa.me") {
    phone = (parsed.pathname.split("/").filter(Boolean)[0] ?? "").replace(
      /[^\d]/g,
      "",
    );
  } else if (host === "api.whatsapp.com" || host === "whatsapp.com") {
    phone = (parsed.searchParams.get("phone") ?? "").replace(/[^\d]/g, "");
  } else {
    return null;
  }
  if (!phone) return null;
  const message = parsed.searchParams.get("text") ?? "";
  return { phone: `+${phone}`, message };
}

function escapeIcsText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

function unescapeIcsText(raw: string): string {
  return raw.replace(
    /\\(.)/g,
    (_, ch: string) => (ch === "n" || ch === "N" ? "\n" : ch),
  );
}

function addDaysToYmd(ymd: string, days: number): string {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd.replace(/-/g, "");
  const dt = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days),
  );
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${mo}${d}`;
}

function toIcsLocalDateTime(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    value.trim(),
  );
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6] ?? "00"}`;
}

function addOneHourToLocalInput(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const dt = new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]) + 60,
      0,
    ),
  );
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${y}${mo}${d}T${hh}${mm}00`;
}

export function formatCalendarEvent(data: CalendarEventData): string {
  const title = data.title.trim();
  if (!title || !data.start.trim()) return "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QRBuddy//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${escapeIcsText(title)}`,
  ];

  if (data.allDay) {
    const startYmd = data.start.slice(0, 10);
    const endRaw = data.end.trim().slice(0, 10) || startYmd;
    const exclusiveEnd = addDaysToYmd(
      endRaw >= startYmd ? endRaw : startYmd,
      1,
    );
    lines.push(`DTSTART;VALUE=DATE:${startYmd.replace(/-/g, "")}`);
    lines.push(`DTEND;VALUE=DATE:${exclusiveEnd}`);
  } else {
    const dtStart = toIcsLocalDateTime(data.start);
    if (!dtStart) return "";
    const dtEnd = data.end.trim()
      ? toIcsLocalDateTime(data.end)
      : addOneHourToLocalInput(data.start);
    lines.push(`DTSTART:${dtStart}`);
    if (dtEnd) lines.push(`DTEND:${dtEnd}`);
  }

  if (data.location.trim()) {
    lines.push(`LOCATION:${escapeIcsText(data.location.trim())}`);
  }
  if (data.description.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(data.description.trim())}`);
  }
  if (data.url.trim()) {
    lines.push(`URL:${data.url.trim()}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\n");
}

export function validateCalendarEvent(data: CalendarEventData): string | null {
  if (!data.title.trim()) return "Event title is required";
  if (!data.start.trim()) return "Start date is required";
  if (data.allDay) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(data.start.trim())) {
      return "Valid start date required";
    }
    if (
      data.end.trim() &&
      data.end.trim().slice(0, 10) < data.start.trim().slice(0, 10)
    ) {
      return "End date must follow start date";
    }
    return null;
  }
  if (!toIcsLocalDateTime(data.start)) {
    return "Valid start date and time required";
  }
  if (data.end.trim()) {
    const endIcs = toIcsLocalDateTime(data.end);
    const startIcs = toIcsLocalDateTime(data.start);
    if (!endIcs) return "Valid end time required";
    if (startIcs && endIcs < startIcs) return "End time must follow start time";
  }
  return null;
}

export function parseCalendarEvent(payload: string): CalendarEventData | null {
  if (!payload || !/BEGIN:VEVENT/i.test(payload)) return null;
  const unfolded = payload.trim().replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let title = "";
  let start = "";
  let end = "";
  let allDay = false;
  let location = "";
  let description = "";
  let url = "";

  const parseIcsDt = (val: string, forceDate: boolean): string => {
    const clean = val.trim();
    const d = /^(\d{4})(\d{2})(\d{2})$/.exec(clean);
    if (d) {
      return `${d[1]}-${d[2]}-${d[3]}`;
    }
    const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(clean);
    if (dt) {
      return forceDate
        ? `${dt[1]}-${dt[2]}-${dt[3]}`
        : `${dt[1]}-${dt[2]}-${dt[3]}T${dt[4]}:${dt[5]}`;
    }
    return "";
  };

  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9-]+)(;[^:]*)?:(.*)$/);
    if (!match) continue;
    const prop = match[1].toUpperCase();
    const params = (match[2] ?? "").toUpperCase();
    const val = match[3] ?? "";

    switch (prop) {
      case "SUMMARY":
        title = unescapeIcsText(val);
        break;
      case "DTSTART":
        if (params.includes("VALUE=DATE") || /^\d{8}$/.test(val.trim())) {
          allDay = true;
        }
        start = parseIcsDt(val, allDay);
        break;
      case "DTEND":
        end = parseIcsDt(val, allDay);
        break;
      case "LOCATION":
        location = unescapeIcsText(val);
        break;
      case "DESCRIPTION":
        description = unescapeIcsText(val);
        break;
      case "URL":
        url = val.trim();
        break;
    }
  }

  if (!title && !start) return null;
  if (allDay && start && end) {
    const inclusiveEndYmd = addDaysToYmd(end, -1);
    const formattedEnd = `${inclusiveEndYmd.slice(0, 4)}-${
      inclusiveEndYmd.slice(4, 6)
    }-${inclusiveEndYmd.slice(6, 8)}`;
    end = formattedEnd >= start ? formattedEnd : start;
  }

  return { title, start, end, allDay, location, description, url };
}

export function formatLocation(data: LocationData): string {
  if (data.mode === "coords") {
    const lat = Number(data.latitude.trim());
    const lng = Number(data.longitude.trim());
    if (
      !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 ||
      lat > 90 || lng < -180 || lng > 180
    ) {
      return "";
    }
    const cleanLat = Number(lat.toFixed(6));
    const cleanLng = Number(lng.toFixed(6));
    return data.useGeoUri
      ? `geo:${cleanLat},${cleanLng}`
      : `https://maps.google.com/?q=${cleanLat},${cleanLng}`;
  }
  const query = data.query.trim();
  if (!query) return "";
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

export function validateLocation(data: LocationData): string | null {
  if (data.mode === "coords") {
    if (!data.latitude.trim() || !data.longitude.trim()) {
      return "Latitude and longitude are required";
    }
    const lat = Number(data.latitude.trim());
    const lng = Number(data.longitude.trim());
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return "Latitude must be between -90 and 90";
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return "Longitude must be between -180 and 180";
    }
    return null;
  }
  if (!data.query.trim()) return "Address or place name is required";
  return null;
}

export function parseLocation(payload: string): LocationData | null {
  if (!payload) return null;
  const trimmed = payload.trim();

  const geoMatch = /^geo:([-+]?\d+(?:\.\d+)?),\s*([-+]?\d+(?:\.\d+)?)/i.exec(
    trimmed,
  );
  if (geoMatch) {
    return {
      mode: "coords",
      query: "",
      latitude: geoMatch[1],
      longitude: geoMatch[2],
      useGeoUri: true,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (
    host === "maps.google.com" ||
    (host.startsWith("google.") && parsed.pathname.startsWith("/maps")) ||
    host === "maps.apple.com"
  ) {
    const q =
      (parsed.searchParams.get("q") || parsed.searchParams.get("query") || "")
        .trim();
    const coordMatch = /^([-+]?\d+(?:\.\d+)?),\s*([-+]?\d+(?:\.\d+)?)$/.exec(
      q,
    );
    if (coordMatch) {
      return {
        mode: "coords",
        query: "",
        latitude: coordMatch[1],
        longitude: coordMatch[2],
        useGeoUri: false,
      };
    }
    if (q) {
      return {
        mode: "place",
        query: q,
        latitude: "",
        longitude: "",
        useGeoUri: false,
      };
    }
  }
  return null;
}
