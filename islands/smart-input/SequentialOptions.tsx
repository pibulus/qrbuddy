import { haptics } from "../../utils/haptics.ts";

interface SequentialOptionsProps {
  isSequential: boolean;
  setIsSequential: (isSequential: boolean) => void;
  sequentialUrls: string[];
}

export default function SequentialOptions({
  isSequential,
  setIsSequential,
  sequentialUrls,
}: SequentialOptionsProps) {
  return (
    <div class="space-y-3 animate-slide-down">
      {/* Toggle Sequential Mode */}
      <div class="flex items-center justify-between bg-white border-2 border-gray-200 rounded-xl p-3">
        <div class="flex items-center gap-2">
          <span class="text-xl">⛓️</span>
          <div>
            <h4 class="font-bold text-sm text-gray-800">Sequential Mode</h4>
            <p class="text-xs text-gray-500">Redirect to different URLs in order</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsSequential(!isSequential);
            haptics.light();
          }}
          class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSequential ? "bg-purple-500" : "bg-gray-200"
          }`}
        >
          <span
            class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSequential ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Multi-Link Active Badge */}
      {isSequential && (
        <div class="text-center animate-slide-down py-4">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-full shadow-sm">
            <span class="text-xl animate-pulse">⛓️</span>
            <span class="text-sm font-bold text-indigo-700 uppercase tracking-wide">
              Multi-Link Active
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-2 font-medium">
            {sequentialUrls.filter((u) => u).length} links in chain • Manage in Power-Ups
          </p>
        </div>
      )}
    </div>
  );
}
