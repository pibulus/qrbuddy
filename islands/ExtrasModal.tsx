import { Signal } from "@preact/signals";
import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import LogoUploader from "./LogoUploader.tsx";

interface ExtrasModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDynamic: Signal<boolean>;
  isBucket: Signal<boolean>;
  editUrl: Signal<string>;
  bucketUrl: Signal<string>;
  logoUrl: Signal<string>;
  scanLimit: number | null;
  setScanLimit: (limit: number | null) => void;
  expiryDate: string;
  setExpiryDate: (date: string) => void;
}

export default function ExtrasModal({
  isOpen,
  onClose,
  isDynamic,
  isBucket,
  editUrl,
  bucketUrl,
  logoUrl,
  scanLimit,
  setScanLimit,
  expiryDate,
  setExpiryDate,
}: ExtrasModalProps) {
  const [showLogoUploader, setShowLogoUploader] = useState(false);

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-40 flex items-center justify-center px-4 py-4">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div class="relative z-10 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 animate-slide-up">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-pink-500 font-bold">
              Power-Ups
            </p>
            <p class="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              Make it dynamic
            </p>
            <p class="text-xs sm:text-sm text-gray-600">
              Editable links, file buckets, custom logos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            class="text-3xl font-black text-gray-400 hover:text-gray-900 hover:rotate-90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Close power ups modal"
          >
            ×
          </button>
        </div>

        <div class="space-y-4">
          {/* Mutual Exclusion Notice */}
          {(isDynamic.value || isBucket.value) && (
            <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 text-xs text-gray-700 leading-relaxed animate-slide-down">
              💡 <strong>Note:</strong>{" "}
              Editable link and file bucket are mutually exclusive—pick one per
              QR.
            </div>
          )}

          {/* Main Power-Up Cards */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                isDynamic.value = !isDynamic.value;
                if (isDynamic.value) isBucket.value = false;
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                isDynamic.value
                  ? "bg-gradient-to-br from-pink-200 to-purple-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              }`}
            >
              <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                🔗
              </div>
              <div class="font-black text-sm text-gray-900">Editable link</div>
              <div class="text-xs text-gray-600 leading-snug mt-1">
                Print once, update forever. Perfect for menus, events, or merch.
              </div>
              {isDynamic.value && (
                <div class="mt-2 flex items-center gap-1 text-xs font-bold text-pink-700">
                  <span>✓</span>
                  Active
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                isBucket.value = !isBucket.value;
                if (isBucket.value) isDynamic.value = false;
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                isBucket.value
                  ? "bg-gradient-to-br from-blue-200 to-cyan-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              }`}
            >
              <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                🪣
              </div>
              <div class="font-black text-sm text-gray-900">
                File drop zone
              </div>
              <div class="text-xs text-gray-600 leading-snug mt-1">
                Reusable QR for file transfers. Great for photo booths, offices,
                or shared folders.
              </div>
              {isBucket.value && (
                <div class="mt-2 flex items-center gap-1 text-xs font-bold text-blue-700">
                  <span>✓</span>
                  Active
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowLogoUploader(!showLogoUploader);
                haptics.light();
              }}
              class={`group p-4 rounded-2xl border-3 border-black transition-all duration-200 text-left ${
                showLogoUploader
                  ? "bg-gradient-to-br from-yellow-200 to-orange-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px]"
              }`}
            >
              <div class="text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">
                🎨
              </div>
              <div class="font-black text-sm text-gray-900">Custom logo</div>
              <div class="text-xs text-gray-600 leading-snug mt-1">
                Add your brand to the QR center.
              </div>
              {showLogoUploader && (
                <div class="mt-2 flex items-center gap-1 text-xs font-bold text-orange-700">
                  <span>✓</span>
                  Active
                </div>
              )}
            </button>
          </div>

          {showLogoUploader && (
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border-3 border-orange-300 rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
              <LogoUploader logoUrl={logoUrl} />
            </div>
          )}

          {isDynamic.value && (
            <div class="bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-300 rounded-xl p-4 space-y-3 shadow-chunky">
              <div class="space-y-2">
                <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Scan limit
                </label>
                <p class="text-xs text-gray-600">
                  How many scans before this link stops responding.
                </p>
                <div class="flex gap-2 flex-wrap">
                  {[1, 5, 10, 100, null].map((limit) => (
                    <button
                      type="button"
                      key={limit?.toString() || "unlimited"}
                      onClick={() => {
                        setScanLimit(limit);
                        haptics.light();
                      }}
                      class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                        scanLimit === limit
                          ? "bg-pink-500 text-white border-pink-600 scale-105"
                          : "bg-white text-gray-700 border-gray-300 hover:border-pink-400"
                      }`}
                    >
                      {limit === null ? "∞" : limit}
                    </button>
                  ))}
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Expiry date (optional)
                </label>
                <p class="text-xs text-gray-600">
                  Leave blank to keep this link alive.
                </p>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate((e.target as HTMLInputElement).value);
                    haptics.light();
                  }}
                  class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div class="bg-pink-100 border-2 border-pink-300 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                💡 <strong>Set to 1 for a self-destruct QR.</strong>{" "}
                Higher limits let you reuse and edit anytime. No tracking, ever.
              </div>
            </div>
          )}

          {editUrl.value && (
            <div class="bg-gradient-to-r from-green-50 to-teal-50 border-3 border-green-400 rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
              <div class="flex items-center gap-2">
                <span class="text-xl">✨</span>
                <p class="text-sm font-black text-green-900">
                  Editable QR created!
                </p>
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={editUrl.value}
                  readOnly
                  class="flex-1 px-3 py-2 bg-white border-2 border-green-300 rounded-lg text-xs font-mono"
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
                  class="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p class="text-xs text-green-700">
                Bookmark this link—you'll need it to edit your QR later.
              </p>
            </div>
          )}

          {bucketUrl.value && (
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 border-3 border-blue-400 rounded-xl p-4 space-y-2 shadow-chunky animate-slide-down">
              <div class="flex items-center gap-2">
                <span class="text-xl">🪣</span>
                <p class="text-sm font-black text-blue-900">
                  File bucket ready!
                </p>
              </div>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={bucketUrl.value}
                  readOnly
                  class="flex-1 px-3 py-2 bg-white border-2 border-blue-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(bucketUrl.value);
                    haptics.success();
                    const event = new CustomEvent("show-toast", {
                      detail: {
                        message: "Bucket URL copied! 📋",
                        type: "success",
                      },
                    });
                    globalThis.dispatchEvent(event);
                  }}
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p class="text-xs text-blue-700">
                Scan to upload/download files. Perfect for stickers or signs.
              </p>
            </div>
          )}
        </div>

        <div class="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            class="px-8 py-3 rounded-2xl border-3 border-black bg-gradient-to-br from-gray-900 to-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}
