// QR Code Template Types
// Supports various QR code data formats beyond simple URLs

export type QRTemplateType =
  | "url"
  | "social"
  | "media"
  | "wifi"
  | "vcard"
  | "sms"
  | "email"
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
    label: "Website",
    icon: "🔗",
    description: "Link to any website URL",
  },
  social: {
    type: "social",
    label: "Social",
    icon: "🤳",
    description: "Instagram, X, & more",
  },
  media: {
    type: "media",
    label: "Media",
    icon: "📂",
    description: "Share files with style & security",
  },
  wifi: {
    type: "wifi",
    label: "WiFi",
    icon: "📶",
    description: "Connect to WiFi instantly",
  },
  vcard: {
    type: "vcard",
    label: "Contact",
    icon: "👤",
    description: "Share contact details",
  },
  sms: {
    type: "sms",
    label: "SMS",
    icon: "💬",
    description: "Send a text message",
  },
  email: {
    type: "email",
    label: "Email",
    icon: "✉️",
    description: "Send an email",
  },
  text: {
    type: "text",
    label: "Text",
    icon: "📝",
    description: "Display plain text",
  },
};

// WiFi Template Data
export interface WiFiData {
  ssid: string;
  password?: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

// vCard Template Data
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

// SMS Template Data
export interface SMSData {
  phone: string;
  message: string;
}

// Email Template Data
export interface EmailData {
  email: string;
  subject: string;
  body: string;
}

// Format functions for each template type
export function formatWiFi(data: WiFiData): string {
  const encryption = data.encryption === "nopass" ? "" : data.encryption;
  const hidden = data.hidden ? "H:true" : "";
  const password = data.password || "";

  return `WIFI:T:${encryption};S:${escapeSpecialChars(data.ssid)};P:${
    escapeSpecialChars(password)
  };${hidden};`;
}

export function formatVCard(data: VCardData): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${data.firstName} ${data.lastName}`,
    `N:${data.lastName};${data.firstName};;;`,
  ];

  if (data.organization) {
    lines.push(`ORG:${data.organization}`);
  }
  if (data.jobTitle) {
    lines.push(`TITLE:${data.jobTitle}`);
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
    lines.push(`ADR:;;${data.address};;;;`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

export function formatSMS(data: SMSData): string {
  return `SMSTO:${data.phone}:${data.message}`;
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

export function validateEmail(data: EmailData): string | null {
  if (!data.email) return "Email address is required";
  if (!data.subject && !data.body) return "Subject or Body is required";
  return null;
}

// Helper to escape special characters in WiFi string
function escapeSpecialChars(str: string): string {
  return str.replace(/([\\;,:])/g, "\\$1");
}
