// qr-code-styling reads gradient `rotation` in radians. The presets sweep
// the same 135° diagonal so the gallery catches the light uniformly.
const DIAGONAL = Math.PI * 0.75;

function srgbChannelToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hslToRgb(
  h: number,
  sPct: number,
  lPct: number,
): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, sPct)) / 100;
  const l = Math.max(0, Math.min(100, lPct)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

export function parseColorToRgb(color: string): [number, number, number] {
  const trimmed = color.trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(trimmed);
  if (hexMatch) {
    const raw = hexMatch[1];
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ];
    }
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  const hslMatch =
    /^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/i
      .exec(trimmed);
  if (hslMatch) {
    return hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]),
      parseFloat(hslMatch[3]),
    );
  }
  throw new Error(`Unsupported color format: ${color}`);
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance(color: string): number {
  const [r, g, b] = parseColorToRgb(color);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** WCAG contrast ratio between two colors (≥ 1). */
export function contrastRatio(colorA: string, colorB: string): number {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Scannability floor for any preset: every dot/corner stop stays at
// relative luminance <= 0.145 and >= 4.6:1 against its own background and
// warm cream (#FBF1E4) so built-in presets match Color Studio's print-shop lock.
export const QR_STYLES = {
  sunset: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#B43E0E" },
          { offset: 0.5, color: "#B51763" },
          { offset: 1, color: "#6B21A8" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDF8" },
          { offset: 1, color: "#FFF1DC" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#B51763" },
          { offset: 1, color: "#6B21A8" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#6B21A8" },
          { offset: 1, color: "#B51763" },
        ],
      },
    },
  },

  pool: {
    dots: {
      type: "gradient",
      shape: "extra-rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#035E8B" },
          { offset: 0.5, color: "#0B5D6E" },
          { offset: 1, color: "#0B5E55" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDF9" },
          { offset: 1, color: "#F0FDFA" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#035E8B" },
          { offset: 1, color: "#0B5E55" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#0B5E55" },
          { offset: 1, color: "#0B5D6E" },
        ],
      },
    },
  },

  terminal: {
    dots: {
      shape: "square" as const,
      color: "#00FF41",
    },
    background: {
      color: "#0A0A0A",
    },
    cornersSquare: {
      shape: "square" as const,
      color: "#00FF41",
    },
    cornersDot: {
      shape: "square" as const,
      color: "#00FF41",
    },
  },

  candy: {
    dots: {
      type: "gradient",
      shape: "dots" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#BE185D" },
          { offset: 0.5, color: "#6D28D9" },
          { offset: 1, color: "#0E6480" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFF8FB" },
          { offset: 1, color: "#F5F9FF" },
        ],
      },
    },
    cornersSquare: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#BE185D" },
          { offset: 1, color: "#6D28D9" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#6D28D9" },
          { offset: 1, color: "#0E6480" },
        ],
      },
    },
  },

  vapor: {
    dots: {
      type: "gradient",
      shape: "dots" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#5B21B6" },
          { offset: 0.5, color: "#6B21A8" },
          { offset: 1, color: "#9D174D" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDFB" },
          { offset: 1, color: "#FAF5FF" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#5B21B6" },
          { offset: 1, color: "#9D174D" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#9D174D" },
          { offset: 1, color: "#6B21A8" },
        ],
      },
    },
  },

  noir: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#1E1B4B" },
          { offset: 1, color: "#0F172A" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDF9" },
          { offset: 1, color: "#F5F3EE" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#1E1B4B" },
          { offset: 1, color: "#0F172A" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#0F172A" },
          { offset: 1, color: "#1E1B4B" },
        ],
      },
    },
  },

  brutalist: {
    dots: {
      shape: "square" as const,
      color: "#1e1714",
    },
    background: {
      color: "#FFE94A",
    },
    cornersSquare: {
      shape: "square" as const,
      color: "#1e1714",
    },
    cornersDot: {
      shape: "square" as const,
      color: "#1e1714",
    },
  },

  blush: {
    dots: {
      type: "gradient",
      shape: "classy-rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#9F1239" },
          { offset: 0.5, color: "#BE185D" },
          { offset: 1, color: "#831843" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFF9F9" },
          { offset: 1, color: "#FFF0F3" },
        ],
      },
    },
    cornersSquare: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#9F1239" },
          { offset: 1, color: "#831843" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#831843" },
          { offset: 1, color: "#BE185D" },
        ],
      },
    },
  },

  grape: {
    dots: {
      type: "gradient",
      shape: "classy" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#3730A3" },
          { offset: 0.5, color: "#5B21B6" },
          { offset: 1, color: "#6B21A8" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDFB" },
          { offset: 1, color: "#F5F3FF" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#3730A3" },
          { offset: 1, color: "#6B21A8" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#6B21A8" },
          { offset: 1, color: "#3730A3" },
        ],
      },
    },
  },

  matcha: {
    dots: {
      type: "gradient",
      shape: "classy-rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#14532D" },
          { offset: 0.5, color: "#065F46" },
          { offset: 1, color: "#115E59" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFFDF9" },
          { offset: 1, color: "#F4FBF7" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#14532D" },
          { offset: 1, color: "#115E59" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#115E59" },
          { offset: 1, color: "#065F46" },
        ],
      },
    },
  },
};

