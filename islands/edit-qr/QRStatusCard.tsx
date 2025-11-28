import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import { QRData } from "../../hooks/useQRData.ts";

interface QRStatusCardProps {
  qrData: QRData;
}

export default function QRStatusCard({ qrData }: QRStatusCardProps) {
  // Use APP_URL from window location or fallback to production URL
  const baseUrl = typeof globalThis !== "undefined" &&
      globalThis.location
    ? `${globalThis.location.protocol}//${globalThis.location.host}`
    : "https://qrbuddy.app";
  const redirectUrl = `${baseUrl}/r?code=${qrData.short_code}`;
  const scansRemaining = qrData.max_scans
    ? qrData.max_scans - qrData.scan_count
    : "∞";

  return (
    <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-4 border-purple-400 rounded-2xl p-6 space-y-3">
      <h2 class="text-2xl font-black text-purple-900">QR Status</h2>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-600 font-semibold">Short Code:</span>
          <p class="font-mono text-purple-800">{qrData.short_code}</p>
        </div>
        <div>
          <span class="text-gray-600 font-semibold">Scans:</span>
          <p class="font-mono text-purple-800">
            {qrData.scan_count} / {qrData.max_scans || "∞"}
          </p>
        </div>
        <div>
          <span class="text-gray-600 font-semibold">Remaining:</span>
          <p class="font-mono text-purple-800">{scansRemaining}</p>
        </div>
        <div>
          <span class="text-gray-600 font-semibold">Status:</span>
          <p
            class={`font-bold ${
              qrData.is_active ? "text-green-600" : "text-red-600"
            }`}
          >
            {qrData.is_active ? "Active ✓" : "Inactive ✗"}
          </p>
        </div>
      </div>

      {/* Redirect URL */}
      <div class="pt-3 border-t-2 border-purple-200">
        <span class="text-gray-600 font-semibold text-sm">Redirect URL:</span>
        <div class="flex gap-2 mt-1">
          <input
            type="text"
            value={redirectUrl}
            readOnly
            class="flex-1 px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(redirectUrl);
              haptics.success();
              addToast("Copied! ✨", 2000);
            }}
            class="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold text-sm hover:bg-purple-600"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
