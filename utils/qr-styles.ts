export const QR_STYLES = {
  sunset: {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 45,
        colorStops: [
          // Golden-hour orange, not peach — peach (#FFE5B4) matched the bg's
          // own gradient end and made the top corner undecodable.
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
      gradient: {
        type: "radial" as const,
        // Deep-end blues — the old sky-blue/teal stops sat too close to the
        // aqua background luminance for decoders.
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
      color: "#2E8B87",
    },
    cornersDot: {
      color: "#256F6B",
    },
  },

  terminal: {
    dots: {
      color: "#00FF41",
    },
    background: {
      color: "#0A0A0A",
    },
    cornersSquare: {
      color: "#00FF41",
    },
    cornersDot: {
      color: "#00FF41",
    },
  },

  candy: {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 90,
        colorStops: [
          // Hard-candy saturation — gold (#FFD700) on the blush bg was
          // ~1.25:1 contrast and failed every decoder tested.
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
      color: "#FF69B4",
    },
  },

  vapor: {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear" as const,
        rotation: 45,
        colorStops: [
          // Deepened from pure neon (#FF00FF/#00FFFF): full-saturation hues on
          // a tinted bg decoded only at lucky resolutions. These keep the
          // vaporwave read with real luminance margin.
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
      color: "#E600E6",
    },
    cornersDot: {
      color: "#009999",
    },
  },

  noir: {
    dots: {
      color: "#1A1A1A",
    },
    background: {
      color: "#FAFAFA",
    },
    cornersSquare: {
      color: "#1A1A1A",
    },
    cornersDot: {
      color: "#1A1A1A",
    },
  },
  brutalist: {
    dots: {
      color: "#000000",
    },
    background: {
      color: "#FFFF00",
    },
    cornersSquare: {
      color: "#000000",
    },
    cornersDot: {
      color: "#000000",
    },
  },
};

export const STYLE_NAMES = Object.keys(QR_STYLES) as (keyof typeof QR_STYLES)[];
