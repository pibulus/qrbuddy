import { useEffect, useState } from "preact/hooks";
import { Signal } from "@preact/signals";

interface EasterEggsProps {
  url: Signal<string>;
  style: Signal<string>;
}

const EASTER_EGGS = {
  "peepee": { style: "candy", message: "💛 hehe", color: "#FFD700" },
  "420": { style: "vapor", message: "🌿 blaze it", color: "#00FF00" },
  "666": { style: "brutalist", message: "😈 metal", color: "#FF0000" },
  "uwu": { style: "candy", message: "✨ kawaii", color: "#FF69B4" },
  "mesa cosa": { style: "sunset", message: "🎸 rock on!", color: "#FF6B6B" },
  "69": { style: "pool", message: "😏 nice", color: "#4ECDC4" },
  "1337": { style: "terminal", message: "💻 l33t h4x0r", color: "#00FF41" },
  "yolo": { style: "vapor", message: "🚀 send it", color: "#FF00FF" },
  "porkbun": { style: "sunset", message: "🐷 oink oink", color: "#FFB6C1" },
};

export default function EasterEggs({ url, style }: EasterEggsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [color, setColor] = useState<string>("#000000");
  const [showEffect, setShowEffect] = useState(false);

  useEffect(() => {
    const text = url.value.toLowerCase();

    for (const [trigger, config] of Object.entries(EASTER_EGGS)) {
      if (text.includes(trigger)) {
        style.value = config.style;
        setMessage(config.message);
        setColor(config.color);
        setShowEffect(true);

        // Clear message after animation
        setTimeout(() => {
          setShowEffect(false);
        }, 3000);

        setTimeout(() => {
          setMessage(null);
        }, 3500);

        break;
      }
    }
  }, [url.value]);

  if (!message) return null;

  return (
    <div
      class={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-50
        px-6 py-3 rounded-full font-black text-xl
        ${showEffect ? "animate-pop" : "animate-fade-out"}
        transition-all duration-500
      `}
      style={`background-color: ${color}; color: white; text-shadow: 2px 2px 0 rgba(0,0,0,0.2);`}
    >
      {message}
    </div>
  );
}
