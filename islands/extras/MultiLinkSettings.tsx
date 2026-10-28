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
  brandCardActive?: boolean;
  onToggleBrandCard?: () => void;
  lang?: Locale;
}

const DAILY_SPIN_PRESETS: Array<
  { value: number | null; label: string; labelEs: string }
> = [
  { value: null, label: "∞ Open", labelEs: "∞ Libre" },
  { value: 1, label: "1", labelEs: "1" },
  { value: 3, label: "3", labelEs: "3" },
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
  brandCardActive = false,
  onToggleBrandCard,
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
        <div class="bg-[#fbf1e4] border-2 border-[#1e1714]/20 rounded-xl p-2.5 space-y-2 animate-slide-down">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#1e1714]">
              {isSpanish
                ? "Giros por día (memoria local)"
                : "Daily spins per device"}
            </span>
            <span class="text-[10px] font-bold text-[#6e6058]">
              {dailySpins === null
                ? (isSpanish ? "Sin límite" : "No daily cap")
                : `${dailySpins} / ${isSpanish ? "día" : "day"}`}
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            {DAILY_SPIN_PRESETS.map((opt) => {
              const active = dailySpins === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    setDailySpins(opt.value);
                    haptics.light();
                  }}
                  class={`min-h-[36px] px-2.5 py-1 rounded-lg border-2 text-xs font-black whitespace-nowrap transition-all ${
                    active
                      ? "bg-amber-200 border-[#1e1714] text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                      : "bg-[#fffef7] border-[#1e1714]/20 text-[#4a3f39] hover:border-[#1e1714]"
                  }`}
                >
                  {isSpanish ? opt.labelEs : opt.label}
                </button>
              );
            })}

            <label
              class={`flex-1 min-h-[36px] flex items-center justify-between gap-1 px-2.5 py-1 rounded-lg border-2 transition-all ${
                dailySpins !== null
                  ? "bg-[#fffef7] border-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                  : "bg-[#fffef7] border-[#1e1714]/20"
              }`}
            >
              <input
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                aria-label={isSpanish
                  ? "Número de giros por día"
                  : "Custom daily spins"}
                value={dailySpins === null ? "" : String(dailySpins)}
                placeholder="1–99"
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
                class="w-12 bg-transparent text-xs font-black text-[#1e1714] focus:outline-none text-center"
              />
              <span class="text-[11px] font-black text-[#6e6058] whitespace-nowrap">
                / {isSpanish ? "día" : "day"}
              </span>
            </label>
          </div>

          <p class="text-[11px] font-semibold text-[#6e6058]">
            {isSpanish
              ? "Guarda el resultado del día en el teléfono para sorteos y promos."
              : "Locks each phone's daily roll in local memory for promo draws."}
          </p>

          {onToggleBrandCard && (
            <button
              type="button"
              onClick={() => {
                onToggleBrandCard();
                haptics.light();
              }}
              class={`w-full min-h-[36px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] text-xs font-black flex items-center justify-between gap-2 transition-all ${
                brandCardActive
                  ? "bg-amber-200 text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                  : "bg-[#fffef7] text-[#1e1714] hover:bg-amber-100 shadow-[2px_2px_0_#1e1714]"
              }`}
            >
              <span>
                {isSpanish
                  ? "🎨 Personalizar tarjeta de ruleta (marca, logo y color)"
                  : "🎨 Brand spin card (Title, logo, color & white-label)"}
              </span>
              <span>{brandCardActive ? "✓" : "→"}</span>
            </button>
          )}
        </div>
      )}

      <div class="space-y-2">
        {sequentialUrls.map((url, index) => (
          <div key={index} class="flex items-center gap-2">
            <span class="text-xs font-black text-[#6e6058] w-4 text-right shrink-0">
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
              class="flex-1 min-h-[42px] px-3 py-1.5 text-sm font-bold text-[#1e1714] bg-[#fffef7] border-2 border-[#1e1714]/20 rounded-xl focus:border-[#1e1714] focus:outline-none transition-colors"
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
                class="min-w-[38px] min-h-[38px] rounded-full border-2 border-[#1e1714]/20 bg-[#fbf1e4] hover:border-[#1e1714] hover:bg-amber-200 text-[#1e1714] font-black text-xs transition-all active:scale-95"
                aria-label={isSpanish
                  ? `Quitar link ${index + 1}`
                  : `Remove link ${index + 1}`}
              >
                ✕
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
          class="w-full min-h-[40px] py-2 text-xs font-black text-[#1e1714] bg-[#fbf1e4] border-2 border-[#1e1714] rounded-full shadow-[2px_2px_0_#1e1714] hover:bg-amber-200 active:scale-[0.99] transition-all"
        >
          {isSpanish ? "+ Agregar link" : "+ Add link"}
        </button>
      </div>
    </div>
  );
}
