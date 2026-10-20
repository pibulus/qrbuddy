// The one paid product currently sold by QRBuddy.

export interface PricingTier {
  id: "free" | "pro";
  name: string;
  price: number;
  currency: "AUD";
  billingPeriod: "lifetime" | "year";
  durationDays?: number;
  features: string[];
  featuresEs?: string[];
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
    featuresEs: [
      "QRs estáticos ilimitados",
      "QRs editables y envío de archivos (con límites del plan gratis)",
      "Colores, degradados y logos personalizados",
      "Descargas en PNG y SVG",
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
    featuresEs: [
      "100 Links Dinámicos Editables — Cambia a dónde apuntan tus QRs impresos cuando quieras.",
      "Archivos Pesados de hasta 500 MB — Transferencias por 30 días 10× más grandes (vs. 50 MB gratis).",
      "Páginas Limpias Sin Marca — Tus galerías, mixtapes y descargas sin el sello de QRBuddy.",
    ],
  },
};

export function formatTierPrice(tier: PricingTier): string {
  return tier.currency === "AUD" ? `A$${tier.price}` : `${tier.price}`;
}
