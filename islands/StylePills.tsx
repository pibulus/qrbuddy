import { Signal } from "@preact/signals";

interface StylePillsProps {
  style: Signal<string>;
}

export default function StylePills({ style }: StylePillsProps) {
  return (
    <div class="flex flex-wrap gap-3 justify-center">
      {["sunset", "pool", "terminal", "candy", "vapor", "brutalist"].map((
        s,
      ) => (
        <button
          type="button"
          key={s}
          onClick={() => style.value = s}
          class={`
            px-4 py-2 min-h-[44px] text-sm font-bold capitalize
            rounded-full border-3 transition-all duration-200
            ${
            style.value === s
              ? "bg-black text-white border-black scale-110 shadow-glow animate-pulse"
              : "bg-white text-black border-gray-400 hover:border-black hover:scale-105 hover:shadow-md"
          }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
