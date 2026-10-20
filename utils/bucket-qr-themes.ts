// Text-card theming keyed to the real QR styles (see utils/qr-styles.ts).
export const TEXT_CARD_THEMES: Record<
  string,
  { card: string; bar: string; text?: string }
> = {
  sunset: {
    card: "bg-gradient-to-br from-[#FFF8F0] to-[#FFE5B4]",
    bar: "bg-gradient-to-r from-[#F97316] via-[#FF69B4] to-[#9370DB]",
    text: "text-black",
  },
  candy: {
    card: "bg-gradient-to-br from-[#FFF0F7] to-[#F0F9FF]",
    bar: "bg-gradient-to-r from-[#FF2E93] via-[#7C3AED] to-[#0891B2]",
    text: "text-black",
  },
  blush: {
    card: "bg-gradient-to-br from-[#FFF5F7] to-[#FFE4E9]",
    bar: "bg-gradient-to-r from-[#F43F5E] via-[#E11D48] to-[#9D174D]",
    text: "text-black",
  },
  matcha: {
    card: "bg-gradient-to-br from-[#F2FBF7] to-[#DCFCE7]",
    bar: "bg-gradient-to-r from-[#059669] to-[#0F766E]",
    text: "text-black",
  },
  pool: {
    card: "bg-gradient-to-br from-[#ECFEFF] to-[#CFFAFE]",
    bar: "bg-gradient-to-r from-[#0EA5E9] to-[#0D9488]",
    text: "text-black",
  },
  vapor: {
    card: "bg-gradient-to-br from-[#F5F3FF] to-[#FCE7F3]",
    bar: "bg-gradient-to-r from-[#8B5CF6] to-[#DB2777]",
    text: "text-black",
  },
  grape: {
    card: "bg-gradient-to-br from-[#EEF2FF] to-[#EDE9FE]",
    bar: "bg-gradient-to-r from-[#4F46E5] to-[#9333EA]",
    text: "text-black",
  },
  noir: {
    card: "bg-[#0F172A]",
    bar: "bg-gradient-to-r from-indigo-400 to-slate-100",
    text: "text-slate-100",
  },
  brutalist: {
    card: "bg-[#FFFF00]",
    bar: "bg-black",
    text: "text-black",
  },
  terminal: {
    card: "bg-[#0A0A0A]",
    bar: "bg-gradient-to-r from-[#00FF41] to-emerald-500",
    text: "text-[#00FF41]",
  },
};
