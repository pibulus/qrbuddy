// qr-code-styling reads gradient `rotation` in radians. The two-tone presets
// all sweep the same 135° diagonal so the gallery catches the light uniformly;
// the older multi-stop ones (sunset/candy/blush) keep their tuned angles.
const DIAGONAL = Math.PI * 0.75;

// Scannability floor for any preset: every dot stop stays at relative
// luminance ≤ 0.40 and ≥ 2:1 against its own background — that is where the
// proven-scanning presets (sunset, candy) already live. Pretty-but-pale lime
// or amber stops break phone cameras on cream paper.
export const QR_STYLES = {
  sunset: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FF8C42" },
          { offset: 0.5, color: "#FF69B4" },
          { offset: 1, color: "#9370DB" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 135,
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
        rotation: 45,
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
        rotation: 45,
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
        rotation: 90,
        colorStops: [
          { offset: 0, color: "#FF69B4" },
          { offset: 0.33, color: "#FF8C00" },
          { offset: 0.66, color: "#2EB5AC" },
          { offset: 1, color: "#FF69B4" },
        ],
      },
    },
    background: {
      color: "#FFF0F5",
    },
    cornersSquare: {
      shape: "dot" as const,
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FF8C00" },
          { offset: 1, color: "#FF69B4" },
        ],
      },
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#FF69B4",
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
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#D48166" },
          { offset: 0.5, color: "#BA5566" },
          { offset: 1, color: "#8E44AD" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 135,
        colorStops: [
          { offset: 0, color: "#FFF5F5" },
          { offset: 1, color: "#FED7D7" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#BA5566",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#D48166",
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
          { offset: 0, color: "#65A30D" },
          { offset: 1, color: "#047857" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: DIAGONAL,
        colorStops: [
          { offset: 0, color: "#F1F8E9" },
          { offset: 1, color: "#DCEDC8" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#047857",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#65A30D",
    },
  },
};

export const STYLE_NAMES = Object.keys(QR_STYLES) as (keyof typeof QR_STYLES)[];
