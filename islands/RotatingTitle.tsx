import { useEffect, useState } from "preact/hooks";
import type { Locale } from "../utils/i18n.ts";

const ADJECTIVES: Record<Locale, readonly string[]> = {
  en: [
    "best",
    "sweetest",
    "smartest",
    "simplest",
    "cutest",
    "lush",
  ],
  es: [
    "más chulo",
    "más dulce",
    "más listo",
    "más simple",
    "más lindo",
    "más fino",
  ],
};

export default function RotatingTitle(
  { lang = "en" }: { lang?: Locale },
) {
  const words = ADJECTIVES[lang] ?? ADJECTIVES.en;
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Word-cycling is decorative motion, not essential — honor the OS
    // preference instead of forcing it on everyone (WCAG 2.3.3).
    const reducedMotion = globalThis.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % words.length);
        setIsVisible(true);
      }, 500); // Wait for fade out
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [words.length]);

  const badge = (
    <span
      class={`inline-block transition-all duration-500 transform ${
        isVisible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95"
      } font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent`}
    >
      {words[index % words.length]}
    </span>
  );

  return (
    <div class="text-lg sm:text-xl text-gray-600 font-medium">
      {lang === "es"
        ? <>El generador de códigos QR {badge}.</>
        : <>The {badge} QR code generator.</>}
    </div>
  );
}
