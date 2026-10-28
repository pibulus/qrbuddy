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

// Scannability floor for any preset: every dot stop stays at relative
// luminance ≤ 0.40 and ≥ 2:1 against its own background — that is where the
// proven-scanning presets live. Pretty-but-pale lime or amber stops break
// phone cameras on cream paper.
export const QR_STYLES = {
  sunset: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#F97316" },
          { offset: 0.5, color: "#FF69B4" },
          { offset: 1, color: "#9370DB" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#FFF8F0" },
          { offset: 1, color: "#FFE5B4" },
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
          { offset: 0, color: "#FF69B4" },
          { offset: 1, color: "#9370DB" },
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
          { offset: 0, color: "#9370DB" },
          { offset: 1, color: "#FF69B4" },
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
          { offset: 0, color: "#0EA5E9" },
          { offset: 0.5, color: "#0891B2" },
          { offset: 1, color: "#0D9488" },
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
          { offset: 0, color: "#0EA5E9" },
          { offset: 1, color: "#0D9488" },
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
          { offset: 0, color: "#0D9488" },
          { offset: 1, color: "#0891B2" },
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
          { offset: 0, color: "#FF2E93" },
          { offset: 0.5, color: "#7C3AED" },
          { offset: 1, color: "#0891B2" },
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
          { offset: 0, color: "#FF2E93" },
          { offset: 1, color: "#7C3AED" },
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
          { offset: 0, color: "#7C3AED" },
          { offset: 1, color: "#0891B2" },
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
          { offset: 0, color: "#6D28D9" },
          { offset: 0.5, color: "#9333EA" },
          { offset: 1, color: "#DB2777" },
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
          { offset: 0, color: "#6D28D9" },
          { offset: 1, color: "#DB2777" },
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
          { offset: 0, color: "#DB2777" },
          { offset: 1, color: "#9333EA" },
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
      color: "#000000",
    },
    background: {
      color: "#FFFF00",
    },
    cornersSquare: {
      shape: "square" as const,
      color: "#000000",
    },
    cornersDot: {
      shape: "square" as const,
      color: "#000000",
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
          { offset: 0, color: "#E11D48" },
          { offset: 0.5, color: "#DB2777" },
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
          { offset: 0, color: "#E11D48" },
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
          { offset: 1, color: "#DB2777" },
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
          { offset: 0, color: "#4F46E5" },
          { offset: 0.5, color: "#7C3AED" },
          { offset: 1, color: "#9333EA" },
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
          { offset: 0, color: "#4F46E5" },
          { offset: 1, color: "#9333EA" },
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
          { offset: 0, color: "#9333EA" },
          { offset: 1, color: "#4F46E5" },
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
          { offset: 0, color: "#15803D" },
          { offset: 0.5, color: "#059669" },
          { offset: 1, color: "#0F766E" },
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
          { offset: 0, color: "#15803D" },
          { offset: 1, color: "#0F766E" },
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
          { offset: 0, color: "#0F766E" },
          { offset: 1, color: "#059669" },
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

export const QR_THEME_TOKENS: Record<keyof typeof QR_STYLES, QRThemeTokens> = {
  sunset: {
    accent: "#EC4899",
    accentDeep: "#DB2777",
    tint: "#FCE7F3",
    tintStrong: "#FBCFE8",
    ctaBg: "#F9A8D4",
    ctaHover: "#F472B6",
    ctaActive: "#EC4899",
  },
  pool: {
    accent: "#0891B2",
    accentDeep: "#0E7490",
    tint: "#E0F2FE",
    tintStrong: "#BAE6FD",
    ctaBg: "#7DD3FC",
    ctaHover: "#38BDF8",
    ctaActive: "#0EA5E9",
  },
  matcha: {
    accent: "#059669",
    accentDeep: "#047857",
    tint: "#D1FAE5",
    tintStrong: "#A7F3D0",
    ctaBg: "#6EE7B7",
    ctaHover: "#34D399",
    ctaActive: "#10B981",
  },
  blush: {
    accent: "#E11D48",
    accentDeep: "#BE123C",
    tint: "#FFE4E6",
    tintStrong: "#FECDD3",
    ctaBg: "#FDA4AF",
    ctaHover: "#FB7185",
    ctaActive: "#F43F5E",
  },
  vapor: {
    accent: "#9333EA",
    accentDeep: "#7E22CE",
    tint: "#F3E8FF",
    tintStrong: "#E9D5FF",
    ctaBg: "#D8B4FE",
    ctaHover: "#C084FC",
    ctaActive: "#B46EF9",
  },
  grape: {
    accent: "#7C3AED",
    accentDeep: "#6D28D9",
    tint: "#EDE9FE",
    tintStrong: "#DDD6FE",
    ctaBg: "#C4B5FD",
    ctaHover: "#A78BFA",
    ctaActive: "#9D74F7",
  },
  candy: {
    accent: "#FF2E93",
    accentDeep: "#DB2777",
    tint: "#FCE7F3",
    tintStrong: "#FBCFE8",
    ctaBg: "#F9A8D4",
    ctaHover: "#F472B6",
    ctaActive: "#EC4899",
  },
  terminal: {
    accent: "#10B981",
    accentDeep: "#059669",
    tint: "#DCFCE7",
    tintStrong: "#BBF7D0",
    ctaBg: "#86EFAC",
    ctaHover: "#4ADE80",
    ctaActive: "#22C55E",
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
    accent: "#4F46E5",
    accentDeep: "#4338CA",
    tint: "#E0E7FF",
    tintStrong: "#C7D2FE",
    ctaBg: "#A5B4FC",
    ctaHover: "#93A2FA",
    ctaActive: "#818CF8",
  },
};

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
  rgb: [number, number, number],
  weight: number,
): string {
  // Blend with warm near-white (#FFFEF7 -> [255, 254, 247])
  const paper: [number, number, number] = [255, 254, 247];
  return rgbToHex(
    paper[0] + (rgb[0] - paper[0]) * weight,
    paper[1] + (rgb[1] - paper[1]) * weight,
    paper[2] + (rgb[2] - paper[2]) * weight,
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
          tint: mixWithWarmPaper(rgb, 0.14),
          tintStrong: mixWithWarmPaper(rgb, 0.24),
          ctaBg: mixWithWarmPaper(rgb, 0.34),
          ctaHover: mixWithWarmPaper(rgb, 0.42),
          ctaActive: mixWithWarmPaper(rgb, 0.50),
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
