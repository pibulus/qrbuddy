// Spanish and English internationalization dictionary & utilities for QRBuddy

export type Locale = "en" | "es";

/**
 * Automatic & zero-prop-drill locale detector for SSR + client islands.
 * Checks explicitLang first, then `<html lang="es">`, then `/es` pathname.
 */
export function getClientLocale(explicitLang?: Locale): Locale {
  if (explicitLang === "en" || explicitLang === "es") {
    return explicitLang;
  }
  if (
    typeof document !== "undefined" &&
    document.documentElement?.lang?.toLowerCase().startsWith("es")
  ) {
    return "es";
  }
  if (typeof globalThis.location !== "undefined") {
    const pathname = globalThis.location.pathname || "";
    if (/^\/es(?:\/|$)/.test(pathname)) {
      return "es";
    }
    const langParam = new URLSearchParams(globalThis.location.search || "").get(
      "lang",
    );
    if (langParam === "es") {
      return "es";
    }
  }
  return "en";
}

const ROUTE_COUNTERPARTS_EN_TO_ES: Record<string, string> = {
  "/": "/es",
  "/for/menus": "/es/menus",
  "/for/weddings": "/es/bodas",
  "/for/music": "/es/musica",
  "/for/lockers": "/es/archivos",
  "/why": "/es/por-que",
  "/compare": "/es/comparar",
  "/guide/printing": "/es/guia/impresion",
};

const ROUTE_COUNTERPARTS_ES_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_COUNTERPARTS_EN_TO_ES).map(([en, es]) => [es, en]),
);

/**
 * Maps the current pathname to its English or Spanish counterpart.
 */
export function getLanguageSwitchHref(
  pathname: string,
  targetLang: Locale,
): string {
  const normalized = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname || "/";

  if (targetLang === "es") {
    return ROUTE_COUNTERPARTS_EN_TO_ES[normalized] ??
      (normalized.startsWith("/es") ? normalized : "/es");
  }
  return ROUTE_COUNTERPARTS_ES_TO_EN[normalized] ??
    (normalized.startsWith("/es") ? "/" : normalized);
}

export const TRANSLATIONS = {
  en: {
    tagline: "Drop a link. Watch it bloom.",
    subtagline: "Zero Subscriptions • No Hostage Links • Honest Utility",
    switchLanguage: "🇲🇽 ES",
    backHome: "← Back to QRBuddy Home",
    supportPass: "QRBuddy Passport 🛂",
    tipJar: "Tip Jar ☕",
    madeBy: "Made by Pablo • Melbourne • Anti-scale software with personality.",
    menuBadge: "Hospitality & Dining",
    weddingBadge: "Weddings & Celebrations",
    musicBadge: "Musicians & Labels",
    lockerBadge: "Security & Privacy",
  },
  es: {
    tagline: "Pega un link. Hazlo brillar.",
    subtagline: "Sin Suscripciones • Tus Links son Tuyos • Utilidad con Onda",
    switchLanguage: "EN",
    backHome: "← Volver al inicio de QRBuddy",
    supportPass: "Pasaporte QRBuddy 🛂",
    tipJar: "Invitar un café ☕",
    madeBy:
      "Hecho por Pablo • Mexicano-Australiano • Software libre de corporativos.",
    menuBadge: "Restaurantes y Cafeterías",
    weddingBadge: "Bodas y Fiestas",
    musicBadge: "Músicos y Bandas",
    lockerBadge: "Buzón y Privacidad",
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
