// Pricing tiers and feature definitions

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  price: number;
  billingPeriod: "lifetime" | "month" | "year";
  features: string[];
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    billingPeriod: "lifetime",
    features: [
      "Unlimited static QRs",
      "Editable QRs (fair use)",
      "File sharing, lockers & one-time files",
      "Custom colors, gradients & logos",
      "Batch creation",
      "PNG & SVG download",
    ],
  },
  pro: {
    id: "pro",
    name: "Supporter",
    price: 24,
    billingPeriod: "year",
    features: [
      "Everything in Free, forever",
      "No QRBuddy branding on note & locker pages",
      "Active-file and daily locker caps lifted",
      "Rate limits lifted — create and upload in bulk",
    ],
  },
};
