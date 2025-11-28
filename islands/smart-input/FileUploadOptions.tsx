import { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";

interface FileUploadOptionsProps {
  maxDownloads: Signal<number>;
}

export default function FileUploadOptions({ maxDownloads }: FileUploadOptionsProps) {
  return (
    <div class="mt-4 bg-gradient-to-r from-orange-50 to-red-50 border-3 border-orange-300 rounded-xl p-4 space-y-3 animate-slide-down shadow-chunky">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-2xl">💣</span>
        <h4 class="text-sm font-bold text-gray-700">File Upload Options</h4>
      </div>
      <p class="text-xs text-gray-600">
        Choose how many times your file can be downloaded before
        self-destructing
      </p>
      <div class="space-y-2">
        <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Download Limit
        </label>
        <div class="flex gap-2 flex-wrap">
          {[1, 3, 5, 10, null].map((limit) => (
            <button
              type="button"
              key={limit?.toString() || "unlimited"}
              onClick={() => {
                maxDownloads.value = limit || UNLIMITED_SCANS;
                haptics.light();
              }}
              class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                ${
                maxDownloads.value === (limit || UNLIMITED_SCANS)
                  ? "bg-orange-500 text-white border-orange-600 scale-105"
                  : "bg-white text-gray-700 border-gray-300 hover:border-orange-400"
              }`}
            >
              {limit === null ? "∞" : limit}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