export const STYLE_NAMES = Object.keys(QR_STYLES) as (keyof typeof QR_STYLES)[];

export interface QRThemeTokens {
  /** Vibrant accent hex (#RRGGBB) for close buttons, badges, and scan card shadows */
  accent: string;
  /** Deeper accent hex (#RRGGBB) for hover states on vibrant elements */
  accentDeep: string;
  /** Soft pastel surface tint (#RRGGBB) for subtle hover states */
  tint: string;
  /** Richer pastel fill (#RRGGBB) for active pills/toggles & enabled accordion headers (high contrast with #1e1714 ink) */
  tintStrong: string;
  /** Primary bottom CTA background (#RRGGBB) paired with #1e1714 ink */
  ctaBg: string;
  /** Primary bottom CTA hover background (#RRGGBB) */
  ctaHover: string;
  /** Primary bottom CTA active background (#RRGGBB) */
  ctaActive: string;
}

const PALETTE_THEME_TOKENS: Record<keyof typeof QR_STYLES, QRThemeTokens> = {
  sunset: {
    accent: "#BE185D",
    accentDeep: "#9D174D",
    tint: "#FCE7F3",
    tintStrong: "#FBCFE8",
    ctaBg: "#F9A8D4",
    ctaHover: "#F472B6",
    ctaActive: "#BE185D",
  },
  pool: {
    accent: "#0369A1",
    accentDeep: "#075985",
    tint: "#E0F2FE",
    tintStrong: "#BAE6FD",
    ctaBg: "#7DD3FC",
    ctaHover: "#38BDF8",
    ctaActive: "#0369A1",
  },
  matcha: {
    accent: "#047857",
    accentDeep: "#065F46",
    tint: "#D1FAE5",
    tintStrong: "#A7F3D0",
    ctaBg: "#6EE7B7",
    ctaHover: "#34D399",
    ctaActive: "#047857",
  },
  blush: {
    accent: "#BE123C",
    accentDeep: "#9F1239",
    tint: "#FFE4E6",
    tintStrong: "#FECDD3",
    ctaBg: "#FDA4AF",
    ctaHover: "#FB7185",
    ctaActive: "#BE123C",
  },
  vapor: {
    accent: "#7E22CE",
    accentDeep: "#6B21A8",
    tint: "#F3E8FF",
    tintStrong: "#E9D5FF",
    ctaBg: "#D8B4FE",
    ctaHover: "#C084FC",
    ctaActive: "#7E22CE",
  },
  grape: {
    accent: "#6D28D9",
    accentDeep: "#5B21B6",
    tint: "#EDE9FE",
    tintStrong: "#DDD6FE",
    ctaBg: "#C4B5FD",
    ctaHover: "#A78BFA",
    ctaActive: "#6D28D9",
  },
  candy: {
    accent: "#BE185D",
    accentDeep: "#9D174D",
    tint: "#FCE7F3",
    tintStrong: "#FBCFE8",
    ctaBg: "#F9A8D4",
    ctaHover: "#F472B6",
    ctaActive: "#BE185D",
  },
  terminal: {
    accent: "#047857",
    accentDeep: "#065F46",
    tint: "#DCFCE7",
    tintStrong: "#BBF7D0",
    ctaBg: "#86EFAC",
    ctaHover: "#4ADE80",
    ctaActive: "#047857",
  },
  brutalist: {
    accent: "#EAB308",
    accentDeep: "#CA8A04",
    tint: "#FEF9C3",
    tintStrong: "#FEF08A",
    ctaBg: "#FDE047",
    ctaHover: "#FACC15",
    ctaActive: "#EAB308",
  },
  noir: {
    accent: "#4338CA",
    accentDeep: "#3730A3",
    tint: "#E0E7FF",
    tintStrong: "#C7D2FE",
    ctaBg: "#A5B4FC",
    ctaHover: "#93A2FA",
    ctaActive: "#4338CA",
  },
};

