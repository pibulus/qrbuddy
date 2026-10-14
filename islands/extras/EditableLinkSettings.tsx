import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import { looksLikeUrl } from "../../utils/url.ts";
import { isPlusLibraryEnabled } from "../../utils/auth.ts";
import { fetchLibraryQuota, LibraryQuota } from "../../utils/library.ts";
import { getOrCreatePassport, QRBuddyPassport } from "../../utils/passport.ts";

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
  const [libraryEnabled] = useState(() => isPlusLibraryEnabled());
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [quota, setQuota] = useState<LibraryQuota | null>(null);

  useEffect(() => {
    if (!libraryEnabled) return;

    let mounted = true;
    const p = getOrCreatePassport();
    setPassport(p);

    fetchLibraryQuota().then((q) => {
      if (mounted) setQuota(q);
    }).catch(() => {});

    const onPassport = () => {
      if (!mounted) return;
      const updated = getOrCreatePassport();
      setPassport(updated);
      fetchLibraryQuota().then((q) => {
        if (mounted) setQuota(q);
      }).catch(() => {});
    };

    globalThis.addEventListener("qrb-passport-changed", onPassport);
    globalThis.addEventListener("qrb-passport-synced", onPassport);

    return () => {
      mounted = false;
      globalThis.removeEventListener("qrb-passport-changed", onPassport);
      globalThis.removeEventListener("qrb-passport-synced", onPassport);
    };
  }, [libraryEnabled]);

  const hasContent = pendingUrl.trim() !== "";
  const validSeqCount = isSequential && sequentialUrls
    ? sequentialUrls.filter((u) => looksLikeUrl(u)).length
    : 0;
  const hasSequentialRoutes = validSeqCount >= 2;
  // Editable QRs wrap links only — WiFi/vCard/text payloads stay static.
  const hasLink = isSequential
    ? hasSequentialRoutes
    : hasContent && looksLikeUrl(pendingUrl);

  const isOverQuota = libraryEnabled && quota && !quota.can_create;
  const canSubmit = hasLink && !isCreating && !isOverQuota;

  return (
    <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
      {!editUrl.value && (
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-2xl">✨</span>
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-sm text-[#9370DB]">
                Editable mode is on
              </h4>
              {isSequential
                ? (
                  hasSequentialRoutes
                    ? (
                      <p class="text-xs text-gray-700 leading-relaxed truncate">
                        Wraps{" "}
                        <span class="font-semibold">
                          {validSeqCount} rotating links
                        </span>
                      </p>
                    )
                    : (
                      <p class="text-xs text-gray-700 leading-relaxed">
                        Add {validSeqCount === 1 ? "one more" : "at least two"}
                        {" "}
                        valid links below to make this sequence rotate.
                      </p>
                    )
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

          {/* Library / Passport Status when enabled */}
          {libraryEnabled && (
            <div class="bg-amber-50 border-2 border-black rounded-xl p-3 flex items-center justify-between gap-2 animate-slide-down">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-xl shrink-0">
                  {passport?.avatarEmoji || "🦎"}
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-black text-neutral-900 truncate">
                    {passport?.name || "QRBuddy Passport"}
                  </p>
                  <p class="text-[11px] text-neutral-600">
                    {quota
                      ? (quota.can_create
                        ? `${quota.used_count} of ${quota.total_allowed} codes used`
                        : `Limit reached (${quota.used_count}/${quota.total_allowed}) · Upgrade to Plus for 100`)
                      : "Sovereign Passport active"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  globalThis.dispatchEvent(new CustomEvent("qrb-open-library"))}
                class="px-2.5 py-1 text-xs font-bold rounded-lg border border-black bg-white hover:bg-neutral-100 active:scale-95 transition-transform shrink-0"
              >
                View Library ↗
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              haptics.medium();
              onCreate();
            }}
            class="w-full min-h-[48px] rounded-xl border-3 border-black bg-[#9370DB] px-4 py-2 font-black text-white shadow-chunky hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isCreating
              ? "Creating..."
              : isOverQuota
              ? `Free limit reached (${quota?.used_count}/${quota?.total_allowed})`
              : "Create editable link"}
          </button>
        </div>
      )}
      {editUrl.value && (
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-2 animate-slide-down">
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
