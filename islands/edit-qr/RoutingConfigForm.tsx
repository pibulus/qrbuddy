interface RoutingConfigFormProps {
  routingMode: string;
  destinationUrl: string;
  setDestinationUrl: (url: string) => void;
  sequentialUrls: string[];
  setSequentialUrls: (urls: string[]) => void;
  loopSequence: boolean;
  setLoopSequence: (loop: boolean) => void;
  randomSequence?: boolean;
  setRandomSequence?: (random: boolean) => void;
  dailySpins?: number | null;
  setDailySpins?: (spins: number | null) => void;
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

const INPUT_RECIPE =
  "w-full min-h-[44px] px-3.5 py-2.5 text-sm border-2 border-black/15 bg-white rounded-2xl text-black focus:border-qr-pop focus:outline-none transition-colors";

export default function RoutingConfigForm({
  routingMode,
  destinationUrl,
  setDestinationUrl,
  sequentialUrls,
  setSequentialUrls,
  loopSequence,
  setLoopSequence,
  randomSequence = false,
  setRandomSequence,
  dailySpins = null,
  setDailySpins,
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
          <label
            htmlFor="destination-url"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            Destination URL
          </label>
          <input
            id="destination-url"
            type="text"
            value={destinationUrl}
            onInput={(e) =>
              setDestinationUrl((e.target as HTMLInputElement).value)}
            class="w-full min-h-[48px] px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-base font-bold text-black focus:border-qr-pop focus:outline-none transition-colors"
            placeholder="https://example.com"
          />
        </div>
      )}

      {routingMode === "sequential" && (
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
            <span class="text-xs font-black text-black uppercase tracking-wider">
              URL Sequence / Roulette
            </span>
            <div class="inline-flex rounded-xl border-2 border-black bg-qr-cream p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setRandomSequence?.(false);
                  setLoopSequence(true);
                }}
                class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  !randomSequence && loopSequence
                    ? "bg-amber-200 text-black border border-black"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Loop 🔄
              </button>
              <button
                type="button"
                onClick={() => setRandomSequence?.(true)}
                class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  randomSequence
                    ? "bg-amber-200 text-black border border-black"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Roulette 🎲
              </button>
              <button
                type="button"
                onClick={() => {
                  setRandomSequence?.(false);
                  setLoopSequence(false);
                }}
                class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                  !randomSequence && !loopSequence
                    ? "bg-amber-200 text-black border border-black"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Once
              </button>
            </div>
          </div>

          {randomSequence && setDailySpins && (
            <div class="flex flex-wrap items-center justify-between gap-2 bg-qr-cream border-2 border-black/20 rounded-xl px-3 py-2">
              <span class="text-xs font-black text-black">
                Daily spins per phone
              </span>
              <div class="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDailySpins(null)}
                  class={`min-h-[34px] px-3 py-1 rounded-lg border-2 text-xs font-black whitespace-nowrap transition-all ${
                    dailySpins === null
                      ? "bg-amber-200 border-black text-black shadow-chunky"
                      : "bg-white border-black/15 text-neutral-700 hover:border-black"
                  }`}
                >
                  ∞ Open
                </button>
                <label
                  onClick={() => {
                    if (dailySpins === null) setDailySpins(1);
                  }}
                  class={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border-2 cursor-pointer transition-all ${
                    dailySpins !== null
                      ? "bg-amber-200 border-black text-black shadow-chunky"
                      : "bg-white border-black/15 text-neutral-700 hover:border-black"
                  }`}
                >
                  <input
                    type="number"
                    min={1}
                    max={99}
                    inputMode="numeric"
                    aria-label="Daily spins per phone"
                    value={dailySpins === null ? "" : String(dailySpins)}
                    placeholder="1"
                    onInput={(e) => {
                      const raw = (e.target as HTMLInputElement).value.trim();
                      if (!raw) {
                        setDailySpins(null);
                        return;
                      }
                      const n = Number.parseInt(raw, 10);
                      if (Number.isFinite(n)) {
                        setDailySpins(Math.min(99, Math.max(1, n)));
                      }
                    }}
                    class="w-9 bg-transparent text-xs font-black text-black placeholder:text-neutral-500 focus:outline-none text-center"
                  />
                  <span class="text-[11px] font-black whitespace-nowrap">
                    / day
                  </span>
                </label>
              </div>
            </div>
          )}

          {sequentialUrls.map((seqUrl, index) => (
            <div key={index} class="flex gap-2 items-center">
              <label
                htmlFor={`seq-url-${index}`}
                class="text-xs font-black text-neutral-600 w-5 shrink-0 text-right"
              >
                {index + 1}.
              </label>
              <input
                id={`seq-url-${index}`}
                type="url"
                value={seqUrl}
                onInput={(e) => {
                  const newUrls = [...sequentialUrls];
                  newUrls[index] = e.currentTarget.value;
                  setSequentialUrls(newUrls);
                }}
                placeholder={`URL #${index + 1}`}
                aria-label={`URL step ${index + 1}`}
                class={`flex-1 min-w-0 ${INPUT_RECIPE}`}
              />
              {sequentialUrls.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const newUrls = sequentialUrls.filter((_, i) =>
                      i !== index
                    );
                    setSequentialUrls(newUrls);
                  }}
                  class="min-w-[44px] min-h-[44px] rounded-full border-2 border-black/15 hover:border-black hover:bg-rose-100 text-black font-black text-sm transition-colors"
                  aria-label={`Remove step ${index + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setSequentialUrls([...sequentialUrls, ""])}
            class="w-full min-h-[44px] py-2 text-xs font-black text-black bg-qr-cream border-2 border-black rounded-full shadow-chunky hover:bg-amber-200 transition-colors"
          >
            + Add Step
          </button>
        </div>
      )}

      {routingMode === "device" && (
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
          <p class="text-xs font-semibold text-neutral-700">
            Route visitors based on their device. Leave blank to use fallback.
          </p>

          <div class="space-y-1">
            <label
              htmlFor="routing-ios-url"
              class="block text-xs font-black text-black"
            >
              iOS (iPhone/iPad)
            </label>
            <input
              id="routing-ios-url"
              type="url"
              value={iosUrl}
              onInput={(e) => setIosUrl(e.currentTarget.value)}
              placeholder="https://apps.apple.com/..."
              class={INPUT_RECIPE}
            />
          </div>

          <div class="space-y-1">
            <label
              htmlFor="routing-android-url"
              class="block text-xs font-black text-black"
            >
              Android
            </label>
            <input
              id="routing-android-url"
              type="url"
              value={androidUrl}
              onInput={(e) => setAndroidUrl(e.currentTarget.value)}
              placeholder="https://play.google.com/..."
              class={INPUT_RECIPE}
            />
          </div>

          <div class="space-y-1">
            <label
              htmlFor="routing-fallback-url"
              class="block text-xs font-black text-black"
            >
              Fallback (Desktop/Other)
            </label>
            <input
              id="routing-fallback-url"
              type="url"
              value={fallbackUrl}
              onInput={(e) => setFallbackUrl(e.currentTarget.value)}
              placeholder="https://example.com"
              class={INPUT_RECIPE}
            />
          </div>
        </div>
      )}

      {routingMode === "time" && (
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
          <p class="text-xs font-semibold text-neutral-700">
            Uses the scanner's time zone when available; otherwise uses the time
            zone from the device that last saved this QR. If the end is earlier
            than the start, the active window continues overnight. Choose
            00:00–24:00 for a full-day window.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="space-y-1">
              <label
                htmlFor="routing-start-hour"
                class="block text-xs font-black text-black"
              >
                Start Hour
              </label>
              <select
                id="routing-start-hour"
                value={startHour}
                onChange={(e) => setStartHour(e.currentTarget.value)}
                class={INPUT_RECIPE}
              >
                {Array.from(
                  { length: 24 },
                  (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ),
                )}
              </select>
            </div>
            <div class="space-y-1">
              <label
                htmlFor="routing-end-hour"
                class="block text-xs font-black text-black"
              >
                End Hour
              </label>
              <select
                id="routing-end-hour"
                value={endHour}
                onChange={(e) => setEndHour(e.currentTarget.value)}
                class={INPUT_RECIPE}
              >
                {Array.from(
                  { length: 25 },
                  (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i === 24
                        ? "24:00 (midnight)"
                        : `${i.toString().padStart(2, "0")}:00`}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label
              htmlFor="routing-active-url"
              class="block text-xs font-black text-black"
            >
              Active URL (During Hours)
            </label>
            <input
              id="routing-active-url"
              type="url"
              value={timeActiveUrl}
              onInput={(e) => setTimeActiveUrl(e.currentTarget.value)}
              placeholder="https://open-now.com"
              class={INPUT_RECIPE}
            />
          </div>

          <div class="space-y-1">
            <label
              htmlFor="routing-inactive-url"
              class="block text-xs font-black text-black"
            >
              Inactive URL (After Hours)
            </label>
            <input
              id="routing-inactive-url"
              type="url"
              value={timeInactiveUrl}
              onInput={(e) => setTimeInactiveUrl(e.currentTarget.value)}
              placeholder="https://closed-sorry.com"
              class={INPUT_RECIPE}
            />
          </div>
        </div>
      )}
    </>
  );
}
