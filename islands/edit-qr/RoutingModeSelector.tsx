import { haptics } from "../../utils/haptics.ts";

interface RoutingModeSelectorProps {
  routingMode: string;
  setRoutingMode: (mode: string) => void;
}

export default function RoutingModeSelector(
  { routingMode, setRoutingMode }: RoutingModeSelectorProps,
) {
  return (
    <div class="space-y-2">
      <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
        Routing Mode
      </label>
      <div class="grid grid-cols-2 gap-2">
        {[
          { id: "simple", label: "Simple Redirect", icon: "🔗" },
          { id: "sequential", label: "Sequential", icon: "⛓️" },
          { id: "device", label: "Device Target", icon: "📱" },
          { id: "time", label: "Time Schedule", icon: "⏰" },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setRoutingMode(mode.id);
              haptics.light();
            }}
            class={`p-3 rounded-xl border-2 text-left transition-all ${
              routingMode === mode.id
                ? "bg-blue-50 border-blue-500 ring-2 ring-blue-200"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div class="text-xl mb-1">{mode.icon}</div>
            <div class="font-bold text-sm text-gray-900">{mode.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
