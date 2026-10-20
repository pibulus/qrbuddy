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
      "100 Editable Dynamic Links — repoint printed QR codes anytime (vs. 5 on Free)",
      "500 MB Heavy-Duty File Drops — 10× larger 30-day file transfers (vs. 50 MB on Free)",
      "Clean White-Label Pages — remove QRBuddy branding on supported note and locker pages",
    ],
  },
};

export function formatTierPrice(tier: PricingTier): string {
  return tier.currency === "AUD" ? `A$${tier.price}` : `${tier.price}`;
}
