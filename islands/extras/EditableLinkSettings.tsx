import { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import { looksLikeUrl } from "../../utils/url.ts";

interface EditableLinkSettingsProps {
  editUrl: Signal<string>;
  /** The URL currently in the main input — what the editable QR will wrap. */
  pendingUrl: string;
  isCreating: boolean;
  onCreate: () => void;
  isSequential?: boolean;
  sequentialUrls?: string[];
}

export default function EditableLinkSettings({
  editUrl,
  pendingUrl,
  isCreating,
  onCreate,
  isSequential,
  sequentialUrls,
}: EditableLinkSettingsProps) {
  const hasContent = pendingUrl.trim() !== "";
  const validSeqCount = isSequential && sequentialUrls
    ? sequentialUrls.filter((u) => looksLikeUrl(u)).length
    : 0;
  // Editable QRs wrap links only — WiFi/vCard/text payloads stay static.
  const hasLink = (hasContent && looksLikeUrl(pendingUrl)) || validSeqCount > 0;

  return (
    <div class="bg-gradient-to-r from-[#FFE5F0] to-[#F5E6FF] border-3 border-[#FF69B4] rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
      {!editUrl.value && (
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-2xl">✨</span>
            <div class="min-w-0">
              <h4 class="font-bold text-sm text-[#9370DB]">
                Editable mode is on
              </h4>
              {validSeqCount > 0
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed truncate">
                    Wraps{" "}
                    <span class="font-semibold">
                      {validSeqCount} rotating{" "}
                      {validSeqCount === 1 ? "link" : "links"}
                    </span>
                  </p>
                )
                : hasLink
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed truncate">
                    Wraps <span class="font-mono">{pendingUrl}</span>
                  </p>
                )
                : hasContent
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed">
                    Editable wraps a link — this content isn't one, so it stays
                    a static QR.
                  </p>
                )
                : (
                  <p class="text-xs text-gray-700 leading-relaxed">
                    Add a link first — type or paste it in the main input or
                    below.
                  </p>
                )}
            </div>
          </div>
          <button
            type="button"
            disabled={!hasLink || isCreating}
            onClick={() => {
              haptics.medium();
              onCreate();
            }}
            class="w-full min-h-[48px] rounded-xl border-3 border-black bg-[#9370DB] px-4 py-2 font-black text-white shadow-chunky hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isCreating ? "Creating..." : "Create editable link"}
          </button>
        </div>
      )}
      {editUrl.value && (
        <div class="bg-gradient-to-r from-[#F5E6FF] to-[#FFE5F0] border-3 border-[#9370DB] rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
          <div class="flex items-center gap-2">
            <span class="text-xl">✨</span>
            <p class="text-sm font-black text-[#6B46A8]">
              Editable QR created!
            </p>
          </div>
          <div class="flex gap-2">
            <input
              type="text"
              value={editUrl.value}
              readOnly
              class="flex-1 min-h-[44px] px-3 py-2 bg-white border-2 border-[#9370DB] rounded-lg text-xs font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(editUrl.value);
                  haptics.success();
                  addToast("Edit link copied! 📋");
                } catch {
                  haptics.error();
                  addToast("Couldn't reach the clipboard", 3000);
                }
              }}
              class="min-h-[44px] px-4 py-2 bg-[#9370DB] text-white rounded-lg font-semibold text-sm hover:bg-[#6B46A8] transition-colors"
            >
              Copy
            </button>
          </div>
          <a
            href={`mailto:?subject=${
              encodeURIComponent("Your QRBuddy edit link")
            }&body=${
              encodeURIComponent(
                `Keep this safe — it's the only way to edit your QR later.\n\n${editUrl.value}`,
              )
            }`}
            class="flex items-center justify-center w-full min-h-[44px] rounded-lg border-2 border-[#9370DB] bg-white px-4 py-2 font-bold text-sm text-[#6B46A8] hover:bg-[#F5E6FF] transition-colors"
            onClick={() => haptics.light()}
          >
            📧 Email me this link
          </a>
          <p class="text-xs text-[#6B46A8]">
            This link is your key — no account, no recovery. Save it somewhere
            real.
          </p>
        </div>
      )}
    </div>
  );
}
