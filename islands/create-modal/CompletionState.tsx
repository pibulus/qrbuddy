import type { Signal } from "@preact/signals";
import { QR_STYLES } from "../../utils/qr-styles.ts";
import QRCanvas from "../QRCanvas.tsx";

export type CompletionKind = "share-file" | "collect-files" | "text-card";

interface CompletionStateProps {
  completionKind: CompletionKind;
  bucketUrl: string;
  url: Signal<string>;
  qrStyle: Signal<string>;
  logoUrl: Signal<string>;
  completionDownload: Signal<boolean>;
  onCopy: () => void;
  onShare: () => void;
  onEditDesign: () => void;
}

/** CreateModal's "ready to share" screen — shown once a locker/file-page/
 * text-card link exists. Renders the finished QR plus copy/share/open/edit
 * actions. Pure props in, callbacks out; no local state of its own. */
export default function CompletionState({
  completionKind,
  bucketUrl,
  url,
  qrStyle,
  logoUrl,
  completionDownload,
  onCopy,
  onShare,
  onEditDesign,
}: CompletionStateProps) {
  const isFilePage = completionKind === "share-file";
  const isTextCard = completionKind === "text-card";
  const title = isTextCard
    ? "Text card ready"
    : isFilePage
    ? "Download page ready"
    : "Locker ready to share";
  const description = isTextCard
    ? "Send this link or QR so people can read the note on QRBuddy."
    : isFilePage
    ? "Send this link or QR so someone can download the file."
    : "Send this link or QR so people can upload into the locker.";
  const statusLabel = isTextCard
    ? "Text card"
    : isFilePage
    ? "File page"
    : "File locker";
  const completionQrStyle = qrStyle as Signal<
    keyof typeof QR_STYLES | "custom"
  >;
  const canNativeShare = typeof navigator !== "undefined" &&
    Boolean(navigator.share);

  return (
    <div class="space-y-5 animate-slide-down">
      <section class="rounded-2xl border-3 border-black bg-qr-cream p-4 sm:p-5 shadow-chunky space-y-4">
        <div class="flex items-start gap-3">
          <span class="w-12 h-12 rounded-xl border-2 border-black bg-white flex items-center justify-center text-2xl shrink-0">
            {isTextCard ? "T" : isFilePage ? "📄" : "🪣"}
          </span>
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-pink-500 font-black">
              {statusLabel}
            </p>
            <h3 class="text-2xl font-black text-gray-900 leading-tight">
              {title}
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              {description}
            </p>
          </div>
        </div>

        <div class="mx-auto w-full max-w-[240px] sm:max-w-[280px]">
          <QRCanvas
            url={url}
            style={completionQrStyle}
            triggerDownload={completionDownload}
            logoUrl={logoUrl}
          />
        </div>

        <div class="rounded-xl border-2 border-black bg-white p-3">
          <p class="text-[11px] font-black uppercase tracking-wide text-gray-500 mb-1">
            Share link
          </p>
          <p class="text-sm font-bold text-gray-900 break-all">
            {bucketUrl}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCopy}
            class="min-h-[52px] rounded-xl border-3 border-black bg-white px-4 py-3 font-black text-gray-900 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            📋 Copy link
          </button>
          <button
            type="button"
            onClick={onShare}
            class="min-h-[52px] rounded-xl border-3 border-black bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 px-4 py-3 font-black text-black shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            {canNativeShare ? "📲 Share" : "📋 Copy share link"}
          </button>
          <a
            href={bucketUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="min-h-[52px] rounded-xl border-3 border-black bg-black px-4 py-3 font-black text-white shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center"
          >
            ↗ Open page
          </a>
          <button
            type="button"
            onClick={onEditDesign}
            class="min-h-[52px] rounded-xl border-3 border-black bg-white px-4 py-3 font-black text-gray-900 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            🎨 Edit design
          </button>
        </div>
      </section>
    </div>
  );
}
