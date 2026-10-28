import { haptics } from "../../utils/haptics.ts";

interface RoutingModeSelectorProps {
  routingMode: string;
  setRoutingMode: (mode: string) => void;
}

export default function RoutingModeSelector(
  { routingMode, setRoutingMode }: RoutingModeSelectorProps,
) {
  return (
    <div class="space-y-2" role="group" aria-labelledby="routing-mode-label">
      <span
        id="routing-mode-label"
        class="block text-xs font-black text-black uppercase tracking-wider"
      >
        Routing Mode
      </span>
      <div class="grid grid-cols-2 gap-2.5">
        {[
          { id: "simple", label: "Simple Redirect", icon: "🔗" },
          { id: "sequential", label: "Rotation / Roulette", icon: "🎲" },
          { id: "device", label: "Device Target", icon: "📱" },
          { id: "time", label: "Time Schedule", icon: "⏰" },
        ].map((mode) => {
          const active = routingMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setRoutingMode(mode.id);
                haptics.light();
              }}
              class={`min-h-[48px] p-3 rounded-2xl border-2 text-left transition-all ${
                active
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] border-[#1e1714] shadow-chunky"
                  : "bg-[#fffef7] border-[#1e1714]/15 hover:border-[#1e1714]/60"
              }`}
            >
              <div class="text-xl mb-1">{mode.icon}</div>
              <div class="font-black text-xs sm:text-sm text-black leading-tight">
                {mode.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
