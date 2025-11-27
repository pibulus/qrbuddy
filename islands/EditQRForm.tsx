import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";
import { getSupabaseUrl } from "../utils/api.ts";

interface QRData {
  short_code: string;
  destination_url: string;
  created_at: string;
  expires_at: string | null;
  max_scans: number | null;
  scan_count: number;
  is_active: boolean;
  routing_mode: string;
  routing_config: {
    urls?: string[];
    loop?: boolean;
    ios?: string;
    android?: string;
    fallback?: string;
    startHour?: string;
    endHour?: string;
    activeUrl?: string;
    inactiveUrl?: string;
    timezoneOffset?: number;
  } | null;
  analytics?: {
    sparkline: number[];
    last_scan: string | null;
    devices: { ios: number; android: number; desktop: number; other: number };
  };
}

export default function EditQRForm() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [ownerToken, setOwnerToken] = useState<string>("");

  // Edit form state
  const [destinationUrl, setDestinationUrl] = useState("");
  const [maxScans, setMaxScans] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Routing Mode state
  const [routingMode, setRoutingMode] = useState<string>("simple");
  
  // Sequential state
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);

  // Device Routing state
  const [iosUrl, setIosUrl] = useState("");
  const [androidUrl, setAndroidUrl] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");

  // Time Routing state
  const [startHour, setStartHour] = useState("09");
  const [endHour, setEndHour] = useState("17");
  const [timeActiveUrl, setTimeActiveUrl] = useState("");
  const [timeInactiveUrl, setTimeInactiveUrl] = useState("");

  // Get token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No owner token provided");
      setLoading(false);
      return;
    }

    setOwnerToken(token);
    loadQRData(token);
  }, []);

  const loadQRData = async (token: string) => {
    try {
      setLoading(true);
      const supabaseUrl = getSupabaseUrl();

      if (!supabaseUrl) {
        throw new Error(
          "Supabase is not configured. Please set SUPABASE_URL environment variable.",
        );
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-dynamic-qr?token=${token}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load QR data");
      }

      const result = await response.json();
      const data = result.data;

      setQrData(data);
      setDestinationUrl(data.destination_url);
      setMaxScans(data.max_scans);
      setExpiryDate(
        data.expires_at
          ? new Date(data.expires_at).toISOString().slice(0, 16)
          : "",
      );
      setIsActive(data.is_active);
      setRoutingMode(data.routing_mode || "simple");

      // Handle routing config
      if (data.routing_config) {
        try {
          const config = typeof data.routing_config === "string"
            ? JSON.parse(data.routing_config)
            : data.routing_config;

          if (data.routing_mode === "sequential") {
            setSequentialUrls(config.urls || ["", ""]);
            setLoopSequence(config.loop || false);
          } else if (data.routing_mode === "device") {
            setIosUrl(config.ios || "");
            setAndroidUrl(config.android || "");
            setFallbackUrl(config.fallback || "");
          } else if (data.routing_mode === "time") {
            setStartHour(config.startHour || "09");
            setEndHour(config.endHour || "17");
            setTimeActiveUrl(config.activeUrl || "");
            setTimeInactiveUrl(config.inactiveUrl || "");
          }
        } catch (e) {
          console.error("Error parsing routing config:", e);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Load QR error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      haptics.medium();

      const supabaseUrl = getSupabaseUrl();

      if (!supabaseUrl) {
        throw new Error(
          "Supabase is not configured. Please set SUPABASE_URL environment variable.",
        );
      }

      let routingConfig = null;
      if (routingMode === "sequential") {
        routingConfig = { urls: sequentialUrls.filter((u) => u.trim() !== ""), loop: loopSequence };
      } else if (routingMode === "device") {
        routingConfig = { ios: iosUrl, android: androidUrl, fallback: fallbackUrl };
      } else if (routingMode === "time") {
        routingConfig = { 
          startHour, 
          endHour, 
          activeUrl: timeActiveUrl, 
          inactiveUrl: timeInactiveUrl,
          timezoneOffset: 0 // Default to UTC for now, or browser offset?
        };
      }

      const body = {
        owner_token: ownerToken,
        destination_url: destinationUrl,
        max_scans: maxScans,
        expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
        is_active: isActive,
        routing_mode: routingMode,
        routing_config: routingConfig,
      };

      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-dynamic-qr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update QR");
      }

      const result = await response.json();
      setQrData(result.data);

      // Success feedback
      haptics.success();
      addToast("✅ QR updated successfully!", 3000);

      setIsSaving(false);
    } catch (err) {
      console.error("Update QR error:", err);
      addToast(
        `❌ Failed to update: ${
          err instanceof Error ? err.message : String(err)
        }`,
        3500,
      );
      haptics.error();
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div class="bg-white border-4 border-black rounded-2xl p-8 text-center">
        <div class="animate-pulse">
          <div class="text-4xl mb-4">⏳</div>
          <p class="text-gray-600">Loading QR data...</p>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div class="bg-red-50 border-4 border-red-400 rounded-2xl p-8 text-center">
        <div class="text-4xl mb-4">❌</div>
        <p class="text-red-800 font-semibold mb-2">
          {error || "QR code not found"}
        </p>
        <p class="text-red-600 text-sm">
          Invalid or expired owner token
        </p>
      </div>
    );
  }

  const redirectUrl = `https://qrbuddy.app/r?code=${qrData.short_code}`;
  const scansRemaining = qrData.max_scans
    ? qrData.max_scans - qrData.scan_count
    : "∞";

  return (
    <div class="space-y-6">
      {/* Analytics Dashboard (Lite) */}
      {qrData.analytics && (
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
                {qrData.analytics.sparkline.map((count, i) => (
                  <div
                    key={i}
                    class="flex-1 bg-blue-500 rounded-t-sm min-h-[4px]"
                    style={{ height: `${Math.max(count * 10, 4)}px`, opacity: 0.5 + (i/14) }}
                  />
                ))}
              </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
              <p class="text-xs text-gray-500 font-bold uppercase">Last Scan</p>
              <p class="text-lg font-black text-gray-800 mt-1">
                {qrData.analytics.last_scan
                  ? new Date(qrData.analytics.last_scan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "Never"}
              </p>
              {qrData.analytics.last_scan && (
                <p class="text-xs text-gray-500">
                  {new Date(qrData.analytics.last_scan).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Device Stats */}
          <div class="flex gap-2 text-xs font-bold text-gray-600">
             <span class="bg-gray-100 px-2 py-1 rounded">📱 iOS: {qrData.analytics.devices.ios}</span>
             <span class="bg-gray-100 px-2 py-1 rounded">🤖 Android: {qrData.analytics.devices.android}</span>
             <span class="bg-gray-100 px-2 py-1 rounded">💻 Desktop: {qrData.analytics.devices.desktop}</span>
          </div>
        </div>
      )}

      {/* QR Status Card */}
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

      {/* Edit Form */}
      <div class="bg-white border-4 border-black rounded-2xl p-6 space-y-4">
        <h2 class="text-2xl font-black text-black">Edit QR Settings</h2>

        {/* Routing Mode Selector */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Routing Mode
          </label>
          <div class="grid grid-cols-2 gap-2">
            {[
              { id: "simple", label: "Simple Redirect", icon: "🔗" },
              { id: "sequential", label: "Sequential", icon: "⛓️" },
              { id: "device", label: "Device Target", icon: "📱" },
              { id: "time", label: "Time Schedule", icon: "⏰" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setRoutingMode(mode.id);
                  haptics.light();
                }}
                class={`p-3 rounded-xl border-2 text-left transition-all ${
                  routingMode === mode.id
                    ? "bg-blue-50 border-blue-500 ring-2 ring-blue-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div class="text-xl mb-1">{mode.icon}</div>
                <div class="font-bold text-sm text-gray-900">{mode.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Routing Config UI */}
        {routingMode === "simple" && (
          <div class="space-y-2 animate-slide-down">
            <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Destination URL
            </label>
            <input
              type="text"
              value={destinationUrl}
              onInput={(e) =>
                setDestinationUrl((e.target as HTMLInputElement).value)}
              class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-pink-500 focus:outline-none"
              placeholder="https://example.com"
            />
          </div>
        )}

        {routingMode === "sequential" && (
          <div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-3 animate-slide-down">
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-purple-700 uppercase tracking-wide">
                URL Sequence
              </label>
              <label class="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loopSequence}
                  onChange={(e) => setLoopSequence(e.currentTarget.checked)}
                  class="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                />
                Loop Sequence 🔄
              </label>
            </div>
            
            {sequentialUrls.map((seqUrl, index) => (
              <div key={index} class="flex gap-2 items-center">
                <span class="text-xs font-bold text-purple-400 w-4">{index + 1}.</span>
                <input
                  type="url"
                  value={seqUrl}
                  onInput={(e) => {
                    const newUrls = [...sequentialUrls];
                    newUrls[index] = e.currentTarget.value;
                    setSequentialUrls(newUrls);
                  }}
                  placeholder={`URL #${index + 1}`}
                  class="flex-1 px-3 py-2 text-sm border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                {sequentialUrls.length > 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newUrls = sequentialUrls.filter((_, i) => i !== index);
                      setSequentialUrls(newUrls);
                    }}
                    class="text-red-400 hover:text-red-600 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSequentialUrls([...sequentialUrls, ""])}
              class="w-full py-2 text-sm font-bold text-purple-600 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors"
            >
              + Add Step
            </button>
          </div>
        )}

        {routingMode === "device" && (
          <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3 animate-slide-down">
            <p class="text-xs text-blue-600 mb-2">
              Route users based on their device. Leave blank to use fallback.
            </p>
            
            <div class="space-y-1">
              <label class="text-xs font-bold text-blue-700">iOS (iPhone/iPad)</label>
              <input
                type="url"
                value={iosUrl}
                onInput={(e) => setIosUrl(e.currentTarget.value)}
                placeholder="https://apps.apple.com/..."
                class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-blue-700">Android</label>
              <input
                type="url"
                value={androidUrl}
                onInput={(e) => setAndroidUrl(e.currentTarget.value)}
                placeholder="https://play.google.com/..."
                class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-blue-700">Fallback (Desktop/Other)</label>
              <input
                type="url"
                value={fallbackUrl}
                onInput={(e) => setFallbackUrl(e.currentTarget.value)}
                placeholder="https://example.com"
                class="w-full px-3 py-2 text-sm border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {routingMode === "time" && (
          <div class="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 space-y-3 animate-slide-down">
            <p class="text-xs text-orange-600 mb-2">
              Route based on time of day (UTC).
            </p>
            
            <div class="flex gap-2 items-center">
              <div class="flex-1">
                <label class="text-xs font-bold text-orange-700">Start Hour</label>
                <select 
                  value={startHour}
                  onChange={(e) => setStartHour(e.currentTarget.value)}
                  class="w-full px-2 py-2 text-sm border-2 border-orange-200 rounded-lg"
                >
                  {Array.from({length: 24}, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <span class="text-orange-400 font-bold">to</span>
              <div class="flex-1">
                <label class="text-xs font-bold text-orange-700">End Hour</label>
                <select 
                  value={endHour}
                  onChange={(e) => setEndHour(e.currentTarget.value)}
                  class="w-full px-2 py-2 text-sm border-2 border-orange-200 rounded-lg"
                >
                  {Array.from({length: 24}, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, '0')}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-orange-700">Active URL (During Hours)</label>
              <input
                type="url"
                value={timeActiveUrl}
                onInput={(e) => setTimeActiveUrl(e.currentTarget.value)}
                placeholder="https://open-now.com"
                class="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-orange-700">Inactive URL (After Hours)</label>
              <input
                type="url"
                value={timeInactiveUrl}
                onInput={(e) => setTimeInactiveUrl(e.currentTarget.value)}
                placeholder="https://closed-sorry.com"
                class="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Scan Limit */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Scan Limit
          </label>
          <div class="flex gap-2 flex-wrap">
            {[1, 5, 10, 100, null].map((limit) => (
              <button
                type="button"
                key={limit?.toString() || "unlimited"}
                onClick={() => {
                  setMaxScans(limit);
                  haptics.light();
                }}
                class={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all
                  ${
                  maxScans === limit
                    ? "bg-pink-500 text-white border-pink-600 scale-105"
                    : "bg-white text-gray-700 border-gray-300 hover:border-pink-400"
                }`}
              >
                {limit === null ? "∞" : limit}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Date */}
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Expiry Date (Optional)
          </label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) =>
              setExpiryDate((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-pink-500 focus:outline-none"
          />
        </div>

        {/* Active Toggle */}
        <div class="space-y-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive((e.target as HTMLInputElement).checked);
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer"
            />
            <span class="text-sm font-semibold text-gray-700 group-hover:text-pink-600">
              QR is active
            </span>
          </label>
          <p class="text-xs text-gray-500 ml-8">
            Uncheck to deactivate this QR (scans will show KABOOM page)
          </p>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          class="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-lg rounded-xl border-2 border-black shadow-chunky hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSaving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      {/* Privacy Note */}
      <div class="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
        <p class="text-sm text-green-800">
          🔒 <strong>Privacy First:</strong>{" "}
          No tracking, no analytics. Just editable redirects.
        </p>
      </div>
    </div>
  );
}
