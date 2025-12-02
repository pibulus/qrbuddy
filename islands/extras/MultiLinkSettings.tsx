import { haptics } from "../../utils/haptics.ts";

interface MultiLinkSettingsProps {
  sequentialUrls: string[];
  setSequentialUrls: (urls: string[]) => void;
  loopSequence: boolean;
  setLoopSequence: (loop: boolean) => void;
}

export default function MultiLinkSettings({
  sequentialUrls,
  setSequentialUrls,
  loopSequence,
  setLoopSequence,
}: MultiLinkSettingsProps) {
  return (
    <div class="bg-white/60 rounded-xl p-3 mb-4 border-2 border-indigo-200 animate-slide-down">
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-bold text-sm text-indigo-900">
          Link Chain
        </h4>
        <button
          type="button"
          onClick={() => {
            setLoopSequence(!loopSequence);
            haptics.light();
          }}
          class={`text-xs font-bold px-2 py-1 rounded border-2 transition-colors ${
            loopSequence
              ? "bg-indigo-500 text-white border-indigo-600"
              : "bg-white text-gray-500 border-gray-300"
          }`}
        >
          {loopSequence ? "Looping 🔄" : "Loop: Off"}
        </button>
      </div>

      <div class="space-y-2">
        {sequentialUrls.map((url, index) => (
          <div key={index} class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-400 w-4">
              {index + 1}.
            </span>
            <input
              type="url"
              value={url}
              placeholder={`https://site-${index + 1}.com`}
              onInput={(e) => {
                const newUrls = [...sequentialUrls];
                newUrls[index] = (e.target as HTMLInputElement).value;
                setSequentialUrls(newUrls);
              }}
              class="flex-1 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
            />
            {sequentialUrls.length > 2 && (
              <button
                type="button"
                onClick={() => {
                  setSequentialUrls(
                    sequentialUrls.filter((_, i) => i !== index),
                  );
                  haptics.medium();
                }}
                class="text-red-400 hover:text-red-600 px-1"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setSequentialUrls([...sequentialUrls, ""]);
            haptics.light();
          }}
          class="w-full py-1.5 text-xs font-bold text-indigo-600 border-2 border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-400 transition-colors"
        >
          + Add Link
        </button>
      </div>
    </div>
  );
}
