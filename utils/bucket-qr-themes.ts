// Text-card theming keyed to the real QR styles (see utils/qr-styles.ts).
export const TEXT_CARD_THEMES: Record<
  string,
  { card: string; bar: string; text?: string }
> = {
  sunset: {
    card: "bg-gradient-to-br from-[#FFFDF8] to-[#FFF1DC]",
    bar: "bg-gradient-to-r from-[#B43E0E] via-[#B51763] to-[#6B21A8]",
    text: "text-black",
  },
  candy: {
    card: "bg-gradient-to-br from-[#FFF0F7] to-[#F0F9FF]",
    bar: "bg-gradient-to-r from-[#BE185D] via-[#6D28D9] to-[#0E6480]",
    text: "text-black",
  },
  blush: {
    card: "bg-gradient-to-br from-[#FFF5F7] to-[#FFE4E9]",
    bar: "bg-gradient-to-r from-[#9F1239] via-[#BE185D] to-[#831843]",
    text: "text-black",
  },
  matcha: {
    card: "bg-gradient-to-br from-[#F2FBF7] to-[#DCFCE7]",
    bar: "bg-gradient-to-r from-[#14532D] to-[#115E59]",
    text: "text-black",
  },
  pool: {
    card: "bg-gradient-to-br from-[#ECFEFF] to-[#CFFAFE]",
    bar: "bg-gradient-to-r from-[#035E8B] to-[#0B5E55]",
    text: "text-black",
  },
  vapor: {
    card: "bg-gradient-to-br from-[#F5F3FF] to-[#FCE7F3]",
    bar: "bg-gradient-to-r from-[#5B21B6] to-[#9D174D]",
    text: "text-black",
  },
  grape: {
    card: "bg-gradient-to-br from-[#EEF2FF] to-[#EDE9FE]",
    bar: "bg-gradient-to-r from-[#3730A3] to-[#6B21A8]",
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
