import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "chunky": ["Inter Black", "Inter", "system-ui", "sans-serif"],
      },

      animation: {
        "squish": "squish 0.15s ease-out",
        "rotate-shuffle":
          "rotate-shuffle 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "float": "float 6s ease-in-out infinite",
        "gradient-flow": "gradient-flow 3s ease infinite",
        "pop": "pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "fade-out": "fade-out 0.5s ease-out forwards",
        "shake": "shake 0.3s ease-in-out",
        "slide-down": "slide-down 0.2s ease-out",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },

      keyframes: {
        "squish": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.95) scaleY(0.9)" },
          "100%": { transform: "scale(1)" },
        },
        "rotate-shuffle": {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.1)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-flow": {
          "0%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
          "100%": { "background-position": "0% 50%" },
        },
        "pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateX(-50%) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(-50%) scale(0.9)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 105, 180, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 105, 180, 0.6), 0 0 60px rgba(255, 105, 180, 0.3)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },

      colors: {
        qr: {
          // Sunset gradient
          sunset1: "#FFE5B4",
          sunset2: "#FF69B4",
          sunset3: "#9370DB",

          // Pool gradient
          pool1: "#87CEEB",
          pool2: "#4ECDC4",
          pool3: "#B0E0E6",

          // Terminal
          terminal: "#00FF41",
          terminalBg: "#0A0A0A",

          // Candy gradient
          candy1: "#FF69B4",
          candy2: "#FFD700",
          candy3: "#4ECDC4",

          // Vapor gradient
          vapor1: "#FF00FF",
          vapor2: "#00FFFF",

          // Brutalist
          brutal: "#000000",
          brutalBg: "#FFFF00",

          // Background
          cream: "#FFF8F0",
        },
      },

      boxShadow: {
        "chunky": "4px 4px 0px rgba(0, 0, 0, 0.25)",
        "chunky-hover": "6px 6px 0px rgba(0, 0, 0, 0.3)",
        "glow": "0 0 20px rgba(255, 105, 180, 0.3)",
      },

      borderRadius: {
        "chunky": "12px",
      },

      borderWidth: {
        "3": "3px",
        "4": "4px",
      },
    },
  },
  plugins: [],
} satisfies Config;