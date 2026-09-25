import { useEffect, useState } from "preact/hooks";

const ADJECTIVES = [
  "best",
  "sweetest",
  "smartest",
  "simplest",
  "cutest",
  "lush",
];

export default function RotatingTitle() {
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
        setIndex((prev) => (prev + 1) % ADJECTIVES.length);
        setIsVisible(true);
      }, 500); // Wait for fade out
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div class="text-lg sm:text-xl text-gray-600 font-medium">
      The{" "}
      <span
        class={`inline-block transition-all duration-500 transform ${
          isVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        } font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent`}
      >
        {ADJECTIVES[index]}
      </span>{" "}
      QR code generator.
    </div>
  );
}
