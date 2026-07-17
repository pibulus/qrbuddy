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

// Format functions for each QR type
export function formatWiFi(data: WiFiData): string {
  const encryption = data.encryption === "nopass" ? "" : data.encryption;
  const hidden = data.hidden ? "H:true" : "";
  const password = data.password || "";

  return `WIFI:T:${encryption};S:${escapeSpecialChars(data.ssid)};P:${
    escapeSpecialChars(password)
  };${hidden};`;
}

// vCard text values must escape backslash, newline, comma, and semicolon
// (RFC 6350 §3.4) — otherwise "Foo, Inc." or "Smith; Jr." breaks the card.
function escapeVCardValue(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([;,])/g, "\\$1");
}

export function formatVCard(data: VCardData): string {
  const first = escapeVCardValue(data.firstName);
  const last = escapeVCardValue(data.lastName);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${first} ${last}`,
    `N:${last};${first};;;`,
  ];

  if (data.organization) {
    lines.push(`ORG:${escapeVCardValue(data.organization)}`);
  }
  if (data.jobTitle) {
    lines.push(`TITLE:${escapeVCardValue(data.jobTitle)}`);
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
    lines.push(`ADR:;;${escapeVCardValue(data.address)};;;;`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

export function formatSMS(data: SMSData): string {
  return `SMSTO:${data.phone}:${data.message}`;
}

// Phone QR type data
export interface PhoneData {
  phone: string;
}

export function formatPhone(data: PhoneData): string {
  // tel: URIs want no separators — keep digits, +, and letters (vanity nums).
  return `tel:${data.phone.replace(/[\s().-]/g, "")}`;
}

export function formatEmail(data: EmailData): string {
  return `mailto:${data.email}?subject=${
    encodeURIComponent(data.subject)
  }&body=${encodeURIComponent(data.body)}`;
}

// Validation functions
export function validateWiFi(data: WiFiData): string | null {
  if (!data.ssid) return "Network name (SSID) is required";
  if (data.encryption !== "nopass" && !data.password) {
    return "Password is required for secured networks";
  }
  return null;
}

export function validateVCard(data: VCardData): string | null {
  if (!data.firstName && !data.lastName) {
    return "Name is required";
  }
  if (!data.phone && !data.email) {
    return "Phone or Email is required";
  }
  return null;
}

export function validateSMS(data: SMSData): string | null {
  if (!data.phone) return "Phone number is required";
  if (!data.message) return "Message is required";
  return null;
}

export function validatePhone(data: PhoneData): string | null {
  if (!data.phone) return "Phone number is required";
  return null;
}

export function validateEmail(data: EmailData): string | null {
  if (!data.email) return "Email address is required";
  if (!data.subject && !data.body) return "Subject or Body is required";
  return null;
}

// Helper to escape special characters in WiFi string
function escapeSpecialChars(str: string): string {
  return str.replace(/([\\;,:"])/g, "\\$1");
}
