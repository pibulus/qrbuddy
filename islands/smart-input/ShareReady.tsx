import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
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
}

const KIND_COPY: Record<ShareKind, { label: string; glyph: string }> = {
  slideshow: { label: "Slideshow is live", glyph: "🖼️" },
  playlist: { label: "Mixtape is live", glyph: "🎵" },
  pack: { label: "Pack is live", glyph: "📦" },
  file: { label: "File is live", glyph: "📄" },
};

const PILL =
  "min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-black px-4 text-sm font-black shadow-chunky transition-all hover:scale-105 active:scale-95";

/** The "it's alive" strip under the input once a share has uploaded: open
 * it, copy it, or stamp a SCAN ME sticker — the three things people do next. */
export default function ShareReady(
  { share, frameConfig: _frameConfig }: ShareReadyProps,
) {
  const copy = KIND_COPY[share.kind];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      addToast("Link copied 📋");
      haptics.copy();
    } catch {
      addToast("Couldn't reach the clipboard", 3000);
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
          frameOverride: { enabled: true, caption: "SCAN ME" },
          isSticker: true,
        },
      }),
    );
    haptics.medium();
  };

  return (
    <div class="mt-4 bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl border-2 border-black bg-amber-200 flex items-center justify-center text-lg shrink-0">
          {copy.glyph}
        </span>
        <div class="min-w-0 flex-1">
          <p class="font-black text-black leading-tight">{copy.label}</p>
          <p class="text-xs text-neutral-600 truncate">
            {share.title}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <a
          href={share.url}
          target="_blank"
          rel="noopener noreferrer"
          class={`${PILL} bg-black text-white`}
        >
          Open ↗
        </a>
        <button type="button" onClick={handleCopy} class={`${PILL} bg-white`}>
          Copy
        </button>
        <button
          type="button"
          onClick={handleSticker}
          class={`${PILL} bg-qr-pop text-white hover:bg-qr-popDeep`}
        >
          Sticker
        </button>
      </div>
      <div class="rounded-xl border border-black/10 bg-amber-50/70 p-2.5 text-xs font-medium text-neutral-700 flex items-start gap-2">
        <span class="text-sm shrink-0">👑</span>
        <div class="leading-snug">
          <p class="font-bold text-black">
            Managed in this browser · 30-day share
          </p>
          <p class="text-[11px] text-neutral-600 mt-0.5">
            Your owner key stays in this browser. Sync or export in History (☁️)
            to keep control across devices.
          </p>
        </div>
      </div>
    </div>
  );
}
