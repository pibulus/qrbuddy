// The one paid product currently sold by QRBuddy.

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  price: number;
  currency: "AUD";
  billingPeriod: "lifetime" | "year";
  durationDays?: number;
  features: string[];
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "AUD",
    billingPeriod: "lifetime",
    features: [
      "Unlimited static QRs",
      "Editable QRs and file sharing (free-tier limits apply)",
      "Custom colors, gradients and logos",
      "PNG and SVG downloads",
    ],
  },
  pro: {
    id: "pro",
    name: "Supporter Pass",
    price: 49,
    currency: "AUD",
    billingPeriod: "year",
    durationDays: 365,
    features: [
      "Single-file uploads up to 500 MB; shares expire after 30 days",
      "No QRBuddy branding on supported note and locker pages",
      "Higher creation and upload limits; service abuse controls still apply",
    ],
  },
};

export function formatTierPrice(tier: PricingTier): string {
  return tier.currency === "AUD" ? `A$${tier.price}` : `${tier.price}`;
}
