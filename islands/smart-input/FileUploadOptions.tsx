import { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";

interface FileUploadOptionsProps {
  files: File[];
  maxDownloads: Signal<number>;
  isUploading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUploadOptions(
  { files, maxDownloads, isUploading, onConfirm, onCancel }:
    FileUploadOptionsProps,
) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const isLimited = maxDownloads.value !== UNLIMITED_SCANS;

  return (
    <div class="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-3 border-blue-300 rounded-xl p-4 space-y-3 animate-slide-down shadow-chunky">
      <div class="flex items-center gap-2">
        <span class="text-2xl">📄</span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-gray-800 truncate">
            {files.length === 1
              ? files[0].name
              : `${files.length} images (slideshow)`}
          </p>
          <p class="text-xs text-gray-500">{formatSize(totalSize)}</p>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Download limit
        </label>
        <div class="flex gap-2 flex-wrap">
          {[null, 1, 3, 5, 10].map((limit) => (
            <button
              type="button"
              key={limit?.toString() || "unlimited"}
              onClick={() => {
                maxDownloads.value = limit || UNLIMITED_SCANS;
                haptics.light();
              }}
              class={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
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
        <p class="text-xs text-gray-600">
          {isLimited
            ? `💣 Self-destructs after ${maxDownloads.value} ${
              maxDownloads.value === 1 ? "download" : "downloads"
            }.`
            : "No limit — the file stays shareable."}
        </p>
      </div>

      <div class="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isUploading}
          class="min-h-[48px] px-4 py-2 rounded-xl border-2 border-black bg-black text-white text-sm font-bold shadow-chunky hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Create QR"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isUploading}
          class="min-h-[48px] px-4 py-2 rounded-xl border-2 border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:border-gray-500 transition disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
