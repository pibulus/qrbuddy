import { QRData } from "../../hooks/useQRData.ts";

interface AnalyticsDashboardProps {
  analytics: QRData["analytics"];
}

export default function AnalyticsDashboard(
  { analytics }: AnalyticsDashboardProps,
) {
  if (!analytics) return null;

  return (
    <div class="bg-white border-4 border-black rounded-2xl p-6 space-y-4 shadow-chunky">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-black text-black">Analytics</h2>
        <span class="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded-full">
          Last 7 Days
        </span>
      </div>

      {/* Sparkline & Last Seen */}
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <p class="text-xs text-gray-500 font-bold uppercase">Activity</p>
          <div class="h-12 flex items-end gap-1 mt-2">
            {analytics.sparkline.map((count, i) => (
              <div
                key={i}
                class="flex-1 bg-blue-500 rounded-t-sm min-h-[4px]"
                style={{
                  height: `${Math.max(count * 10, 4)}px`,
                  opacity: 0.5 + (i / 14),
                }}
              />
            ))}
          </div>
        </div>
        <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <p class="text-xs text-gray-500 font-bold uppercase">Last Scan</p>
          <p class="text-lg font-black text-gray-800 mt-1">
            {analytics.last_scan
              ? new Date(analytics.last_scan).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : "Never"}
          </p>
          {analytics.last_scan && (
            <p class="text-xs text-gray-500">
              {new Date(analytics.last_scan).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Device Stats */}
      <div class="flex gap-2 text-xs font-bold text-gray-600">
        <span class="bg-gray-100 px-2 py-1 rounded">
          📱 iOS: {analytics.devices.ios}
        </span>
        <span class="bg-gray-100 px-2 py-1 rounded">
          🤖 Android: {analytics.devices.android}
        </span>
        <span class="bg-gray-100 px-2 py-1 rounded">
          💻 Desktop: {analytics.devices.desktop}
        </span>
      </div>
    </div>
  );
}
