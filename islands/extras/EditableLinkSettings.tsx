import { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface EditableLinkSettingsProps {
  editUrl: Signal<string>;
  /** The URL currently in the main input — what the editable QR will wrap. */
  pendingUrl: string;
  isCreating: boolean;
  onCreate: () => void;
}

export default function EditableLinkSettings({
  editUrl,
  pendingUrl,
  isCreating,
  onCreate,
}: EditableLinkSettingsProps) {
  const hasLink = pendingUrl.trim() !== "";

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
              {hasLink
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed truncate">
                    Wraps <span class="font-mono">{pendingUrl}</span>
                  </p>
                )
                : (
                  <p class="text-xs text-gray-700 leading-relaxed">
                    Add a link first — type or paste it in the main input.
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
              class="flex-1 px-3 py-2 bg-white border-2 border-[#9370DB] rounded-lg text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(editUrl.value);
                haptics.success();
                const event = new CustomEvent("show-toast", {
                  detail: {
                    message: "Edit link copied! 📋",
                    type: "success",
                  },
                });
                globalThis.dispatchEvent(event);
              }}
              class="px-4 py-2 bg-[#9370DB] text-white rounded-lg font-semibold text-sm hover:bg-[#6B46A8] transition-colors"
            >
              Copy
            </button>
          </div>
          <p class="text-xs text-[#6B46A8]">
            Bookmark this link—you'll need it to edit your QR later.
          </p>
        </div>
      )}
    </div>
  );
}
