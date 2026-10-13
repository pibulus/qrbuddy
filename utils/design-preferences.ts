import type { Gradient, QRStyle } from "../types/qr-types.ts";
import { QR_STYLES } from "./qr-styles.ts";

export interface DesignPreferences {
  version: 1;
  style: string;
  customStyle?: QRStyle | null;
  logoUrl?: string;
  frameConfig?: { enabled: boolean; caption: string } | null;
  pngSize?: 1000 | 2000 | 3000;
}

export const STORAGE_KEY = "qrbuddy_design_prefs";
export const MAX_STORED_LOGO_LENGTH = 250_000; // ~180KB data URL

export const DEFAULT_DESIGN_PREFERENCES: DesignPreferences = {
  version: 1,
  style: "sunset",
  customStyle: null,
  logoUrl: "",
  frameConfig: null,
  pngSize: 1000,
};

/**
 * Validates supported generated colour syntax:
 * - Hex colours: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * - RGB / RGBA: rgb(r, g, b), rgba(r, g, b, a), rgb(r g b / a)
 * - HSL / HSLA: hsl(h, s, l), hsla(h, s, l, a) (used by style dice roller)
 * - Named CSS keywords: transparent, black, white
 * Rejects arbitrary strings (e.g. "not-a-colour").
 */
export function isValidColor(c: unknown): c is string {
  if (typeof c !== "string") return false;
  const s = c.trim();
  if (!s || s.length > 50) return false;
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s)) {
    return true;
  }
  if (
    /^rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i
      .test(s)
  ) {
    return true;
  }
  if (
    /^hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i
      .test(s)
  ) {
    return true;
  }
  if (/^(?:transparent|black|white)$/i.test(s)) {
    return true;
  }
  return false;
}

function isValidGradient(grad: unknown): grad is Gradient {
  if (!grad || typeof grad !== "object" || Array.isArray(grad)) return false;
  const g = grad as Record<string, unknown>;
  if (g.type !== "linear" && g.type !== "radial") return false;
  if (
    g.rotation !== undefined &&
    (typeof g.rotation !== "number" || !Number.isFinite(g.rotation))
  ) {
    return false;
  }
  if (
    !Array.isArray(g.colorStops) || g.colorStops.length < 2 ||
    g.colorStops.length > 10
  ) {
    return false;
  }
  for (const stop of g.colorStops) {
    if (!stop || typeof stop !== "object" || Array.isArray(stop)) return false;
    const s = stop as Record<string, unknown>;
    if (
      typeof s.offset !== "number" || !Number.isFinite(s.offset) ||
      s.offset < 0 || s.offset > 1
    ) {
      return false;
    }
    if (!isValidColor(s.color)) {
      return false;
    }
  }
  return true;
}

