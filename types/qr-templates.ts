// QR Code Template Types
// Supports various QR code data formats beyond simple URLs

export type QRTemplateType = "url" | "wifi" | "vcard" | "sms" | "email" | "text";

export interface QRTemplate {
  type: QRTemplateType;
  label: string;
  icon: string;
  description: string;
}

export const QR_TEMPLATES: Record<QRTemplateType, QRTemplate> = {
  url: {
    type: "url",
    label: "URL / Link",
    icon: "🔗",
    description: "Website, social media, or any link",
  },
  wifi: {
    type: "wifi",
    label: "WiFi Network",
    icon: "📶",
    description: "Connect to WiFi instantly",
  },
  vcard: {
    type: "vcard",
    label: "Contact Card",
    icon: "👤",
    description: "Share your contact information",
  },
  sms: {
    type: "sms",
    label: "SMS Message",
    icon: "💬",
    description: "Pre-filled text message",
  },
  email: {
    type: "email",
    label: "Email",
    icon: "📧",
    description: "Send an email with subject",
  },
  text: {
    type: "text",
    label: "Plain Text",
    icon: "📝",
    description: "Any text content",
  },
};

// WiFi Template Data
export interface WiFiData {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
}

// vCard Template Data
export interface VCardData {
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
}

// SMS Template Data
export interface SMSData {
  phone: string;
  message: string;
}

// Email Template Data
export interface EmailData {
  to: string;
  subject?: string;
  body?: string;
}

// Format functions for each template type
export function formatWiFi(data: WiFiData): string {
  const encryption = data.encryption === "nopass" ? "" : data.encryption;
  const hidden = data.hidden ? "H:true" : "";

  return `WIFI:T:${encryption};S:${escapeSpecialChars(data.ssid)};P:${
    escapeSpecialChars(data.password)
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
  if (data.title) {
    lines.push(`TITLE:${data.title}`);
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
  if (data.note) {
    lines.push(`NOTE:${data.note}`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

export function formatSMS(data: SMSData): string {
  return `SMSTO:${data.phone}:${data.message}`;
}

export function formatEmail(data: EmailData): string {
  const params = new URLSearchParams();

  if (data.subject) {
    params.append("subject", data.subject);
  }
  if (data.body) {
    params.append("body", data.body);
  }

  const queryString = params.toString();
  return `mailto:${data.to}${queryString ? "?" + queryString : ""}`;
}

// Escape special characters for WiFi QR codes
function escapeSpecialChars(str: string): string {
  return str.replace(/[\\;,":]/g, (char) => "\\" + char);
}

// Validation functions
export function validateWiFi(data: Partial<WiFiData>): string | null {
  if (!data.ssid?.trim()) {
    return "Network name (SSID) is required";
  }
  if (data.encryption !== "nopass" && !data.password?.trim()) {
    return "Password is required for secured networks";
  }
  return null;
}

export function validateVCard(data: Partial<VCardData>): string | null {
  if (!data.firstName?.trim() || !data.lastName?.trim()) {
    return "First name and last name are required";
  }
  return null;
}

export function validateSMS(data: Partial<SMSData>): string | null {
  if (!data.phone?.trim()) {
    return "Phone number is required";
  }
  if (!data.message?.trim()) {
    return "Message is required";
  }
  return null;
}

export function validateEmail(data: Partial<EmailData>): string | null {
  if (!data.to?.trim()) {
    return "Email address is required";
  }
  // Basic email validation
  if (!data.to.includes("@")) {
    return "Invalid email address";
  }
  return null;
}