const PAYOFF_CTA_COLORS = {
  ctaBg: "#FFBE0B",
  ctaHover: "#FFD04A",
  ctaActive: "#F2AC00",
};
export const QR_THEME_TOKENS = Object.fromEntries(
  Object.entries(PALETTE_THEME_TOKENS).map((
    [key, tokens],
  ) => [key, { ...tokens, ...PAYOFF_CTA_COLORS }]),
) as Record<keyof typeof QR_STYLES, QRThemeTokens>;

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function mixWithWarmPaper(
  rgb: readonly [number, number, number],
  pigmentWeight: number,
): string {
  const paper = [255, 254, 247] as const;
  const w = Math.max(0, Math.min(1, pigmentWeight));
  return rgbToHex(
    paper[0] * (1 - w) + rgb[0] * w,
    paper[1] * (1 - w) + rgb[1] * w,
    paper[2] * (1 - w) + rgb[2] * w,
  );
}

export function getQRThemeTokens(
  styleKey: string,
  customStyle?: {
    dots?: {
      color?: string;
      gradient?: { colorStops?: Array<{ color: string }> };
    };
  } | null,
): QRThemeTokens {
  if (
    styleKey !== "custom" &&
    Object.prototype.hasOwnProperty.call(QR_THEME_TOKENS, styleKey)
  ) {
    return QR_THEME_TOKENS[styleKey as keyof typeof QR_STYLES];
  }

  if (styleKey === "custom" && customStyle?.dots) {
    const rawColor = customStyle.dots.gradient?.colorStops?.[0]?.color ??
      customStyle.dots.color;
    if (rawColor) {
      try {
        const rgb = parseColorToRgb(rawColor);
        return {
          accent: rgbToHex(rgb[0], rgb[1], rgb[2]),
          accentDeep: rgbToHex(rgb[0] * 0.85, rgb[1] * 0.85, rgb[2] * 0.85),
          tint: mixWithWarmPaper(rgb, 0.12),
          tintStrong: mixWithWarmPaper(rgb, 0.24),
          ...PAYOFF_CTA_COLORS,
        };
      } catch {
        // Fall through to sunset default
      }
    }
  }

  return QR_THEME_TOKENS.sunset;
}

export function getQRThemeStyleVars(
  styleKey: string,
  customStyle?: {
    dots?: {
      color?: string;
      gradient?: { colorStops?: Array<{ color: string }> };
    };
  } | null,
): Record<string, string> {
  const t = getQRThemeTokens(styleKey, customStyle);
  return {
    "--qr-theme-accent": t.accent,
    "--qr-theme-accent-deep": t.accentDeep,
    "--qr-theme-tint": t.tint,
    "--qr-theme-tint-strong": t.tintStrong,
    "--qr-theme-cta-bg": t.ctaBg,
    "--qr-theme-cta-hover": t.ctaHover,
    "--qr-theme-cta-active": t.ctaActive,
  };
}
