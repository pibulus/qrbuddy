// Pricing tiers and feature definitions

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  price: number;
  billingPeriod: "lifetime" | "month" | "year";
  paymentUrl?: string; // Lemon Squeezy checkout URL or Ko-fi link
  features: string[];
  upcomingFeatures?: string[];
  limitations?: string[];
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    billingPeriod: "lifetime",
    features: [
      "Unlimited Static QRs",
      "Unlimited Dynamic QRs (Fair Use)",
      "3 Active File Lockers",
      "3 Active One-Time Files",
      "Sequential Redirection",
      "Batch Creation (Unlimited)",
      "Custom Colors & Logos",
      "PNG Download",
    ],
    limitations: [],
  },
  pro: {
    id: "pro",
    name: "Supporter",
    price: 20,
    billingPeriod: "lifetime",
    paymentUrl: "",
    features: [],
    upcomingFeatures: [
      "Unlimited Lockers",
      "Unlimited Active Files",
      "Larger File Uploads",
      "Vector Export (SVG)",
      "Remove Branding",
    ],
  },
};

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
  const globalScope = globalThis as typeof globalThis & {
    localStorage?: Storage;
  };

  if (!globalScope.localStorage) return false;

  const proToken = globalScope.localStorage.getItem("qrbuddy_pro_token");
  const proExpiry = globalScope.localStorage.getItem("qrbuddy_pro_expiry");

  if (!proToken || !proExpiry) return false;

  const expiryDate = new Date(proExpiry);
  const now = new Date();

  return expiryDate > now;
}

// Check if user can use specific feature
export function canUseFeature(_feature: ProFeature): boolean {
  // All features free for now, or check Pro status
  return hasProAccess();
}
