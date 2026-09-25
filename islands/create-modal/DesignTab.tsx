import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import LogoUploader from "../LogoUploader.tsx";
import { STYLE_DISPLAY } from "../StyleSelector.tsx";
import ChoiceRow from "./ChoiceRow.tsx";

interface FrameConfig {
  enabled: boolean;
  caption: string;
}

interface DesignTabProps {
  url: Signal<string>;
  qrStyle: Signal<string>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<FrameConfig | null>;
  onClose: () => void;
}

const PILL =
  "min-h-[40px] inline-flex items-center gap-2 rounded-full border-2 px-3 text-sm font-black transition-all hover:scale-105 active:scale-95";

/** CreateModal's "Design" tab: palette pills, center logo, caption frame,
 * and export. Same card language as the other two tabs — no dashed boxes,
 * no tinted wrappers. */
export default function DesignTab(
  { url, qrStyle, logoUrl, frameConfig, onClose }: DesignTabProps,
) {
  const frameActive = frameConfig?.value?.enabled ?? false;
  const isCustom = qrStyle.value === "custom";

  const exportAs = (format: "png" | "svg") => {
    globalThis.dispatchEvent(
      new CustomEvent("qr-export", { detail: { format } }),
    );
    haptics.medium();
    addToast(`${format.toUpperCase()} on the way ⬇`);
  };

  return (
    <div class="space-y-5">
      {/* Palette — one wrapping row of pills, custom rides in the same row */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Palette
        </h3>
        <div class="flex flex-wrap gap-2">
          {Object.entries(STYLE_DISPLAY).map(([key, info]) => {
            const active = qrStyle.value === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  qrStyle.value = key;
                  haptics.light();
                }}
                class={`${PILL} ${
                  active
                    ? "border-black bg-amber-200 text-black shadow-chunky"
                    : "border-black/15 bg-white text-neutral-800 hover:border-black/60"
                }`}
              >
                <span
                  class="w-4 h-4 rounded-full border-2 border-black shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${
                      info.colors.join(", ")
                    })`,
                  }}
                />
                {info.name}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={isCustom}
            onClick={() => {
              onClose();
              globalThis.dispatchEvent(
                new CustomEvent("open-gradient-creator"),
              );
              haptics.light();
            }}
            class={`${PILL} ${
              isCustom
                ? "border-black bg-amber-200 text-black shadow-chunky"
                : "border-black/15 bg-white text-neutral-800 hover:border-black/60"
            }`}
          >
            🎨 Custom gradient…
          </button>
        </div>
      </section>

      {/* Logo + frame: two cards in the same language as the Content tab */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Extras
        </h3>
        <LogoUploader logoUrl={logoUrl} />
        {frameConfig && (
          <>
            <ChoiceRow
              icon="🔲"
              title="Print frame"
              description={`Chunky border with "${
                frameConfig.value?.caption || "SCAN ME"
              }" baked into the download.`}
              active={frameActive}
              onClick={() => {
                frameConfig.value = frameActive
                  ? null
                  : { enabled: true, caption: "SCAN ME" };
                haptics.light();
              }}
            />
            {frameActive && (
              <input
                type="text"
                value={frameConfig.value?.caption ?? ""}
                maxLength={24}
                onInput={(e) => {
                  frameConfig.value = {
                    enabled: true,
                    caption: (e.target as HTMLInputElement).value,
                  };
                }}
                placeholder="SCAN ME"
                aria-label="Frame caption"
                class="w-full px-4 py-3 border-2 border-black rounded-2xl bg-white text-lg font-black uppercase tracking-wide focus:border-qr-pop focus:outline-none transition-colors animate-slide-down"
              />
            )}
          </>
        )}
      </section>

      {/* Export */}
      <section class="space-y-2">
        <h3 class="text-xs font-black uppercase tracking-wide text-neutral-500">
          Download
        </h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportAs("png")}
            class="min-h-[48px] rounded-full border-2 border-black bg-black px-4 font-black text-white shadow-chunky hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⬇ PNG
          </button>
          <button
            type="button"
            onClick={() => exportAs("svg")}
            title="Infinitely scalable, no frame — for print shops and designers"
            class="min-h-[48px] rounded-full border-2 border-black bg-white px-4 font-black text-black shadow-chunky hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⬇ SVG
          </button>
        </div>
        <button
          type="button"
          onClick={async () => {
            const { qrToTextArt } = await import("../../utils/qr-ascii.ts");
            const art = qrToTextArt(url.value || "https://qrbuddy.app");
            if (!art) {
              addToast("Too much data for text art 😅");
              return;
            }
            try {
              await navigator.clipboard.writeText(art);
              haptics.success();
              addToast("Text-art QR copied — paste it anywhere 📋");
            } catch {
              addToast("Couldn't reach the clipboard 😞");
            }
          }}
          class="w-full min-h-[44px] rounded-full border-2 border-black/15 bg-white px-4 text-sm font-bold font-mono text-neutral-700 hover:border-black/60 hover:text-black transition-all"
        >
          ▀▄█ Copy as text art
        </button>
      </section>
    </div>
  );
}
