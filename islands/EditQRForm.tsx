import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { useQRData } from "../hooks/useQRData.ts";
import { normalizeUrl } from "../utils/url.ts";

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

  // Intro (splash) page state
  const [splashEnabled, setSplashEnabled] = useState(false);
  const [splashTitle, setSplashTitle] = useState("Welcome!");
  const [splashButtonText, setSplashButtonText] = useState("Continue");
  const [splashDescription, setSplashDescription] = useState("");
  const [splashImageUrl, setSplashImageUrl] = useState("");
  const [splashPreviewTab, setSplashPreviewTab] = useState<"edit" | "preview">(
    "edit",
  );

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

      const splash = qrData.splash_config;
      setSplashEnabled(splash?.enabled ?? false);
      setSplashTitle(splash?.title || "Welcome!");
      setSplashButtonText(splash?.buttonText || "Continue");
      setSplashDescription(splash?.description ?? "");
      setSplashImageUrl(splash?.imageUrl ?? "");

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
    let resolvedDest = destinationUrl.trim()
      ? normalizeUrl(destinationUrl)
      : "";
    let routingConfig = null;

    if (routingMode === "sequential") {
      const validUrls = sequentialUrls
        .map(normalizeUrl)
        .filter((u) => u.trim() !== "");
      if (!resolvedDest && validUrls.length > 0) {
        resolvedDest = validUrls[0];
      }
      routingConfig = {
        urls: validUrls,
        loop: loopSequence,
      };
    } else if (routingMode === "device") {
      const normIos = iosUrl.trim() ? normalizeUrl(iosUrl) : "";
      const normAndroid = androidUrl.trim() ? normalizeUrl(androidUrl) : "";
      const normFallback = fallbackUrl.trim() ? normalizeUrl(fallbackUrl) : "";
      if (!resolvedDest) {
        resolvedDest = normFallback || normIos || normAndroid;
      }
      routingConfig = {
        ios: normIos,
        android: normAndroid,
        fallback: normFallback,
      };
    } else if (routingMode === "time") {
      const normActive = timeActiveUrl.trim()
        ? normalizeUrl(timeActiveUrl)
        : "";
      const normInactive = timeInactiveUrl.trim()
        ? normalizeUrl(timeInactiveUrl)
        : "";
      if (!resolvedDest) {
        resolvedDest = normActive || normInactive;
      }
      routingConfig = {
        startHour,
        endHour,
        activeUrl: normActive,
        inactiveUrl: normInactive,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    await saveQRData({
      destination_url: resolvedDest || destinationUrl,
      max_scans: maxScans,
      expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: isActive,
      routing_mode: routingMode,
      routing_config: routingConfig,
      splash_config: splashEnabled
        ? {
          enabled: true,
          title: splashTitle.trim() || "Welcome!",
          buttonText: splashButtonText.trim() || "Continue",
          ...(splashDescription.trim()
            ? { description: splashDescription.trim() }
            : {}),
          ...(splashImageUrl.trim()
            ? { imageUrl: normalizeUrl(splashImageUrl.trim()) }
            : {}),
        }
        : null,
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

        {/* Intro (splash) page */}
        <div class="space-y-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={splashEnabled}
              onChange={(e) => {
                setSplashEnabled((e.target as HTMLInputElement).checked);
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer"
            />
            <span class="text-sm font-bold text-gray-700 uppercase tracking-wide group-hover:text-pink-600">
              ✨ Intro page
            </span>
          </label>
          <p class="text-xs text-gray-500 ml-8">
            Show a short landing page before redirecting
          </p>
          {splashEnabled && (
            <div class="ml-8 space-y-3 bg-white border-2 border-black rounded-2xl p-4 shadow-sm animate-slide-down">
              <div class="flex items-center justify-between border-b border-gray-100 pb-2">
                <span class="text-xs font-black uppercase text-pink-600">
                  Cover Card
                </span>
                <div class="flex bg-gray-100 p-0.5 rounded-lg border border-black">
                  <button
                    type="button"
                    onClick={() => {
                      setSplashPreviewTab("edit");
                      haptics.light();
                    }}
                    class={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                      splashPreviewTab === "edit"
                        ? "bg-white text-black shadow-xs"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSplashPreviewTab("preview");
                      haptics.light();
                    }}
                    class={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                      splashPreviewTab === "preview"
                        ? "bg-black text-white shadow-xs"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>

              {splashPreviewTab === "edit"
                ? (
                  <div class="space-y-2">
                    <input
                      type="text"
                      maxLength={100}
                      value={splashTitle}
                      onInput={(e) =>
                        setSplashTitle((e.target as HTMLInputElement).value)}
                      placeholder="Page title (e.g. Welcome!)"
                      class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold focus:border-pink-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={50}
                      value={splashButtonText}
                      onInput={(e) =>
                        setSplashButtonText(
                          (e.target as HTMLInputElement).value,
                        )}
                      placeholder="Button text (e.g. Continue)"
                      class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold focus:border-pink-500 focus:outline-none"
                    />
                    <textarea
                      maxLength={500}
                      value={splashDescription}
                      onInput={(e) =>
                        setSplashDescription(
                          (e.target as HTMLTextAreaElement).value,
                        )}
                      placeholder="Description (optional greeting or details)"
                      rows={2}
                      class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-pink-500 focus:outline-none resize-none"
                    />
                    <input
                      type="url"
                      value={splashImageUrl}
                      onInput={(e) =>
                        setSplashImageUrl((e.target as HTMLInputElement).value)}
                      placeholder="Header image URL (optional)"
                      class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-xs font-mono focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                )
                : (
                  <div class="py-2 animate-pop-in">
                    <div class="rounded-xl border-2 border-black bg-[#FAF8F5] p-4 shadow-[3px_3px_0px_0px_#000] text-center max-w-xs mx-auto space-y-2.5">
                      {splashImageUrl && (
                        <div class="rounded-lg border-2 border-black overflow-hidden bg-pink-50 max-h-36">
                          <img
                            src={splashImageUrl}
                            alt="Cover image"
                            class="w-full h-28 object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <h5 class="text-base font-black text-gray-900 leading-tight">
                        {splashTitle || "Welcome!"}
                      </h5>
                      {splashDescription && (
                        <p class="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {splashDescription}
                        </p>
                      )}
                      <div class="pt-1">
                        <div class="w-full min-h-[38px] rounded-lg border-2 border-black bg-black text-white font-black text-xs py-2 px-3 shadow-[2px_2px_0px_0px_#FF69B4] flex items-center justify-center gap-1 cursor-default">
                          <span>{splashButtonText || "Continue"}</span>
                          <span>→</span>
                        </div>
                      </div>
                      <div class="pt-2 border-t border-gray-200 flex items-center justify-center">
                        <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-black bg-pink-100 text-[9px] font-black text-gray-900">
                          <span>⚡</span>
                          <span>
                            Built with <strong>QRBuddy</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
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
          Scans log coarse stats only (device type, country) for the dashboard
          above — no IPs, no user agents, deleted after 90 days.
        </p>
      </div>
    </div>
  );
}
