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
    <h1 class="text-4xl sm:text-5xl font-black text-black tracking-tight leading-tight">
      The{" "}
      <span
        class={`inline-block transition-all duration-500 transform ${
          isVisible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"
        } bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent`}
      >
        {ADJECTIVES[index]}
      </span>
      <br />
      QR code generator.
    </h1>
  );
}
