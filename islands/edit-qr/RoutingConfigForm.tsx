interface RoutingConfigFormProps {
  routingMode: string;
  destinationUrl: string;
  setDestinationUrl: (url: string) => void;
  sequentialUrls: string[];
  setSequentialUrls: (urls: string[]) => void;
  loopSequence: boolean;
  setLoopSequence: (loop: boolean) => void;
  iosUrl: string;
  setIosUrl: (url: string) => void;
  androidUrl: string;
  setAndroidUrl: (url: string) => void;
  fallbackUrl: string;
  setFallbackUrl: (url: string) => void;
  startHour: string;
  setStartHour: (hour: string) => void;
  endHour: string;
  setEndHour: (hour: string) => void;
  timeActiveUrl: string;
  setTimeActiveUrl: (url: string) => void;
  timeInactiveUrl: string;
  setTimeInactiveUrl: (url: string) => void;
}

export default function RoutingConfigForm({
  routingMode,
  destinationUrl,
  setDestinationUrl,
  sequentialUrls,
  setSequentialUrls,
  loopSequence,
  setLoopSequence,
  iosUrl,
  setIosUrl,
  androidUrl,
  setAndroidUrl,
  fallbackUrl,
  setFallbackUrl,
  startHour,
  setStartHour,
  endHour,
  setEndHour,
  timeActiveUrl,
  setTimeActiveUrl,
  timeInactiveUrl,
  setTimeInactiveUrl,
}: RoutingConfigFormProps) {
  return (
    <>
      {/* Dynamic Routing Config UI */}
      {routingMode === "simple" && (
        <div class="space-y-2 animate-slide-down">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Destination URL
          </label>
          <input
            type="text"
            value={destinationUrl}
            onInput={(e) =>
              setDestinationUrl((e.target as HTMLInputElement).value)}
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-pink-500 focus:outline-none"
            placeholder="https://example.com"
          />
        </div>
      )}

      {routingMode === "sequential" && (
        <div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-3 animate-slide-down">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-purple-700 uppercase tracking-wide">
              URL Sequence
            </label>
            <label class="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
              <input
                type="checkbox"
                checked={loopSequence}
                onChange={(e) => setLoopSequence(e.currentTarget.checked)}
                class="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
              />
              Loop Sequence 🔄
            </label>
          </div>
          
          {sequentialUrls.map((seqUrl, index) => (
            <div key={index} class="flex gap-2 items-center">
              <span class="text-xs font-bold text-purple-400 w-4">{index + 1}.</span>
              <input
                type="url"
                value={seqUrl}
                onInput={(e) => {
                  const newUrls = [...sequentialUrls];
                  newUrls[index] = e.currentTarget.value;
                  setSequentialUrls(newUrls);
                }}
                placeholder={`URL #${index + 1}`}
                class="flex-1 px-3 py-2 text-sm border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
              />
              {sequentialUrls.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = sequentialUrls.filter((_, i) => i !== index);
                    setSequentialUrls(newUrls);
                  }}
                  class="text-red-400 hover:text-red-600 px-2"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setSequentialUrls([...sequentialUrls, ""])}
            class="w-full py-2 text-sm font-bold text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors"
          >
            + Add Step
          </button>
        </div>
      )}

      {routingMode === "device" && (
        <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3 animate-slide-down">
          <p class="text-xs text-blue-600 mb-2">
            Route users based on their device. Leave blank to use fallback.
          </p>
          
          <div class="space-y-1">
            <label class="text-xs font-bold text-blue-700">iOS (iPhone/iPad)</label>
            <input
              type="url"
              value={iosUrl}
              onInput={(e) => setIosUrl(e.currentTarget.value)}
              placeholder="https://apps.apple.com/..."
              class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-blue-700">Android</label>
            <input
              type="url"
              value={androidUrl}
              onInput={(e) => setAndroidUrl(e.currentTarget.value)}
              placeholder="https://play.google.com/..."
              class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-blue-700">Fallback (Desktop/Other)</label>
            <input
              type="url"
              value={fallbackUrl}
              onInput={(e) => setFallbackUrl(e.currentTarget.value)}
              placeholder="https://example.com"
              class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {routingMode === "time" && (
        <div class="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 space-y-3 animate-slide-down">
          <p class="text-xs text-orange-600 mb-2">
            Route based on time of day (UTC).
          </p>
          
          <div class="flex gap-2 items-center">
            <div class="flex-1">
              <label class="text-xs font-bold text-orange-700">Start Hour</label>
              <select 
                value={startHour}
                onChange={(e) => setStartHour(e.currentTarget.value)}
                class="w-full px-2 py-2 text-sm border-2 border-orange-200 rounded-lg"
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i.toString().padStart(2, '0')}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <span class="text-orange-400 font-bold">to</span>
            <div class="flex-1">
              <label class="text-xs font-bold text-orange-700">End Hour</label>
              <select 
                value={endHour}
                onChange={(e) => setEndHour(e.currentTarget.value)}
                class="w-full px-2 py-2 text-sm border-2 border-orange-200 rounded-lg"
              >
                {Array.from({length: 24}, (_, i) => (
                  <option key={i} value={i.toString().padStart(2, '0')}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-orange-700">Active URL (During Hours)</label>
            <input
              type="url"
              value={timeActiveUrl}
              onInput={(e) => setTimeActiveUrl(e.currentTarget.value)}
              placeholder="https://open-now.com"
              class="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-bold text-orange-700">Inactive URL (After Hours)</label>
            <input
              type="url"
              value={timeInactiveUrl}
              onInput={(e) => setTimeInactiveUrl(e.currentTarget.value)}
              placeholder="https://closed-sorry.com"
              class="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
