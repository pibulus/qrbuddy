import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";
import { useQRData } from "../hooks/useQRData.ts";
import { updateHistoryItem } from "../utils/history.ts";
import { normalizeUrl } from "../utils/url.ts";
import { addToast } from "./ToastManager.tsx";

// Sub-components
import AnalyticsDashboard from "./edit-qr/AnalyticsDashboard.tsx";
import QRStatusCard from "./edit-qr/QRStatusCard.tsx";
import RoutingModeSelector from "./edit-qr/RoutingModeSelector.tsx";
import RoutingConfigForm from "./edit-qr/RoutingConfigForm.tsx";

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function parseRoutingConfig(value: unknown): Record<string, unknown> | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

function stringField(config: Record<string, unknown>, key: string): string {
  return typeof config[key] === "string" ? config[key] as string : "";
}

function hourField(
  value: unknown,
  fallback: string,
  maximum: number,
): string {
  if (
    typeof value !== "string" &&
    !(typeof value === "number" && Number.isInteger(value))
  ) return fallback;
  const raw = String(value);
  if (!/^\d{1,2}$/.test(raw)) return fallback;
  const hour = Number(raw);
  return hour >= 0 && hour <= maximum
    ? String(hour).padStart(2, "0")
    : fallback;
}

export function syncDynamicQRHistory(
  shortCode: string,
  destinationUrl: string,
): boolean {
  const cleanDest = destinationUrl.trim();
  if (!shortCode || !cleanDest) return false;
  return updateHistoryItem(
    (item) =>
      item.metadata?.shortCode === shortCode ||
      item.content.includes(`code=${shortCode}`),
    (item) => ({
      ...item,
      metadata: {
        ...item.metadata,
        title: cleanDest,
        destinationUrl: cleanDest,
      },
    }),
  );
}