export function isValidCustomStyle(cs: unknown): cs is QRStyle {
  if (!cs || typeof cs !== "object" || Array.isArray(cs)) return false;
  const s = cs as Record<string, unknown>;

  // Must have dots options
  if (!s.dots || typeof s.dots !== "object" || Array.isArray(s.dots)) {
    return false;
  }
  const dots = s.dots as Record<string, unknown>;
  const hasDotsColor = isValidColor(dots.color);
  const hasDotsGrad = dots.gradient !== undefined &&
    isValidGradient(dots.gradient);
  if (!hasDotsColor && !hasDotsGrad) return false;
  if (dots.gradient !== undefined && !hasDotsGrad) return false;
  if (dots.shape !== undefined) {
    const validShapes = [
      "rounded",
      "dots",
      "classy",
      "classy-rounded",
      "square",
      "extra-rounded",
    ];
    if (typeof dots.shape !== "string" || !validShapes.includes(dots.shape)) {
      return false;
    }
  }

  // Must have background options
  if (
    !s.background || typeof s.background !== "object" ||
    Array.isArray(s.background)
  ) {
    return false;
  }
  const bg = s.background as Record<string, unknown>;
  const hasBgColor = isValidColor(bg.color);
  const hasBgGrad = bg.gradient !== undefined && isValidGradient(bg.gradient);
  if (!hasBgColor && !hasBgGrad) return false;
  if (bg.gradient !== undefined && !hasBgGrad) return false;

  // cornersSquare is optional, but if present must be valid
  if (s.cornersSquare !== undefined && s.cornersSquare !== null) {
    if (typeof s.cornersSquare !== "object" || Array.isArray(s.cornersSquare)) {
      return false;
    }
    const csq = s.cornersSquare as Record<string, unknown>;
    if (csq.color !== undefined && !isValidColor(csq.color)) return false;
    if (csq.gradient !== undefined && !isValidGradient(csq.gradient)) {
      return false;
    }
  }

  // cornersDot is optional, but if present must be valid
  if (s.cornersDot !== undefined && s.cornersDot !== null) {
    if (typeof s.cornersDot !== "object" || Array.isArray(s.cornersDot)) {
      return false;
    }
    const cd = s.cornersDot as Record<string, unknown>;
    if (cd.color !== undefined && !isValidColor(cd.color)) return false;
    if (cd.gradient !== undefined && !isValidGradient(cd.gradient)) {
      return false;
    }
  }

  return true;
}

export function validateDesignPreferences(
  raw: unknown,
): DesignPreferences | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;

  // Check version
  if (obj.version !== 1) {
    return null;
  }

  // Validate style using own-property check to prevent prototype poisoning (e.g. constructor)
  let style = "sunset";
  if (typeof obj.style === "string") {
    if (Object.prototype.hasOwnProperty.call(QR_STYLES, obj.style)) {
      style = obj.style;
    } else if (obj.style === "custom") {
      style = "custom";
    }
  }

  // Validate customStyle: invalid custom data restores safe defaults
  let customStyle: QRStyle | null = null;
  if (style === "custom") {
    if (isValidCustomStyle(obj.customStyle)) {
      customStyle = obj.customStyle;
    } else {
      style = "sunset";
      customStyle = null;
    }
  }

  // Validate logoUrl
  let logoUrl = "";
  if (typeof obj.logoUrl === "string") {
    if (
      obj.logoUrl.startsWith("data:image/") &&
      obj.logoUrl.length <= MAX_STORED_LOGO_LENGTH
    ) {
      logoUrl = obj.logoUrl;
    }
  }

  // Validate frameConfig
  let frameConfig: { enabled: boolean; caption: string } | null = null;
  if (obj.frameConfig && typeof obj.frameConfig === "object") {
    const fc = obj.frameConfig as Record<string, unknown>;
    if (typeof fc.enabled === "boolean" && fc.enabled) {
      const caption = typeof fc.caption === "string"
        ? fc.caption.slice(0, 24)
        : "";
      frameConfig = { enabled: true, caption };
    }
  }

  // Validate pngSize
  let pngSize: 1000 | 2000 | 3000 = 1000;
  if (obj.pngSize === 1000 || obj.pngSize === 2000 || obj.pngSize === 3000) {
    pngSize = obj.pngSize;
  }

  return {
    version: 1,
    style,
    customStyle,
    logoUrl,
    frameConfig,
    pngSize,
  };
}

export function loadDesignPreferences(): DesignPreferences | null {
  try {
    if (typeof globalThis.localStorage === "undefined") return null;
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validateDesignPreferences(parsed);
  } catch {
    return null;
  }
}

export function saveDesignPreferences(prefs: DesignPreferences): boolean {
  try {
    if (typeof globalThis.localStorage === "undefined") return false;
    const validated = validateDesignPreferences(prefs);
    if (!validated) return false;
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return true;
  } catch {
    return false;
  }
}

export function resetDesignPreferences(): boolean {
  try {
    if (typeof globalThis.localStorage === "undefined") return false;
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(DEFAULT_DESIGN_PREFERENCES),
    );
    return true;
  } catch {
    return false;
  }
}
