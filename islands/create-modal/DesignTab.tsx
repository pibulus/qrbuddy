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

/** CreateModal's "Design" tab: color/gradient picker, logo upload, optional
 * caption frame, and PNG/SVG/text-art export. Pure props in, no local state
 * shared with the rest of the modal. */
export default function DesignTab(
  { url, qrStyle, logoUrl, frameConfig, onClose }: DesignTabProps,
) {
  const frameActive = frameConfig?.value?.enabled ?? false;

  return (
    <div class="space-y-6">
      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Colors
          </h3>
          <p class="text-sm text-gray-600">
            Pick a vibe right here — or build your own gradient.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          {Object.entries(STYLE_DISPLAY).map(([key, info]) => (
            <button
              key={key}
              type="button"
              aria-label={`${info.name} style`}
              title={info.name}
              onClick={() => {
                qrStyle.value = key;
                haptics.light();
              }}
              class={`w-11 h-11 rounded-xl border-3 transition-all hover:scale-110 active:scale-95 ${
                qrStyle.value === key
                  ? "border-black scale-110 shadow-chunky"
                  : "border-gray-300"
              }`}
              style={{
                background: `linear-gradient(45deg, ${info.colors.join(", ")})`,
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            globalThis.dispatchEvent(new CustomEvent("open-gradient-creator"));
            haptics.light();
          }}
          class="w-full min-h-[48px] rounded-xl border-3 border-dashed border-gray-400 bg-white px-4 py-2 font-bold text-gray-700 hover:border-black hover:text-black transition-all"
        >
          🎨 Build your own gradient
        </button>
      </section>

      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Logo
          </h3>
          <p class="text-sm text-gray-600">
            Add a center mark to the QR.
          </p>
        </div>
        <div class="bg-gradient-to-r from-[#FFF8F0] to-[#FFE5B4] border-3 border-[#FFE5B4] rounded-xl p-4 shadow-chunky">
          <LogoUploader logoUrl={logoUrl} />
        </div>
      </section>

      {frameConfig && (
        <section class="space-y-3">
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Frame
          </h3>
          <ChoiceRow
            icon="🖼️"
            title="Caption frame"
            description={`A chunky border with a label — "${
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
              class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg font-black uppercase tracking-wide focus:border-black focus:outline-none transition-colors animate-slide-down"
            />
          )}
        </section>
      )}

      <section class="space-y-3">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wide text-gray-500">
            Download
          </h3>
          <p class="text-sm text-gray-600">
            PNG for sharing, SVG for print shops and designers — infinitely
            scalable, no frame.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              globalThis.dispatchEvent(
                new CustomEvent("qr-export", { detail: { format: "png" } }),
              );
              haptics.medium();
              addToast("PNG on the way! ⬇");
            }}
            class="min-h-[52px] rounded-xl border-3 border-black bg-black px-4 py-3 font-black text-white shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            ⬇ PNG
          </button>
          <button
            type="button"
            onClick={() => {
              globalThis.dispatchEvent(
                new CustomEvent("qr-export", { detail: { format: "svg" } }),
              );
              haptics.medium();
              addToast("SVG on the way! ⬇");
            }}
            class="min-h-[52px] rounded-xl border-3 border-black bg-white px-4 py-3 font-black text-gray-900 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
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
          class="w-full min-h-[48px] rounded-xl border-3 border-dashed border-gray-400 bg-white px-4 py-2 font-bold text-gray-700 hover:border-black hover:text-black transition-all font-mono"
        >
          ▀▄█ Copy as text art
        </button>
      </section>
    </div>
  );
}
