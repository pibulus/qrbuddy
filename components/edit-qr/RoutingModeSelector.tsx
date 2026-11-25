import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface RoutingModeSelectorProps {
  routingMode: string;
  setRoutingMode: (mode: string) => void;
  lang?: Locale;
}

export default function RoutingModeSelector(
  { routingMode, setRoutingMode, lang }: RoutingModeSelectorProps,
) {
  const es = getClientLocale(lang) === "es";
  return (
    <div class="space-y-2" role="group" aria-labelledby="routing-mode-label">
      <span
        id="routing-mode-label"
        class="block text-xs font-black text-black uppercase tracking-wider"
      >
        {es ? "Modo de ruta" : "Routing Mode"}
      </span>
      <div class="grid grid-cols-2 gap-2.5">
        {[
          {
            id: "simple",
            label: es ? "Redirección simple" : "Simple Redirect",
            icon: "🔗",
          },
          {
            id: "sequential",
            label: es ? "Rotación / Ruleta" : "Rotation / Roulette",
            icon: "🎲",
          },
          {
            id: "device",
            label: es ? "Por dispositivo" : "Device Target",
            icon: "📱",
          },
          {
            id: "time",
            label: es ? "Por horario" : "Time Schedule",
            icon: "⏰",
          },
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
