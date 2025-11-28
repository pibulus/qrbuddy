import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { useQRData } from "../hooks/useQRData.ts";

// Sub-components
import AnalyticsDashboard from "./edit-qr/AnalyticsDashboard.tsx";
import QRStatusCard from "./edit-qr/QRStatusCard.tsx";
import RoutingModeSelector from "./edit-qr/RoutingModeSelector.tsx";
import RoutingConfigForm from "./edit-qr/RoutingConfigForm.tsx";

export default function EditQRForm() {
  const { loading, error, qrData, isSaving, saveQRData } = useQRData();

  // Edit form state
  const [destinationUrl, setDestinationUrl] = useState("");
  const [maxScans, setMaxScans] = useState<number | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);

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

  // Initialize form when data loads
  useEffect(() => {
    if (qrData) {
      setDestinationUrl(qrData.destination_url);
      setMaxScans(qrData.max_scans);
      setExpiryDate(
        qrData.expires_at
          ? new Date(qrData.expires_at).toISOString().slice(0, 16)
          : "",
      );
      setIsActive(qrData.is_active);
      setRoutingMode(qrData.routing_mode || "simple");

      // Handle routing config
      if (qrData.routing_config) {
        try {
          const config = typeof qrData.routing_config === "string"
            ? JSON.parse(qrData.routing_config)
            : qrData.routing_config;

          if (qrData.routing_mode === "sequential") {
            setSequentialUrls(config.urls || ["", ""]);
            setLoopSequence(config.loop || false);
          } else if (qrData.routing_mode === "device") {
            setIosUrl(config.ios || "");
            setAndroidUrl(config.android || "");
            setFallbackUrl(config.fallback || "");
          } else if (qrData.routing_mode === "time") {
            setStartHour(config.startHour || "09");
            setEndHour(config.endHour || "17");
            setTimeActiveUrl(config.activeUrl || "");
            setTimeInactiveUrl(config.inactiveUrl || "");
          }
        } catch (e) {
          console.error("Error parsing routing config:", e);
        }
      }
    }
  }, [qrData]);

  const handleSave = async () => {
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

    await saveQRData({
      destination_url: destinationUrl,
      max_scans: maxScans,
      expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: isActive,
      routing_mode: routingMode,
      routing_config: routingConfig,
    });
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

  return (
    <div class="space-y-6">
      {/* Analytics Dashboard (Lite) */}
      <AnalyticsDashboard analytics={qrData.analytics} />

      {/* QR Status Card */}
      <QRStatusCard qrData={qrData} />

      {/* Edit Form */}
      <div class="bg-white border-4 border-black rounded-2xl p-6 space-y-4">
        <h2 class="text-2xl font-black text-black">Edit QR Settings</h2>

        {/* Routing Mode Selector */}
        <RoutingModeSelector 
          routingMode={routingMode} 
          setRoutingMode={setRoutingMode} 
        />

        {/* Dynamic Routing Config UI */}
        <RoutingConfigForm
          routingMode={routingMode}
          destinationUrl={destinationUrl}
          setDestinationUrl={setDestinationUrl}
          sequentialUrls={sequentialUrls}
          setSequentialUrls={setSequentialUrls}
          loopSequence={loopSequence}
          setLoopSequence={setLoopSequence}
          iosUrl={iosUrl}
          setIosUrl={setIosUrl}
          androidUrl={androidUrl}
          setAndroidUrl={setAndroidUrl}
          fallbackUrl={fallbackUrl}
          setFallbackUrl={setFallbackUrl}
          startHour={startHour}
          setStartHour={setStartHour}
          endHour={endHour}
          setEndHour={setEndHour}
          timeActiveUrl={timeActiveUrl}
          setTimeActiveUrl={setTimeActiveUrl}
          timeInactiveUrl={timeInactiveUrl}
          setTimeInactiveUrl={setTimeInactiveUrl}
        />

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
