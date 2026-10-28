import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface MultiLinkSettingsProps {
  sequentialUrls: string[];
  setSequentialUrls: (urls: string[]) => void;
  loopSequence: boolean;
  setLoopSequence: (loop: boolean) => void;
  randomSequence?: boolean;
  setRandomSequence?: (random: boolean) => void;
  dailySpins?: number | null;
  setDailySpins?: (spins: number | null) => void;
  lang?: Locale;
}

const DAILY_SPIN_OPTIONS: Array<
  { value: number | null; label: string; labelEs: string }
> = [
  { value: null, label: "∞ Unlimited", labelEs: "∞ Sin límite" },
  { value: 1, label: "1 / day", labelEs: "1 / día" },
  { value: 3, label: "3 / day", labelEs: "3 / día" },
  { value: 5, label: "5 / day", labelEs: "5 / día" },
];

export default function MultiLinkSettings({
  sequentialUrls,
  setSequentialUrls,
  loopSequence,
  setLoopSequence,
  randomSequence = false,
  setRandomSequence,
  dailySpins = null,
  setDailySpins,
  lang,
}: MultiLinkSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  return (
    <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 mb-4 space-y-3 animate-slide-down">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="font-black text-xs uppercase tracking-wider text-[#1e1714]">
          {isSpanish ? "Modo de rotación" : "Rotation mode"}
        </h4>
        <div class="inline-flex rounded-xl border-2 border-[#1e1714] bg-[#fbf1e4] p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => {
              setRandomSequence?.(false);
              setLoopSequence(true);
              haptics.light();
            }}
            class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
              !randomSequence && loopSequence
                ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                : "text-[#4a3f39] hover:text-[#1e1714]"
            }`}
          >
            {isSpanish ? "Bucle 🔄" : "Loop 🔄"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRandomSequence?.(true);
              haptics.light();
            }}
            class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
              randomSequence
                ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                : "text-[#4a3f39] hover:text-[#1e1714]"
            }`}
          >
            {isSpanish ? "Ruleta 🎲" : "Roulette 🎲"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRandomSequence?.(false);
              setLoopSequence(false);
              haptics.light();
            }}
            class={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
              !randomSequence && !loopSequence
                ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                : "text-[#4a3f39] hover:text-[#1e1714]"
            }`}
          >
            {isSpanish ? "1 vez" : "Once"}
          </button>
        </div>
      </div>

      {randomSequence && setDailySpins && (
        <div class="bg-[#fbf1e4] border-2 border-[#1e1714]/20 rounded-xl p-2.5 space-y-1.5 animate-slide-down">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#1e1714]">
              {isSpanish
                ? "Giros por día (memoria local)"
                : "Daily spins per device"}
            </span>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            {DAILY_SPIN_OPTIONS.map((opt) => {
              const active = dailySpins === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    setDailySpins(opt.value);
                    haptics.light();
                  }}
                  class={`min-h-[34px] px-2 py-1 rounded-lg border-2 text-[11px] font-black transition-all ${
                    active
                      ? "bg-amber-200 border-[#1e1714] text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                      : "bg-[#fffef7] border-[#1e1714]/20 text-[#4a3f39] hover:border-[#1e1714]"
                  }`}
                >
                  {isSpanish ? opt.labelEs : opt.label}
                </button>
              );
            })}
          </div>
          <p class="text-[11px] font-semibold text-[#6e6058]">
            {isSpanish
              ? "Guarda el resultado del día en el teléfono para evitar giros repetidos en promos."
              : "Locks each phone's daily roll in local memory for promo draws."}
          </p>
        </div>
      )}

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
              class="flex-1 min-h-[44px] px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
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
                class="min-w-[44px] min-h-[44px] rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 px-1"
                aria-label={isSpanish
                  ? `Quitar link ${index + 1}`
                  : `Remove link ${index + 1}`}
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
          class="w-full min-h-[44px] py-2 text-xs font-bold text-indigo-600 border-2 border-black/15 rounded-full hover:border-black/60 transition-colors"
        >
          {isSpanish ? "+ Agregar link" : "+ Add Link"}
        </button>
      </div>
    </div>
  );
}
