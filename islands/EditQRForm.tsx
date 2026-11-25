import { useEffect, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { haptics } from "../utils/haptics.ts";
import { useQRData } from "../hooks/useQRData.ts";
import {
  addDynamicToHistory,
  getSavedItemByShortCode,
  renameHistoryItem,
  updateHistoryItem,
} from "../utils/history.ts";
import { normalizeUrl } from "../utils/url.ts";
import { addToast } from "./ToastManager.tsx";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

// Sub-components
import AnalyticsDashboard from "../components/edit-qr/FieldReportCard.tsx";
import QRStatusCard from "../components/edit-qr/QRStatusCard.tsx";
import RoutingModeSelector from "../components/edit-qr/RoutingModeSelector.tsx";
import RoutingConfigForm from "../components/edit-qr/RoutingConfigForm.tsx";
import SplashSettings, {
  type SplashConfig,
} from "../components/extras/SplashSettings.tsx";

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
  customLabel?: string,
  storageOverride?: Storage,
): boolean {
  const cleanDest = destinationUrl.trim();
  if (!shortCode || !cleanDest) return false;
  return updateHistoryItem(
    (item) =>
      item.metadata?.shortCode === shortCode ||
      item.content.includes(`code=${shortCode}`),
    (item) => {
      const preservedLabel = customLabel !== undefined
        ? customLabel.trim().slice(0, 80)
        : (typeof item.metadata?.label === "string"
          ? item.metadata.label.trim()
          : "");
      return {
        ...item,
        metadata: {
          ...item.metadata,
          title: preservedLabel || cleanDest,
          ...(preservedLabel ? { label: preservedLabel } : {}),
          url: cleanDest,
          destinationUrl: cleanDest,
        },
      };
    },
    storageOverride,
  );
}

const INPUT_RECIPE =
  "w-full min-h-[44px] px-3.5 py-2.5 border-2 border-black/15 bg-white rounded-2xl text-sm text-black focus:border-qr-pop focus:outline-none transition-colors";

