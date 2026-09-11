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
        type: "radial" as const,
        colorStops: [
          { offset: 0, color: "#4AA8D8" },
          { offset: 0.5, color: "#2EB5AC" },
          { offset: 1, color: "#2E8B87" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 180,
        colorStops: [
          { offset: 0, color: "#E0FFFF" },
          { offset: 1, color: "#C9EEF2" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#2E8B87",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#256F6B",
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
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#E600E6" },
          { offset: 0.5, color: "#009999" },
          { offset: 1, color: "#E600E6" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "radial" as const,
        colorStops: [
          { offset: 0, color: "rgba(255, 0, 255, 0.14)" },
          { offset: 1, color: "rgba(0, 255, 255, 0.14)" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#E600E6",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#009999",
    },
  },

  noir: {
    dots: {
      shape: "classy" as const,
      color: "#1A1A1A",
    },
    background: {
      color: "#FAFAFA",
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#1A1A1A",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#1A1A1A",
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

  matcha: {
    dots: {
      type: "gradient",
      shape: "rounded" as const,
      gradient: {
        type: "linear" as const,
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#2E7D32" },
          { offset: 0.5, color: "#1B5E20" },
          { offset: 1, color: "#004D40" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 135,
        colorStops: [
          { offset: 0, color: "#F1F8E9" },
          { offset: 1, color: "#DCEDC8" },
        ],
      },
    },
    cornersSquare: {
      shape: "extra-rounded" as const,
      color: "#1B5E20",
    },
    cornersDot: {
      shape: "dot" as const,
      color: "#2E7D32",
    },
  },
};

export const STYLE_NAMES = Object.keys(QR_STYLES) as (keyof typeof QR_STYLES)[];
