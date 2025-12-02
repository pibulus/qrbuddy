import { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface EditableLinkSettingsProps {
  editUrl: Signal<string>;
  isSequential: boolean;
  isTimeBombActive: boolean;
}

export default function EditableLinkSettings({
  editUrl,
  isSequential,
  isTimeBombActive,
}: EditableLinkSettingsProps) {
  return (
    <div class="bg-gradient-to-r from-[#FFE5F0] to-[#F5E6FF] border-3 border-[#FF69B4] rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
      {/* Default Guidance for Editable Link */}
      {!isSequential && !isTimeBombActive && !editUrl.value && (
        <div class="flex items-start gap-3">
          <span class="text-2xl">✨</span>
          <div>
            <h4 class="font-bold text-sm text-[#9370DB]">
              Editable Mode Ready
            </h4>
            <p class="text-xs text-gray-700 leading-relaxed">
              Close this menu and enter your destination URL. We'll
              create a magic link you can update anytime.
            </p>
          </div>
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
