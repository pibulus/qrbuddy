import { Signal } from "@preact/signals";

interface StylePillsProps {
  style: Signal<string>;
}

export default function StylePills({ style }: StylePillsProps) {
  return (
    <div class="flex flex-wrap gap-2 justify-center">
      {["sunset", "pool", "terminal", "candy", "vapor", "brutalist"].map((
        s,
      ) => (
        <button
          type="button"
          key={s}
          onClick={() => style.value = s}
          class={`
            px-3 py-1 text-sm font-medium capitalize
            rounded-full border-2 transition-all duration-200
            ${
            style.value === s
              ? "bg-black text-white border-black scale-110"
              : "bg-white text-black border-gray-300 hover:border-black hover:scale-105"
          }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
