// Pricing tiers and feature definitions

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  price: number;
  billingPeriod: "month" | "year";
  stripePriceId?: string; // Set in env vars
  features: string[];
  limitations?: string[];
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    billingPeriod: "month",
    features: [
      "Unlimited QR codes",
      "6 gradient presets + custom creator",
      "5 QR templates (WiFi, vCard, SMS, Email, Text)",
      "Custom logo in QR center",
      "Dynamic QR codes (editable redirects)",
      "Destructible one-time QR codes",
      "PNG download",
      "Copy to clipboard",
    ],
    limitations: [
      "No bulk export",
      "No scan analytics",
      "No SVG/EPS export",
      "QRBuddy branding on dynamic QRs",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 9,
    billingPeriod: "month",
    stripePriceId: "price_xxx", // Set via STRIPE_PRICE_ID_PRO env var
    features: [
      "Everything in Free, plus:",
      "Bulk QR export (up to 1000 at once)",
      "Scan analytics (views, devices, locations)",
      "SVG & EPS export (vector formats)",
      "Remove QRBuddy branding",
      "Priority support",
      "API access (coming soon)",
    ],
  },
};

export const PRICING_ANNUAL_DISCOUNT = 0.2; // 20% off annual

// Feature flags - what requires Pro
export const PRO_FEATURES = {
  BULK_EXPORT: "bulk_export",
  SCAN_ANALYTICS: "scan_analytics",
  SVG_EXPORT: "svg_export",
  NO_BRANDING: "no_branding",
  API_ACCESS: "api_access",
} as const;

export type ProFeature = (typeof PRO_FEATURES)[keyof typeof PRO_FEATURES];

// Check if user has Pro (from localStorage token or API)
export function hasProAccess(): boolean {
  if (typeof window === "undefined") return false;

  const proToken = localStorage.getItem("qrbuddy_pro_token");
  const proExpiry = localStorage.getItem("qrbuddy_pro_expiry");

  if (!proToken || !proExpiry) return false;

  const expiryDate = new Date(proExpiry);
  const now = new Date();

  return expiryDate > now;
}

// Check if user can use specific feature
export function canUseFeature(feature: ProFeature): boolean {
  // All features free for now, or check Pro status
  return hasProAccess();
}