export default function EditQRForm({ lang }: { lang?: Locale } = {}) {
  const isSpanish = getClientLocale(lang) === "es";
  const { loading, error, qrData, isSaving, saveQRData } = useQRData(lang);

  // Edit form state
  const [qrLabel, setQrLabel] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [maxScans, setMaxScans] = useState<number | null>(null);
  // Lock: a PIN turns the redirect into a page nobody passes without it.
  // Only sent when the person actually typed something.
  const [pin, setPin] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Routing Mode state
  const [routingMode, setRoutingMode] = useState<string>("simple");

  // Sequential state
  const [sequentialUrls, setSequentialUrls] = useState<string[]>(["", ""]);
  const [loopSequence, setLoopSequence] = useState(false);
  const [randomSequence, setRandomSequence] = useState(false);
  const [dailySpins, setDailySpins] = useState<number | null>(null);

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
  // The cover card editor is the same SplashSettings used in the create sheet.
  const splashConfig = useSignal<SplashConfig | null>(null);

  // Initialize form when data loads
  useEffect(() => {
    if (qrData) {
      const saved = getSavedItemByShortCode(qrData.short_code);
      const serverLabel = typeof qrData.title === "string" &&
          qrData.title.trim() &&
          qrData.title.trim() !== qrData.destination_url.trim()
        ? qrData.title.trim()
        : "";
      const initialLabel = (typeof saved?.metadata?.label === "string" &&
          saved.metadata.label.trim()
        ? saved.metadata.label.trim()
        : "") ||
        serverLabel ||
        (typeof saved?.metadata?.title === "string" &&
            saved.metadata.title.trim() &&
            saved.metadata.title.trim() !== qrData.destination_url.trim()
          ? saved.metadata.title.trim()
          : "");
      setQrLabel(initialLabel);
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
      splashConfig.value = splash
        ? {
          enabled: true,
          title: splash.title || "Welcome!",
          buttonText: splash.buttonText || "Continue",
          description: splash.description ?? "",
          imageUrl: splash.imageUrl ?? "",
          brandName: splash.brandName ?? "",
          accentColor: splash.accentColor || undefined,
          unbranded: Boolean(splash.unbranded),
        }
        : null;
      setSplashEnabled(splash?.enabled ?? false);

      // Start from a valid empty form, then hydrate only fields that match the
      // stored schema so old malformed records cannot break the editor.
      setSequentialUrls(["", ""]);
      setLoopSequence(false);
      setRandomSequence(false);
      setDailySpins(null);
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
        setRandomSequence(config.random === true);
        setDailySpins(
          typeof config.dailySpins === "number" &&
            Number.isInteger(config.dailySpins) &&
            config.dailySpins >= 1 &&
            config.dailySpins <= 99
            ? config.dailySpins
            : null,
        );
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
      addToast(
        isSpanish
          ? "Agrega al menos dos URLs a la secuencia antes de guardar"
          : "Add at least two URLs to the sequence before saving",
        3500,
      );
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
        ...(randomSequence ? { random: true } : {}),
        ...(randomSequence && dailySpins ? { dailySpins } : {}),
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
      title: qrLabel.trim() || null,
      destination_url: nextDestination,
      max_scans: maxScans,
      ...(pin.trim() ? { password: pin.trim() } : {}),
      expires_at: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: isActive,
      routing_mode: routingMode,
      routing_config: routingConfig,
      splash_config: splashEnabled
        ? (() => {
          const cfg = splashConfig.value;
          const description = cfg?.description?.trim() ?? "";
          const imageUrl = cfg?.imageUrl?.trim() ?? "";
          const brandName = cfg?.brandName?.trim() ?? "";
          const accent = cfg?.accentColor?.trim() ?? "";
          return {
            enabled: true,
            title: cfg?.title?.trim() || "Welcome!",
            buttonText: cfg?.buttonText?.trim() || "Continue",
            ...(description ? { description } : {}),
            ...(imageUrl ? { imageUrl: normalizeUrl(imageUrl) } : {}),
            ...(brandName ? { brandName } : {}),
            ...(/^#[0-9a-fA-F]{6}$/.test(accent)
              ? { accentColor: accent }
              : {}),
            ...(cfg?.unbranded ? { unbranded: true } : {}),
          };
        })()
        : null,
    });

    if (saved && qrData?.short_code && nextDestination) {
      const cleanLabel = qrLabel.trim();
      const updated = renameHistoryItem(qrData.short_code, cleanLabel);
      if (!updated && cleanLabel) {
        const origin = globalThis.location?.origin || "https://qrbuddy.app";
        addDynamicToHistory({
          url: nextDestination,
          redirectUrl: `${origin}/r?code=${qrData.short_code}`,
          shortCode: qrData.short_code,
          label: cleanLabel,
          ownerScope: "qr",
        });
      }
      syncDynamicQRHistory(qrData.short_code, nextDestination, cleanLabel);
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
          <p class="font-black text-black">
            {isSpanish ? "Cargando datos del QR..." : "Loading QR data..."}
          </p>
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
        <p class="text-black font-black text-lg">
          {error ||
            (isSpanish ? "Código QR no encontrado" : "QR code not found")}
        </p>
        <p class="text-[#4a3f39] text-sm font-semibold">
          {isSpanish
            ? "Token de propietario inválido o vencido"
            : "Invalid or expired owner token"}
        </p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {/* QR Status Card + Sticker Re-download */}
      <QRStatusCard qrData={qrData} lang={lang} />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        analytics={qrData.analytics}
        totalVisits={qrData.scan_count}
        shortCode={qrData.short_code}
        lang={lang}
      />

      {/* Edit Form */}
      <div class="bg-qr-cream border-4 border-black rounded-3xl p-4 sm:p-6 space-y-5 shadow-chunky">
        <h2 class="text-xl sm:text-2xl font-black text-black tracking-tight">
          {isSpanish ? "Ajustes del QR" : "Edit QR Settings"}
        </h2>

        {/* QR Name / Label */}
        <div class="space-y-2">
          <label
            htmlFor="qr-label"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            {isSpanish
              ? "Nombre del QR (opcional)"
              : "QR Name / Label (optional)"}
          </label>
          <input
            id="qr-label"
            type="text"
            maxLength={64}
            value={qrLabel}
            onInput={(e) => setQrLabel((e.target as HTMLInputElement).value)}
            placeholder={isSpanish
              ? "ej. Menú Comida, Mesa 04"
              : "e.g. Brunswick Lunch Menu, Table 04"}
            class={INPUT_RECIPE}
          />
        </div>

        {/* Routing Mode Selector */}
        <RoutingModeSelector
          routingMode={routingMode}
          setRoutingMode={setRoutingMode}
          lang={lang}
        />

        {/* Dynamic Routing Config UI */}
        <RoutingConfigForm
          lang={lang}
          routingMode={routingMode}
          destinationUrl={destinationUrl}
          setDestinationUrl={setDestinationUrl}
          sequentialUrls={sequentialUrls}
          setSequentialUrls={setSequentialUrls}
          loopSequence={loopSequence}
          setLoopSequence={setLoopSequence}
          randomSequence={randomSequence}
          setRandomSequence={setRandomSequence}
          dailySpins={dailySpins}
          setDailySpins={setDailySpins}
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
            {isSpanish ? "Límite de escaneos" : "Scan Limit"}
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
                      : "bg-white text-[#4a3f39] border-black/15 hover:border-black/60"
                  }`}
                >
                  {limit === null ? "∞" : limit}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lock */}
        <div class="space-y-2">
          <label
            htmlFor="qr-pin"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            {isSpanish
              ? "Bloquear con PIN (opcional)"
              : "Lock with a PIN (optional)"}
          </label>
          <input
            id="qr-pin"
            type="password"
            autocomplete="new-password"
            value={pin}
            onInput={(event) =>
              setPin((event.target as HTMLInputElement).value)}
            placeholder={isSpanish
              ? "PIN al escanear (opcional)"
              : "PIN required on scan (optional)"}
            class="w-full px-4 py-3 border-2 border-black/15 rounded-xl font-bold focus:outline-none focus:border-black bg-white"
          />
          <p class="text-[11px] text-[#6e6058] leading-snug">
            {isSpanish
              ? "Déjalo vacío para mantener el código abierto. Un código bloqueado no cuenta un escaneo hasta que alguien logre pasar."
              : "Leave blank to keep the code open. A locked code does not count a scan until someone gets through."}
          </p>
        </div>

        {/* Expiry Date */}
        <div class="space-y-2">
          <label
            htmlFor="qr-expiry-date"
            class="block text-xs font-black text-black uppercase tracking-wider"
          >
            {isSpanish
              ? "Fecha de vencimiento (opcional)"
              : "Expiry Date (Optional)"}
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
              class="w-5 h-5 rounded border-2 border-black cursor-pointer accent-[#1e1714]"
            />
            <span class="text-xs font-black text-black uppercase tracking-wider group-hover:text-qr-pop">
              {isSpanish ? "Página de intro" : "Intro page"}
            </span>
          </label>
          <p class="text-xs font-semibold text-[#574c44]">
            {isSpanish
              ? "Muestra una página breve antes de redirigir"
              : "Show a short landing page before redirecting"}
          </p>
          {splashEnabled && (
            <SplashSettings
              splashConfig={splashConfig}
              embedded
              lang={lang}
            />
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
              class="w-5 h-5 rounded border-2 border-black cursor-pointer accent-[#1e1714]"
            />
            <span class="text-sm font-black text-black group-hover:text-qr-pop">
              {isSpanish ? "QR activo" : "QR is active"}
            </span>
          </label>
          <p class="text-xs font-semibold text-[#574c44]">
            {isSpanish
              ? "Desmarca para pausar este QR (los escaneos mostrarán la página KABOOM)"
              : "Uncheck to pause this QR (scans will show KABOOM page)"}
          </p>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          class="w-full min-h-[52px] px-6 py-3.5 bg-qr-pop hover:bg-qr-popDeep text-white font-black text-lg rounded-full border-3 border-black shadow-chunky hover:shadow-chunky-hover hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSaving
            ? (isSpanish ? "Guardando..." : "Saving...")
            : (isSpanish ? "Guardar cambios" : "Save changes")}
        </button>
      </div>

      {/* Privacy Note */}
      <div class="bg-white border-2 border-black rounded-2xl p-4 text-center shadow-chunky">
        <p class="text-xs sm:text-sm font-semibold text-[#4a3f39]">
          🔒{" "}
          <strong>
            {isSpanish ? "Privacidad primero:" : "Privacy First:"}
          </strong>{" "}
          {isSpanish
            ? "Los escaneos registran solo estadísticas generales (tipo de dispositivo, país) para el panel de arriba: sin IPs, sin user agents, se borran a los 90 días."
            : "Scans log coarse stats only (device type, country) for the dashboard above — no IPs, no user agents, deleted after 90 days."}
        </p>
      </div>
    </div>
  );
}
