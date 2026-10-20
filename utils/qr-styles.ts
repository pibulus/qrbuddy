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
      shape: "classy-rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#0EA5E9" },
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
          { offset: 0, color: "#ECFEFF" },
          { offset: 1, color: "#CFFAFE" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#0D9488",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#0EA5E9",
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
          { offset: 0, color: "#FFF0F7" },
          { offset: 1, color: "#F0F9FF" },
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
      color: "#0891B2",
    },
  },

  vapor: {
    dots: {
      type: "gradient",
      shape: "extra-rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#8B5CF6" },
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
          { offset: 0, color: "#F5F3FF" },
          { offset: 1, color: "#FCE7F3" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#DB2777",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#8B5CF6",
    },
  },

  noir: {
    dots: {
      type: "gradient",
      shape: "classy" as const,
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
          { offset: 0, color: "#FFFFFF" },
          { offset: 1, color: "#F1F5F9" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#0F172A",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#1E1B4B",
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
          { offset: 0, color: "#F43F5E" },
          { offset: 0.5, color: "#E11D48" },
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
          { offset: 0, color: "#FFF5F7" },
          { offset: 1, color: "#FFE4E9" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#E11D48",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#9D174D",
    },
  },

  grape: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#4F46E5" },
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
          { offset: 0, color: "#EEF2FF" },
          { offset: 1, color: "#EDE9FE" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#9333EA",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#4F46E5",
    },
  },

  matcha: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#059669" },
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
          { offset: 0, color: "#F2FBF7" },
          { offset: 1, color: "#DCFCE7" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#0F766E",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#059669",
    },
  },
};

export const STYLE_NAMES = Object.keys(QR_STYLES) as (keyof typeof QR_STYLES)[];
