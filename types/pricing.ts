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