const INPUT_RECIPE =
  "w-full min-h-[44px] px-3.5 py-2.5 border-2 border-black/15 bg-white rounded-2xl text-sm text-black focus:border-qr-pop focus:outline-none transition-colors";

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
        qrData.expires_at ? toLocalDateTimeInput(qrData.expires_at) : "",
      );
      setIsActive(qrData.is_active);
      const mode = ["simple", "sequential", "device", "time"].includes(
          qrData.routing_mode,
        )
        ? qrData.routing_mode
        : "simple";
      setRoutingMode(mode);

      const splash = qrData.splash_config;
      setSplashEnabled(splash?.enabled ?? false);
      setSplashTitle(splash?.title || "Welcome!");
      setSplashButtonText(splash?.buttonText || "Continue");
      setSplashDescription(splash?.description ?? "");
      setSplashImageUrl(splash?.imageUrl ?? "");

      // Start from a valid empty form, then hydrate only fields that match the
      // stored schema so old malformed records cannot break the editor.
      setSequentialUrls(["", ""]);
      setLoopSequence(false);
      setIosUrl("");
      setAndroidUrl("");
      setFallbackUrl("");
      setStartHour("09");
      setEndHour("17");
      setTimeActiveUrl("");
      setTimeInactiveUrl("");

      const config = parseRoutingConfig(qrData.routing_config);
      if (config && mode === "sequential") {
        const urls = Array.isArray(config.urls)
          ? config.urls.filter((url): url is string => typeof url === "string")
          : [];
        setSequentialUrls(urls.length ? urls : ["", ""]);
        setLoopSequence(config.loop === true);
      } else if (config && mode === "device") {
        setIosUrl(stringField(config, "ios"));
        setAndroidUrl(stringField(config, "android"));
        setFallbackUrl(stringField(config, "fallback"));
      } else if (config && mode === "time") {
        setStartHour(hourField(config.startHour, "09", 23));
        setEndHour(hourField(config.endHour, "17", 24));
        setTimeActiveUrl(stringField(config, "activeUrl"));
        setTimeInactiveUrl(stringField(config, "inactiveUrl"));
      }
    }
  }, [qrData]);

  const handleSave = async () => {
    if (
      routingMode === "sequential" &&
      sequentialUrls.filter((url) => normalizeUrl(url).trim() !== "").length <
        2
    ) {
      addToast("Add at least two URLs to the sequence before saving", 3500);
      return;
    }

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

    const nextDestination = resolvedDest || destinationUrl;
    const saved = await saveQRData({
      destination_url: nextDestination,
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

    if (saved && qrData?.short_code && nextDestination) {
      syncDynamicQRHistory(qrData.short_code, nextDestination);
    }
  };

  if (loading) {
    return (
      <div
        class="bg-qr-cream border-4 border-black rounded-3xl p-8 text-center shadow-chunky"
        role="status"
      >
        <div class="animate-pulse">
          <div class="text-4xl mb-3">⏳</div>
          <p class="font-black text-black">Loading QR data...</p>
        </div>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div
        class="bg-qr-cream border-4 border-black rounded-3xl p-8 text-center shadow-chunky space-y-2"
        role="alert"
      >
        <div class="text-4xl mb-2">❌</div>
        <p class="text-black font-black text-lg">
          {error || "QR code not found"}
        </p>
        <p class="text-neutral-700 text-sm font-semibold">
          Invalid or expired owner token
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* QR Status Card + Sticker Re-download */}
      <QRStatusCard qrData={qrData} />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        analytics={qrData.analytics}
        totalVisits={qrData.scan_count}
      />

      {/* Edit Form */}
      <div class="bg-qr-cream border-4 border-black rounded-3xl p-4 sm:p-6 space-y-5 shadow-chunky">
        <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
          Edit QR Settings
        </h2>

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
        <div class="space-y-2" role="group" aria-labelledby="scan-limit-label">
          <span
            id="scan-limit-label"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            Scan Limit
          </span>
          <div class="flex gap-2 flex-wrap">
            {[1, 5, 10, 100, null].map((limit) => {
              const active = maxScans === limit;
              return (
                <button
                  type="button"
                  key={limit?.toString() || "unlimited"}
                  aria-pressed={active}
                  onClick={() => {
                    setMaxScans(limit);
                    haptics.light();
                  }}
                  class={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full border-2 font-black text-sm transition-all ${
                    active
                      ? "bg-amber-200 text-black border-black shadow-chunky"
                      : "bg-white text-neutral-700 border-black/15 hover:border-black/60"
                  }`}
                >
                  {limit === null ? "∞" : limit}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expiry Date */}
        <div class="space-y-2">
          <label
            htmlFor="qr-expiry-date"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            Expiry Date (Optional)
          </label>
          <input
            id="qr-expiry-date"
            type="datetime-local"
            value={expiryDate}
            onChange={(e) =>
              setExpiryDate((e.target as HTMLInputElement).value)}
            class={INPUT_RECIPE}
          />
        </div>

        {/* Intro (splash) page */}
        <div class="space-y-2">
          <label
            htmlFor="qr-splash-enabled"
            class="min-h-[44px] inline-flex items-center gap-3 cursor-pointer group"
          >
            <input
              id="qr-splash-enabled"
              type="checkbox"
              checked={splashEnabled}
              onChange={(e) => {
                setSplashEnabled((e.target as HTMLInputElement).checked);
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer accent-pink-500"
            />
            <span class="text-xs font-black text-black uppercase tracking-wider group-hover:text-qr-pop">
              ✨ Intro page
            </span>
          </label>
          <p class="text-xs font-semibold text-neutral-600">
            Show a short landing page before redirecting
          </p>
          {splashEnabled && (
            <div class="space-y-3 bg-white border-2 border-black rounded-2xl p-4 animate-slide-down">
              <div class="flex items-center justify-between border-b border-black/10 pb-2 gap-2">
                <span class="text-xs font-black uppercase text-qr-pop">
                  Cover Card
                </span>
                <div class="flex bg-amber-50 p-0.5 rounded-full border-2 border-black">
                  <button
                    type="button"
                    onClick={() => {
                      setSplashPreviewTab("edit");
                      haptics.light();
                    }}
                    class={`min-h-[36px] px-3 py-1 rounded-full text-xs font-black transition-all ${
                      splashPreviewTab === "edit"
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-amber-100"
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
                    class={`min-h-[36px] px-3 py-1 rounded-full text-xs font-black transition-all ${
                      splashPreviewTab === "preview"
                        ? "bg-black text-white"
                        : "text-neutral-700 hover:bg-amber-100"
                    }`}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>

              {splashPreviewTab === "edit"
                ? (
                  <div class="space-y-3">
                    <div class="space-y-1">
                      <label
                        htmlFor="qr-splash-title"
                        class="block text-xs font-black text-black"
                      >
                        Page Title
                      </label>
                      <input
                        id="qr-splash-title"
                        type="text"
                        maxLength={100}
                        value={splashTitle}
                        onInput={(e) =>
                          setSplashTitle((e.target as HTMLInputElement).value)}
                        placeholder="Page title (e.g. Welcome!)"
                        class={`${INPUT_RECIPE} font-bold`}
                      />
                    </div>
                    <div class="space-y-1">
                      <label
                        htmlFor="qr-splash-button-text"
                        class="block text-xs font-black text-black"
                      >
                        Button Text
                      </label>
                      <input
                        id="qr-splash-button-text"
                        type="text"
                        maxLength={50}
                        value={splashButtonText}
                        onInput={(e) =>
                          setSplashButtonText(
                            (e.target as HTMLInputElement).value,
                          )}
                        placeholder="Button text (e.g. Continue)"
                        class={`${INPUT_RECIPE} font-bold`}
                      />
                    </div>
                    <div class="space-y-1">
                      <label
                        htmlFor="qr-splash-description"
                        class="block text-xs font-black text-black"
                      >
                        Description (Optional)
                      </label>
                      <textarea
                        id="qr-splash-description"
                        maxLength={500}
                        value={splashDescription}
                        onInput={(e) =>
                          setSplashDescription(
                            (e.target as HTMLTextAreaElement).value,
                          )}
                        placeholder="Description (optional greeting or details)"
                        rows={2}
                        class={`${INPUT_RECIPE} resize-none`}
                      />
                    </div>
                    <div class="space-y-1">
                      <label
                        htmlFor="qr-splash-image-url"
                        class="block text-xs font-black text-black"
                      >
                        Header Image URL (Optional)
                      </label>
                      <input
                        id="qr-splash-image-url"
                        type="url"
                        value={splashImageUrl}
                        onInput={(e) =>
                          setSplashImageUrl(
                            (e.target as HTMLInputElement).value,
                          )}
                        placeholder="https://example.com/banner.jpg"
                        class={`${INPUT_RECIPE} font-mono text-xs`}
                      />
                    </div>
                  </div>
                )
                : (
                  <div class="py-2 animate-pop-in">
                    <div class="rounded-2xl border-2 border-black bg-qr-cream p-4 shadow-chunky text-center max-w-xs mx-auto space-y-2.5">
                      {splashImageUrl && (
                        <div class="rounded-xl border-2 border-black overflow-hidden bg-pink-50 max-h-36">
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
                      <h5 class="text-base font-black text-black leading-tight">
                        {splashTitle || "Welcome!"}
                      </h5>
                      {splashDescription && (
                        <p class="text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {splashDescription}
                        </p>
                      )}
                      <div class="pt-1">
                        <div class="w-full min-h-[38px] rounded-full border-2 border-black bg-black text-white font-black text-xs py-2 px-3 shadow-chunky flex items-center justify-center gap-1 cursor-default">
                          <span>{splashButtonText || "Continue"}</span>
                          <span>→</span>
                        </div>
                      </div>
                      <div class="pt-2 border-t border-black/10 flex items-center justify-center">
                        <div class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-black bg-pink-100 text-[9px] font-black text-black">
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
        <div class="space-y-1">
          <label
            htmlFor="qr-is-active"
            class="min-h-[44px] inline-flex items-center gap-3 cursor-pointer group"
          >
            <input
              id="qr-is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => {
                setIsActive((e.target as HTMLInputElement).checked);
                haptics.light();
              }}
              class="w-5 h-5 rounded border-2 border-black cursor-pointer accent-pink-500"
            />
            <span class="text-sm font-black text-black group-hover:text-qr-pop">
              QR is active
            </span>
          </label>
          <p class="text-xs font-semibold text-neutral-600">
            Uncheck to pause this QR (scans will show KABOOM page)
          </p>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          class="w-full min-h-[52px] px-6 py-3.5 bg-qr-pop hover:bg-qr-popDeep text-white font-black text-lg rounded-full border-3 border-black shadow-chunky hover:shadow-chunky-hover hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSaving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      {/* Privacy Note */}
      <div class="bg-white border-2 border-black rounded-2xl p-4 text-center shadow-chunky">
        <p class="text-xs sm:text-sm font-semibold text-neutral-800">
          🔒 <strong>Privacy First:</strong>{" "}
          Scans log coarse stats only (device type, country) for the dashboard
          above — no IPs, no user agents, deleted after 90 days.
        </p>
      </div>
    </div>
  );
}
