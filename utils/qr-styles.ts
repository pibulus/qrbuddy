export const QR_STYLES = {
  sunset: {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FFE5B4" },
          { offset: 0.5, color: "#FF69B4" },
          { offset: 1, color: "#9370DB" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
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
        type: "linear",
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
        type: "linear",
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
        type: "radial",
        colorStops: [
          { offset: 0, color: "#87CEEB" },
          { offset: 0.5, color: "#4ECDC4" },
          { offset: 1, color: "#3AA8A4" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        rotation: 180,
        colorStops: [
          { offset: 0, color: "#E0FFFF" },
          { offset: 1, color: "#B0E0E6" },
        ],
      },
    },
    cornersSquare: {
      color: "#4ECDC4",
    },
    cornersDot: {
      color: "#3AA8A4",
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
        type: "linear",
        rotation: 90,
        colorStops: [
          { offset: 0, color: "#FF69B4" },
          { offset: 0.33, color: "#FFD700" },
          { offset: 0.66, color: "#4ECDC4" },
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
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FFD700" },
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
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FF00FF" },
          { offset: 0.5, color: "#00FFFF" },
          { offset: 1, color: "#FF00FF" },
        ],
      },
    },
    background: {
      type: "gradient",
      gradient: {
        type: "radial",
        colorStops: [
          { offset: 0, color: "rgba(255, 0, 255, 0.1)" },
          { offset: 1, color: "rgba(0, 255, 255, 0.1)" },
        ],
      },
    },
    cornersSquare: {
      color: "#FF00FF",
    },
    cornersDot: {
      color: "#00FFFF",
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

export function getRandomStyle() {
  const randomIndex = Math.floor(Math.random() * STYLE_NAMES.length);
  return STYLE_NAMES[randomIndex];
}
