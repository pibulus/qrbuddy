// Text-card theming keyed to the real QR styles (see utils/qr-styles.ts).
export const TEXT_CARD_THEMES: Record<
  string,
  { card: string; bar: string; text?: string }
> = {
  sunset: {
    card: "bg-gradient-to-br from-orange-50 to-pink-50",
    bar: "bg-gradient-to-r from-yellow-400 to-orange-500",
  },
  pool: {
    card: "bg-gradient-to-br from-blue-50 to-cyan-50",
    bar: "bg-gradient-to-r from-blue-400 to-cyan-500",
  },
  terminal: {
    card: "bg-gray-900",
    bar: "bg-gradient-to-r from-green-400 to-emerald-500",
    text: "text-green-400",
  },
  candy: {
    card: "bg-gradient-to-br from-pink-50 to-purple-50",
    bar: "bg-gradient-to-r from-pink-400 to-purple-500",
  },
  vapor: {
    card: "bg-gradient-to-br from-purple-50 to-cyan-50",
    bar: "bg-gradient-to-r from-purple-400 to-cyan-400",
  },
  noir: {
    card: "bg-gray-900",
    bar: "bg-gradient-to-r from-gray-400 to-white",
    text: "text-gray-100",
  },
  brutalist: {
    card: "bg-white",
    bar: "bg-black",
  },
};
