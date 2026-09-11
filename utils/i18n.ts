// Spanish and English internationalization dictionary & utilities for QRBuddy

export type Locale = "en" | "es";

export const TRANSLATIONS = {
  en: {
    tagline: "Drop a link. Watch it bloom.",
    subtagline: "Zero Subscriptions • No Hostage Links • Honest Utility",
    switchLanguage: "🇲🇽 Español",
    backHome: "← Back to QRBuddy Home",
    supportPass: "Supporter Pass ✨",
    tipJar: "Tip Jar ☕",
    madeBy: "Made by Pablo • Melbourne • Anti-scale software with personality.",
    menuBadge: "Hospitality & Dining",
    weddingBadge: "Weddings & Celebrations",
    musicBadge: "Musicians & Labels",
    lockerBadge: "Security & Privacy",
  },
  es: {
    tagline: "Deja caer un enlace. Míralo florecer.",
    subtagline: "Sin Suscripciones • Sin Enlaces Rotos • Utilidad Honesta",
    switchLanguage: "🇦🇺 English",
    backHome: "← Volver al inicio de QRBuddy",
    supportPass: "Pase de Soporte ✨",
    tipJar: "Propina ☕",
    madeBy:
      "Hecho por Pablo • Mexicano-Australiano • Software ético con personalidad.",
    menuBadge: "Restaurantes y Cafeterías",
    weddingBadge: "Bodas y Celebraciones",
    musicBadge: "Músicos y Bandas",
    lockerBadge: "Seguridad y Privacidad",
  },
};

/** Detects locale from Accept-Language header or URL path */
export function detectLocale(req?: Request): Locale {
  if (!req) return "en";
  const url = new URL(req.url);
  if (url.pathname.startsWith("/es")) return "es";

  const acceptLang = req.headers.get("accept-language")?.toLowerCase() || "";
  if (acceptLang.includes("es")) return "es";

  return "en";
}
