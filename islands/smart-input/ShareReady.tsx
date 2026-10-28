import type { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import {
  buildRouletteShareUrl,
  parseRouletteParams,
} from "../../utils/roulette-lock.ts";
import { addToast } from "../ToastManager.tsx";

export type ShareKind = "slideshow" | "playlist" | "file" | "pack";

export interface LastShare {
  url: string;
  kind: ShareKind;
  count: number;
  title: string;
}

interface ShareReadyProps {
  share: LastShare;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  onUpdateUrl?: (nextUrl: string) => void;
  lang?: Locale;
}

const KIND_COPY: Record<
  ShareKind,
  { label: string; labelEs: string; glyph: string }
> = {
  slideshow: {
    label: "Slideshow is live",
    labelEs: "Galería lista",
    glyph: "🖼️",
  },
  playlist: {
    label: "Mixtape is live",
    labelEs: "Mixtape listo",
    glyph: "🎵",
  },
  pack: {
    label: "Pack is live",
    labelEs: "Paquete listo",
    glyph: "📦",
  },
  file: {
    label: "File is live",
    labelEs: "Archivo listo",
    glyph: "📄",
  },
};

const PILL =
  "min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[#1e1714] px-4 text-sm font-black shadow-chunky transition-all hover:scale-105 active:scale-95";

/** The "it's alive" strip under the input once a share has uploaded: open
 * it, copy it, or stamp a SCAN ME sticker — the three things people do next. */
export default function ShareReady(
  { share, frameConfig: _frameConfig, onUpdateUrl, lang }: ShareReadyProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const copy = KIND_COPY[share.kind];
  const initialRoulette = parseRouletteParams(
    share.url.includes("?") ? share.url.slice(share.url.indexOf("?")) : "",
  );
  const [rouletteEnabled, setRouletteEnabled] = useState(
    initialRoulette.roulette,
  );
  const [rouletteSpins, setRouletteSpins] = useState<number | null>(
    initialRoulette.dailySpins,
  );

  const applyRoulette = (enabled: boolean, spins: number | null) => {
    setRouletteEnabled(enabled);
    setRouletteSpins(spins);
    const nextUrl = buildRouletteShareUrl(share.url, enabled, spins);
    onUpdateUrl?.(nextUrl);
    haptics.light();
  };

  const canRoulette = share.count > 1 &&
    (share.kind === "slideshow" || share.kind === "playlist");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      addToast(isSpanish ? "Link copiado 📋" : "Link copied 📋");
      haptics.copy();
    } catch {
      addToast(
        isSpanish
          ? "No se pudo copiar al portapapeles"
          : "Couldn't reach the clipboard",
        3000,
      );
    }
  };

  const handleSticker = () => {
    // A sticker is the QR in a chunky SCAN ME frame — export with a framed
    // override so the download gets the sticker frame without overwriting
    // the user's saved presentation preferences.
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", {
        detail: {
          format: "png",
          frameOverride: {
            enabled: true,
            caption: isSpanish ? "ESCANÉAME" : "SCAN ME",
          },
          isSticker: true,
        },
      }),
    );
    haptics.medium();
  };

  return (
    <div class="mt-4 bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 space-y-3 animate-slide-down shadow-[2px_2px_0_#1e1714]">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl border-2 border-[#1e1714] bg-amber-200 flex items-center justify-center text-lg shrink-0">
          {copy.glyph}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-black text-black leading-tight">
            {isSpanish ? copy.labelEs : copy.label}
          </p>
          <p class="text-xs text-neutral-600 truncate">
            {share.title}
          </p>
        </div>
      </div>
      {canRoulette && (
        <div class="flex flex-wrap items-center justify-between gap-2 bg-[#fbf1e4] border-2 border-[#1e1714]/20 rounded-xl px-3 py-2">
          <span class="text-xs font-black text-[#1e1714]">
            🎲 {isSpanish ? "Ruleta" : "Roulette draw"}
          </span>
          <div class="inline-flex items-center rounded-xl border-2 border-[#1e1714] bg-[#fffef7] p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => applyRoulette(false, null)}
              class={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-[11px] font-black transition-all ${
                !rouletteEnabled
                  ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              {isSpanish ? "No" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => applyRoulette(true, null)}
              class={`min-h-[28px] px-2.5 py-0.5 rounded-lg text-[11px] font-black transition-all ${
                rouletteEnabled && rouletteSpins === null
                  ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              {isSpanish ? "∞ Libre" : "∞ Open"}
            </button>
            <label
              onClick={() => {
                if (!rouletteEnabled || rouletteSpins === null) {
                  applyRoulette(true, 1);
                }
              }}
              class={`min-h-[28px] inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                rouletteEnabled && rouletteSpins !== null
                  ? "bg-amber-200 text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              <input
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                aria-label={isSpanish ? "Giros por día" : "Spins per day"}
                value={rouletteEnabled && rouletteSpins !== null
                  ? String(rouletteSpins)
                  : ""}
                placeholder="1"
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value.trim();
                  if (!raw) {
                    applyRoulette(true, null);
                    return;
                  }
                  const n = Number.parseInt(raw, 10);
                  if (Number.isFinite(n)) {
                    applyRoulette(true, Math.min(99, Math.max(1, n)));
                  }
                }}
                class="w-7 bg-transparent text-[11px] font-black text-[#1e1714] placeholder:text-[#6e6058] focus:outline-none text-center"
              />
              <span class="text-[10px] font-black">
                /{isSpanish ? "día" : "day"}
              </span>
            </label>
          </div>
        </div>
      )}

      <div class="grid grid-cols-3 gap-2">
        <a
          href={share.url}
          target="_blank"
          rel="noopener noreferrer"
          class={`${PILL} bg-[#1e1714] text-[#fffef7]`}
        >
          {isSpanish ? "Abrir ↗" : "Open ↗"}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          class={`${PILL} bg-[#fffef7] text-[#1e1714]`}
        >
          {isSpanish ? "Copiar" : "Copy"}
        </button>
        <button
          type="button"
          onClick={handleSticker}
          class={`${PILL} bg-qr-pop text-[#fffef7] hover:bg-qr-popDeep`}
        >
          {isSpanish ? "Sticker" : "Sticker"}
        </button>
      </div>
      <p class="text-[11px] font-bold text-[#6f6158] text-center pt-0.5">
        👑 {isSpanish
          ? "Guardado en este navegador (30 días) · Sincroniza en Historial"
          : "Saved in this browser (30 days) · Sync in History"}
      </p>
    </div>
  );
}
