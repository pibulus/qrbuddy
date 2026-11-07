import type { BannerTheme, QRStyle } from "../types/qr-types.ts";
import { relativeLuminance } from "./qr-styles.ts";
import { QR_STYLES } from "./qr-styles.ts";
import { toSvgDataUrl } from "./qr-vector-svg.ts";

/** Palette colours and geometry are independent, including restored designs. */
export function resolveQRStyle(
  key: string,
  override?: QRStyle | null,
): QRStyle {
  const base = QR_STYLES[key as keyof typeof QR_STYLES] ?? QR_STYLES.sunset;
  if (key === "custom" && override) return override;
  // The look rides along with every palette: picking Candy must not drop the
  // artwork already chosen for Sunset.
  const look: Partial<QRStyle> = {};
  if (override?.renderMode) look.renderMode = override.renderMode;
  if (override?.artImage) look.artImage = override.artImage;
  if (override?.artColors) look.artColors = override.artColors;
  if (override?.stickerShape) look.stickerShape = override.stickerShape;
  if (override?.pocketTone) look.pocketTone = override.pocketTone;
  return {
    ...base,
    ...look,
    centerShape: override?.centerShape,
    dots: {
      ...base.dots,
      ...(override?.dots.shape ? { shape: override.dots.shape } : {}),
    },
    cornersSquare: {
      ...base.cornersSquare,
      ...(override?.cornersSquare?.shape
        ? { shape: override.cornersSquare.shape }
        : {}),
    },
    cornersDot: {
      ...base.cornersDot,
      ...(override?.cornersDot?.shape
        ? { shape: override.cornersDot.shape }
        : {}),
    },
  };
}

/** The Looks gallery, in shipping order. Labels only — no taste in the data. */
export const LOOKS = [
  {
    id: "classic",
    en: "Classic",
    es: "Clásico",
    blurbEn: "Flat matrix, print-tested",
    blurbEs: "Matriz plana, probada en imprenta",
  },
  {
    id: "foil",
    en: "Flat Foil",
    es: "Foil plano",
    blurbEn: "Isometric 2.5D extrusion",
    blurbEs: "Extrusión isométrica 2.5D",
  },
  {
    id: "sticker",
    en: "Sticker",
    es: "Sticker",
    blurbEn: "Artwork behind a die-cut code",
    blurbEs: "Arte detrás de un código troquelado",
  },
  {
    id: "pocket",
    en: "Pocket",
    es: "Pocket",
    blurbEn: "8-bit tile sticker",
    blurbEs: "Sticker de bloques 8-bit",
  },
] as const;

export type LookId = (typeof LOOKS)[number]["id"];

export const STAMPS = [
  {
    id: "link",
    en: "Link",
    es: "Enlace",
    path:
      "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  },
  {
    id: "wifi",
    en: "Wi-Fi",
    es: "Wi-Fi",
    path:
      "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0M12 20h.01",
  },
  {
    id: "menu",
    en: "Menu",
    es: "Menú",
    path: "M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-5 1-6 9 0 10",
  },
  {
    id: "music",
    en: "Music",
    es: "Música",
    path:
      "M9 18V5l12-2v13M9 7l12-2M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3zM21 16a3 3 0 1 1-3-3c2 0 3 1 3 3z",
  },
  {
    id: "star",
    en: "Star",
    es: "Estrella",
    path: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  },
] as const;

export function stampSvg(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="-5 -5 34 34"><path d="${path}" fill="none" stroke="#1e1714" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function stampUrl(path: string): string {
  return toSvgDataUrl(stampSvg(path));
}

/** Three curated banner looks, resolved from the active palette accent. */
export function bannerColors(
  theme: BannerTheme = "accent",
  accent = "#ec4899",
): { bg: string; ink: string } {
  if (theme === "ink") return { bg: "#1e1714", ink: "#fffef7" };
  if (theme === "paper") return { bg: "#fffef7", ink: "#1e1714" };
  let ink = "#fffef7";
  try {
    if (relativeLuminance(accent) > 0.42) ink = "#1e1714";
  } catch {
    ink = "#fffef7";
  }
  return { bg: accent, ink };
}

export const BANNER_THEMES: BannerTheme[] = ["accent", "ink", "paper"];
