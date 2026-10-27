import { useSignal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import QRCanvas from "./QRCanvas.tsx";
import SmartInput from "./SmartInput.tsx";
import StyleSelector from "./StyleSelector.tsx";
import EasterEggs from "./EasterEggs.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
import ToastManager from "./ToastManager.tsx";
import Analytics from "./Analytics.tsx";
import { AboutModal } from "./AboutModal.tsx";
import { PricingLink, PricingModal } from "./PricingModal.tsx";
import FooterDock from "./FooterDock.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";
import { formatVCard, formatWiFi } from "../types/qr-templates.ts";
import {
  buildGs1DigitalLink,
  computeGs1CheckDigit,
  validateAndNormalizeGtin,
} from "../utils/gs1-digital-link.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { getClientLocale } from "../utils/i18n.ts";

export interface ValueCard {
  icon: string;
  title: string;
  desc: string;
  tag?: string;
}

export interface ComparisonItem {
  feature: string;
  free: string;
  supporter: string;
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface NavPill {
  href: string;
  label: string;
  active?: boolean;
}

export type ToolPreset = "wifi" | "vcard" | "gs1" | "inspect";

export interface VerticalStudioProps {
  badge: string;
  title: string;
  titleHighlight?: string;
  tagline: string;
  subtagline: string;
  defaultStyle: keyof typeof QR_STYLES;
  defaultUrl?: string;
  defaultCaption?: string;
  toolPreset?: ToolPreset;
  navPills?: NavPill[];
  valueCards: ValueCard[];
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonItems: ComparisonItem[];
  comparisonColumns?: {
    feature?: string;
    col1?: string;
    col2?: string;
  };
  /** When true, places QRBuddy (supporter/col2) in the center highlighted column like 04-comparison-card. */
  qrbuddyFirst?: boolean;
  faqItems: FAQItem[];
  ctaLabel?: string;
  lang?: "en" | "es";
  homeUrl?: string;
  homeLabel?: string;
  featuresTitle?: string;
  faqTitle?: string;
}

const EXPLORE_LINKS = {
  en: [
    { href: "/for/inspect", label: "Safe QR Inspector 🛡️" },
    { href: "/for/menus", label: "Restaurant Menus 📜" },
    { href: "/for/wifi", label: "Wi-Fi Cards 📶" },
    { href: "/for/vcard", label: "Contact vCards 👤" },
    { href: "/for/gs1", label: "GS1 2027 Barcodes 📦" },
    { href: "/for/weddings", label: "Weddings & Photos 📸" },
    { href: "/for/music", label: "Music Mixtapes 📼" },
    { href: "/for/lockers", label: "File Drops 🔐" },
    { href: "/guide/printing", label: "Print Size Guide 📐" },
    { href: "/compare", label: "Compare vs. $35/mo Traps ⚖️" },
  ],
  es: [
    { href: "/es/escanear", label: "Inspector Seguro de QR 🛡️" },
    { href: "/es/menus", label: "Menús de Restaurante 📜" },
    { href: "/es/wifi", label: "Tarjetas Wi-Fi 📶" },
    { href: "/es/vcard", label: "Tarjetas vCard 👤" },
    { href: "/es/gs1", label: "Códigos GS1 2027 📦" },
    { href: "/es/bodas", label: "Bodas y Fotos 📸" },
    { href: "/es/musica", label: "Mixtapes de Música 📼" },
    { href: "/es/archivos", label: "Envío de Archivos 🔐" },
    { href: "/es/guia/impresion", label: "Guía de Impresión 📐" },
    { href: "/es/comparar", label: "Comparativa Honesta ⚖️" },
  ],
} as const;

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 text-sm font-bold text-[#1e1714] bg-[#fffef7] border-2 border-[#1e1714]/25 rounded-xl focus:outline-none focus:border-[#ec4899] transition-colors placeholder:text-[#878580] placeholder:font-medium";

const BENTO_CARD_TONES = [
  "bg-[#f8de7e]", // Butter gold
  "bg-[#f7d0e6]", // Candy pink
  "bg-[#9ef0c8]", // Mint green
  "bg-[#e2d4f8]", // Soft lavender
] as const;

function splitHeadline(
  title: string,
  explicitHighlight?: string,
): { lead: string; pill: string | null } {
  if (explicitHighlight) {
    return { lead: title, pill: explicitHighlight };
  }
  const sentenceBreak = title.indexOf(". ");
  if (sentenceBreak > 0 && sentenceBreak < title.length - 3) {
    return {
      lead: title.slice(0, sentenceBreak + 1),
      pill: title.slice(sentenceBreak + 2),
    };
  }
  return { lead: title, pill: null };
}

export default function VerticalStudio({
  badge,
  title,
  titleHighlight,
  tagline,
  subtagline,
  defaultStyle,
  defaultUrl = "",
  defaultCaption = "SCAN ME",
  toolPreset,
  navPills,
  valueCards,
  comparisonTitle,
  comparisonSubtitle,
  comparisonItems,
  comparisonColumns,
  qrbuddyFirst = false,
  faqItems,
  ctaLabel,
  lang,
  homeUrl = "/",
  homeLabel = "← Back to QRBuddy Studio",
  featuresTitle,
  faqTitle,
}: VerticalStudioProps) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const resolvedFeaturesTitle = featuresTitle ??
    (isSpanish
      ? "Diseñado para Imprenta, Hecho para Durar"
      : "Built for Print, Built to Last");
  const resolvedFaqTitle = faqTitle ??
    (isSpanish ? "Preguntas Frecuentes" : "Frequently Asked Questions");

  // Quick-builder states for specialized job-to-be-done routes
  const [wifiSsid, setWifiSsid] = useState(
    isSpanish ? "Cafe_Brunswick_5G" : "Brunswick_Cafe_Guest",
  );
  const [wifiPassword, setWifiPassword] = useState("croissant2026");
  const [wifiEncryption, setWifiEncryption] = useState<
    "WPA" | "WEP" | "nopass"
  >("WPA");
  const [wifiHidden, setWifiHidden] = useState(false);

  const [vcardFirst, setVcardFirst] = useState("Elena");
  const [vcardLast, setVcardLast] = useState("Vargas");
  const [vcardOrg, setVcardOrg] = useState("Studio Mirador");
  const [vcardTitle, setVcardTitle] = useState(
    isSpanish ? "Directora de Diseño" : "Creative Director",
  );
  const [vcardPhone, setVcardPhone] = useState("+61 400 123 456");
  const [vcardEmail, setVcardEmail] = useState("elena@studiomirador.co");
  const [vcardWeb, setVcardWeb] = useState("https://studiomirador.co");

  const [gs1Domain, setGs1Domain] = useState("https://solbotanicals.co");
  const [gs1Gtin, setGs1Gtin] = useState("09312345678907");
  const [gs1Lot, setGs1Lot] = useState("BATCH-04");
  const [gs1Expiry, setGs1Expiry] = useState("271231");
  const [gs1Serial, setGs1Serial] = useState("");

  // Street-Safe Airlock inline link unmasker state (toolPreset === "inspect")
  const [peekInput, setPeekInput] = useState("https://qrbuddy.app/why");
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekResult, setPeekResult] = useState<
    {
      url: string;
      finalUrl: string;
      domain: string;
      isRedirected: boolean;
      redirectChain?: string[];
      isHttps?: boolean;
      title: string;
      description: string;
    } | null
  >(null);

  const runInlinePeek = async (rawTarget?: string) => {
    const candidate = (rawTarget ?? peekInput).trim();
    if (!candidate) return;
    const normalized = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    setPeekLoading(true);
    try {
      const res = await fetch(
        `/api/peek?url=${encodeURIComponent(normalized)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          setPeekResult(data);
        }
      }
    } catch {
      // Best-effort inline preview
    } finally {
      setPeekLoading(false);
    }
  };

  const computeInitialPayload = (): string => {
    if (toolPreset === "wifi") {
      return formatWiFi({
        ssid: wifiSsid,
        password: wifiPassword,
        encryption: wifiEncryption,
        hidden: wifiHidden,
      });
    }
    if (toolPreset === "vcard") {
      return formatVCard({
        firstName: vcardFirst,
        lastName: vcardLast,
        organization: vcardOrg,
        jobTitle: vcardTitle,
        phone: vcardPhone,
        email: vcardEmail,
        website: vcardWeb,
        address: "",
      });
    }
    if (toolPreset === "gs1") {
      return buildGs1DigitalLink({
        domain: gs1Domain,
        gtin: gs1Gtin,
        lot: gs1Lot,
        expiry: gs1Expiry,
        serial: gs1Serial,
      });
    }
    return defaultUrl;
  };

  const url = useSignal(computeInitialPayload());
  const style = useSignal<keyof typeof QR_STYLES | "custom">(defaultStyle);
  const customStyle = useSignal<QRStyle | null>(null);
  const triggerDownload = useSignal(false);
  const isDestructible = useSignal(false);
  const isDynamic = useSignal(false);
  const editUrl = useSignal("");
  const logoUrl = useSignal("");
  const maxDownloads = useSignal(UNLIMITED_SCANS);
  const isBucket = useSignal(false);
  const bucketUrl = useSignal("");
  const isModalOpen = useSignal(false);
  const frameConfig = useSignal<{ enabled: boolean; caption: string } | null>({
    enabled: true,
    caption: defaultCaption,
  });

  useEffect(() => {
    if (!toolPreset && defaultUrl && !url.value) {
      url.value = defaultUrl;
    }
  }, [defaultUrl, toolPreset]);

  // Sync Wi-Fi quick-builder changes into the live QR signal
  useEffect(() => {
    if (toolPreset !== "wifi") return;
    url.value = formatWiFi({
      ssid: wifiSsid || "Guest_WiFi",
      password: wifiEncryption === "nopass" ? "" : wifiPassword,
      encryption: wifiEncryption,
      hidden: wifiHidden,
    });
  }, [toolPreset, wifiSsid, wifiPassword, wifiEncryption, wifiHidden]);

  // Sync vCard quick-builder changes into the live QR signal
  useEffect(() => {
    if (toolPreset !== "vcard") return;
    url.value = formatVCard({
      firstName: vcardFirst || "Alex",
      lastName: vcardLast,
      organization: vcardOrg,
      jobTitle: vcardTitle,
      phone: vcardPhone,
      email: vcardEmail,
      website: vcardWeb,
      address: "",
    });
  }, [
    toolPreset,
    vcardFirst,
    vcardLast,
    vcardOrg,
    vcardTitle,
    vcardPhone,
    vcardEmail,
    vcardWeb,
  ]);

  // Sync GS1 Digital Link builder changes into the live QR signal
  useEffect(() => {
    if (toolPreset !== "gs1") return;
    if (editUrl.value) {
      editUrl.value = "";
      isDynamic.value = false;
    }
    url.value = buildGs1DigitalLink({
      domain: gs1Domain,
      gtin: gs1Gtin,
      lot: gs1Lot,
      expiry: gs1Expiry,
      serial: gs1Serial,
    });
  }, [toolPreset, gs1Domain, gs1Gtin, gs1Lot, gs1Expiry, gs1Serial]);

  const gtinValidation = toolPreset === "gs1"
    ? validateAndNormalizeGtin(gs1Gtin)
    : null;

  return (
    <div class="min-h-screen flex flex-col items-center justify-start px-4 pb-12 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 relative selection:bg-pink-300 selection:text-[#1e1714]">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1e1714] focus:text-[#fffef7] focus:rounded"
      >
        {isSpanish ? "Saltar al contenido principal" : "Skip to main content"}
      </a>

      <ToastManager />
      <Analytics
        url={url}
        style={style}
        isDynamic={isDynamic}
        isDestructible={isDestructible}
        logoUrl={logoUrl}
      />

      <EasterEggs url={url} style={style} />

      <main id="main-content" class="w-full max-w-2xl space-y-8 sm:space-y-10">
        {/* Brand Navigation Bar + Style Selector (Poster Vibe) */}
        <div class="flex items-center justify-between gap-1.5 sm:gap-2">
          <a
            href={homeUrl}
            class="inline-flex items-center gap-2 px-3 min-h-[38px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-chunky hover:-translate-y-0.5 transition-transform shrink-0"
            title={homeLabel}
          >
            {/* 4-Tile Gradient QRBuddy Mark */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              class="shrink-0"
            >
              <rect
                x="2"
                y="2"
                width="8.5"
                height="8.5"
                rx="2.5"
                fill="#ff8a7a"
                stroke="#1e1714"
                stroke-width="2"
              />
              <rect
                x="4.8"
                y="4.8"
                width="2.9"
                height="2.9"
                rx="0.8"
                fill="#fffef7"
                stroke="#1e1714"
                stroke-width="1.3"
              />
              <rect
                x="13.5"
                y="2"
                width="8.5"
                height="8.5"
                rx="2.5"
                fill="#ff6b9d"
                stroke="#1e1714"
                stroke-width="2"
              />
              <rect
                x="16.3"
                y="4.8"
                width="2.9"
                height="2.9"
                rx="0.8"
                fill="#fffef7"
                stroke="#1e1714"
                stroke-width="1.3"
              />
              <rect
                x="2"
                y="13.5"
                width="8.5"
                height="8.5"
                rx="2.5"
                fill="#e066ff"
                stroke="#1e1714"
                stroke-width="2"
              />
              <rect
                x="4.8"
                y="16.3"
                width="2.9"
                height="2.9"
                rx="0.8"
                fill="#fffef7"
                stroke="#1e1714"
                stroke-width="1.3"
              />
              <rect
                x="13.5"
                y="13.5"
                width="8.5"
                height="8.5"
                rx="2.5"
                fill="#b86bff"
                stroke="#1e1714"
                stroke-width="2"
              />
            </svg>
            <span class="font-black tracking-tight text-sm">QRBuddy</span>
            <span class="text-[#57524b] font-bold hidden sm:inline">
              · {isSpanish ? "Estudio" : "Studio"}
            </span>
          </a>
          <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span class="inline-flex items-center gap-1 px-3 min-h-[36px] bg-[#9ef0c8] text-[#1e1714] border-2 border-[#1e1714] shadow-chunky rounded-full text-[11px] sm:text-xs font-black tracking-wide uppercase truncate">
              {badge}
            </span>
            <div
              class="shrink-0"
              aria-label={isSpanish ? "Selector de estilo" : "Style selector"}
            >
              <StyleSelector
                style={style}
                customStyle={customStyle}
                isHidden={isModalOpen}
                lang={locale}
              />
            </div>
          </div>
        </div>

        {/* Hero Header with Signature Sunset-to-Violet Pill Highlight */}
        {(() => {
          const { lead, pill } = splitHeadline(title, titleHighlight);
          return (
            <header class="text-center space-y-3 px-2 animate-fade-in">
              <h1 class="text-3xl sm:text-5xl font-black text-[#1e1714] tracking-tight leading-[1.12] text-balance">
                <span class="block">{lead}</span>
                {pill && (
                  <span class="mt-1.5 inline-block px-3.5 py-0.5 rounded-2xl border-3 border-[#1e1714] bg-gradient-to-r from-[#ff9a8b] via-[#ff6a95] to-[#b86bff] text-[#1e1714] shadow-chunky">
                    {pill}
                  </span>
                )}
              </h1>
              <p class="text-base sm:text-lg font-bold text-[#343331] max-w-xl mx-auto text-balance">
                {tagline}
              </p>
              <p class="text-xs sm:text-sm text-[#57524b] font-medium max-w-lg mx-auto">
                {subtagline}
              </p>

              {navPills && navPills.length > 0 && (
                <nav
                  aria-label={isSpanish
                    ? "Comparativas por plataforma"
                    : "Competitor comparisons"}
                  class="pt-2 flex flex-wrap items-center justify-center gap-1.5"
                >
                  {navPills.map((pillItem) => (
                    <a
                      key={pillItem.href}
                      href={pillItem.href}
                      aria-current={pillItem.active ? "page" : undefined}
                      class={`px-3 min-h-[36px] inline-flex items-center rounded-full border-2 border-[#1e1714] text-xs font-black transition-all ${
                        pillItem.active
                          ? "bg-[#f8de7e] text-[#1e1714] shadow-chunky"
                          : "bg-[#fffef7] text-[#343331] hover:bg-[#fbf1e4]"
                      }`}
                    >
                      {pillItem.label}
                    </a>
                  ))}
                </nav>
              )}
            </header>
          );
        })()}

        {/* Interactive QR Generator Canvas — same pyramid proportions as routes/index.tsx */}
        <div class="max-w-md mx-auto w-full space-y-6 sm:space-y-8">
          <div class="flex justify-center animate-slide-up">
            <div class="w-full max-w-[300px] sm:max-w-[340px] transition-all duration-300">
              <ErrorBoundary>
                <QRCanvas
                  url={url}
                  style={style}
                  customStyle={customStyle}
                  triggerDownload={triggerDownload}
                  isDestructible={isDestructible}
                  isDynamic={isDynamic}
                  logoUrl={logoUrl}
                  maxDownloads={maxDownloads}
                  frameConfig={frameConfig}
                  listenForExportEvents
                  lang={locale}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Specialized Job-to-be-Done Quick-Builders */}
          {toolPreset === "wifi" && (
            <div class="bg-[#fbf1e4] border-3 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-chunky space-y-3.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                  {isSpanish ? "📶 Constructor Wi-Fi" : "📶 Wi-Fi Card Builder"}
                </span>
                <span class="px-2 py-0.5 rounded-full bg-[#fffef7] border border-[#1e1714] text-[11px] font-bold text-[#343331] shrink-0 whitespace-nowrap">
                  {isSpanish
                    ? "100% local · Cero servidor"
                    : "100% local · Zero server"}
                </span>
              </div>

              <div class="grid sm:grid-cols-2 gap-2.5">
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Nombre de Red (SSID)" : "Network Name (SSID)"}
                  </span>
                  <input
                    type="text"
                    value={wifiSsid}
                    onInput={(e) =>
                      setWifiSsid((e.target as HTMLInputElement).value)}
                    placeholder={isSpanish ? "Mi_Cafeteria_WiFi" : "Cafe_Guest"}
                    class={INPUT_CLASS}
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Contraseña" : "Password"}
                  </span>
                  <input
                    type="text"
                    value={wifiEncryption === "nopass" ? "" : wifiPassword}
                    disabled={wifiEncryption === "nopass"}
                    onInput={(e) =>
                      setWifiPassword((e.target as HTMLInputElement).value)}
                    placeholder={wifiEncryption === "nopass"
                      ? (isSpanish ? "Red abierta (sin clave)" : "Open network")
                      : (isSpanish ? "Contraseña del Wi-Fi" : "Wi-Fi password")}
                    class={`${INPUT_CLASS} disabled:opacity-50`}
                  />
                </label>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div
                  role="group"
                  aria-label={isSpanish ? "Seguridad Wi-Fi" : "Wi-Fi security"}
                  class="inline-flex rounded-xl border-2 border-[#1e1714] bg-[#fffef7] p-0.5"
                >
                  {(
                    [
                      { id: "WPA", label: "WPA / WPA2" },
                      { id: "WEP", label: "WEP" },
                      {
                        id: "nopass",
                        label: isSpanish ? "Abierta" : "Open",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWifiEncryption(opt.id)}
                      class={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
                        wifiEncryption === opt.id
                          ? "bg-amber-200 text-[#1e1714]"
                          : "text-[#57524b] hover:text-[#1e1714]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label class="inline-flex items-center gap-2 text-xs font-bold text-[#1e1714] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(e) =>
                      setWifiHidden((e.target as HTMLInputElement).checked)}
                    class="w-4 h-4 accent-[#1e1714] rounded"
                  />
                  <span>{isSpanish ? "Red oculta" : "Hidden network"}</span>
                </label>
              </div>
            </div>
          )}

          {toolPreset === "vcard" && (
            <div class="bg-[#fbf1e4] border-3 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-chunky space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                  {isSpanish
                    ? "👤 Tarjeta vCard 3.0"
                    : "👤 vCard 3.0 Contact Builder"}
                </span>
                <span class="px-2 py-0.5 rounded-full bg-[#fffef7] border border-[#1e1714] text-[11px] font-bold text-[#343331] shrink-0 whitespace-nowrap">
                  {isSpanish
                    ? "Offline · iOS y Android"
                    : "Offline · iOS & Android"}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Nombre" : "First Name"}
                  </span>
                  <input
                    type="text"
                    value={vcardFirst}
                    onInput={(e) =>
                      setVcardFirst((e.target as HTMLInputElement).value)}
                    placeholder="Elena"
                    class={INPUT_CLASS}
                  />
                </label>
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Apellidos" : "Last Name"}
                  </span>
                  <input
                    type="text"
                    value={vcardLast}
                    onInput={(e) =>
                      setVcardLast((e.target as HTMLInputElement).value)}
                    placeholder="Vargas"
                    class={INPUT_CLASS}
                  />
                </label>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Puesto / Rol" : "Role / Title"}
                  </span>
                  <input
                    type="text"
                    value={vcardTitle}
                    onInput={(e) =>
                      setVcardTitle((e.target as HTMLInputElement).value)}
                    placeholder="Founder"
                    class={INPUT_CLASS}
                  />
                </label>
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Estudio / Empresa" : "Company / Studio"}
                  </span>
                  <input
                    type="text"
                    value={vcardOrg}
                    onInput={(e) =>
                      setVcardOrg((e.target as HTMLInputElement).value)}
                    placeholder="Studio Mirador"
                    class={INPUT_CLASS}
                  />
                </label>
              </div>

              <div class="grid sm:grid-cols-2 gap-2.5">
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Teléfono" : "Phone"}
                  </span>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onInput={(e) =>
                      setVcardPhone((e.target as HTMLInputElement).value)}
                    placeholder="+61 400 123 456"
                    class={INPUT_CLASS}
                  />
                </label>
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Correo" : "Email"}
                  </span>
                  <input
                    type="email"
                    value={vcardEmail}
                    onInput={(e) =>
                      setVcardEmail((e.target as HTMLInputElement).value)}
                    placeholder="hello@domain.com"
                    class={INPUT_CLASS}
                  />
                </label>
              </div>

              <label class="block space-y-1">
                <span class="text-xs font-black text-[#1e1714]">
                  {isSpanish ? "Sitio Web / Portafolio" : "Website / Portfolio"}
                </span>
                <input
                  type="url"
                  value={vcardWeb}
                  onInput={(e) =>
                    setVcardWeb((e.target as HTMLInputElement).value)}
                  placeholder="https://..."
                  class={INPUT_CLASS}
                />
              </label>
            </div>
          )}

          {toolPreset === "gs1" && (
            <div class="bg-[#fbf1e4] border-3 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-chunky space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                  {isSpanish
                    ? "📦 Constructor GS1 Digital Link"
                    : "📦 GS1 Sunrise 2027 Builder"}
                </span>
                {gtinValidation && (
                  <span
                    class={`px-2.5 py-0.5 rounded-full text-[11px] font-black border border-[#1e1714] shrink-0 whitespace-nowrap ${
                      gtinValidation.valid
                        ? "bg-emerald-200 text-[#1e1714]"
                        : "bg-amber-200 text-[#1e1714]"
                    }`}
                  >
                    {gtinValidation.valid
                      ? (isSpanish ? "✓ Mod-10 válido" : "✓ Mod-10 valid")
                      : (isSpanish ? "Revisar dígito" : "Check digit")}
                  </span>
                )}
              </div>

              <div class="grid sm:grid-cols-2 gap-2.5">
                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish ? "Dominio de Marca" : "Brand Resolver Domain"}
                  </span>
                  <input
                    type="url"
                    value={gs1Domain}
                    onInput={(e) =>
                      setGs1Domain((e.target as HTMLInputElement).value)}
                    placeholder="https://solbotanicals.co"
                    class={INPUT_CLASS}
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-xs font-black text-[#1e1714]">
                    {isSpanish
                      ? "GTIN / EAN / UPC (AI 01)"
                      : "GTIN / EAN / UPC (AI 01)"}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={gs1Gtin}
                    onInput={(e) =>
                      setGs1Gtin((e.target as HTMLInputElement).value)}
                    placeholder="09312345678907"
                    class={INPUT_CLASS}
                  />
                </label>
              </div>

              {gtinValidation && !gtinValidation.valid && (
                <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-100 border border-[#1e1714]/30 text-xs font-bold text-[#1e1714]">
                  <span>{gtinValidation.error}</span>
                  {gtinValidation.expectedCheckDigit !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        const digits = gs1Gtin.replace(/\D/g, "");
                        const fixed = digits.slice(0, -1) +
                          String(computeGs1CheckDigit(digits.slice(0, -1)));
                        setGs1Gtin(fixed);
                      }}
                      class="px-2.5 py-1 rounded-lg bg-[#1e1714] text-[#fffef7] font-black shrink-0 hover:bg-[#343331]"
                    >
                      {isSpanish
                        ? `Usar ${gtinValidation.expectedCheckDigit}`
                        : `Fix to ${gtinValidation.expectedCheckDigit}`}
                    </button>
                  )}
                </div>
              )}

              <div class="grid grid-cols-3 gap-2">
                <label class="block space-y-1">
                  <span class="text-[11px] font-black text-[#1e1714]">
                    {isSpanish ? "Lote (AI 10)" : "Batch / Lot (10)"}
                  </span>
                  <input
                    type="text"
                    value={gs1Lot}
                    onInput={(e) =>
                      setGs1Lot((e.target as HTMLInputElement).value)}
                    placeholder="BATCH-01"
                    class={INPUT_CLASS}
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-[11px] font-black text-[#1e1714]">
                    {isSpanish ? "Caducidad AAMMDD (17)" : "Expiry YYMMDD (17)"}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={gs1Expiry}
                    onInput={(e) =>
                      setGs1Expiry((e.target as HTMLInputElement).value)}
                    placeholder="271231"
                    class={INPUT_CLASS}
                  />
                </label>

                <label class="block space-y-1">
                  <span class="text-[11px] font-black text-[#1e1714]">
                    {isSpanish ? "Serie (AI 21)" : "Serial (21)"}
                  </span>
                  <input
                    type="text"
                    value={gs1Serial}
                    onInput={(e) =>
                      setGs1Serial((e.target as HTMLInputElement).value)}
                    placeholder="SN-001"
                    class={INPUT_CLASS}
                  />
                </label>
              </div>

              <div class="px-3 py-2 rounded-xl bg-[#fffef7] border border-[#1e1714]/20 font-mono text-[11px] text-[#343331] break-all">
                {url.value}
              </div>
            </div>
          )}

          {toolPreset === "inspect" && (
            <div class="bg-[#fbf1e4] border-3 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-chunky space-y-3.5">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                  {isSpanish
                    ? "🛡️ Escudo Callejero de QR"
                    : "🛡️ Street-Safe QR Airlock"}
                </span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-200 border border-[#1e1714] text-[11px] font-black text-[#1e1714] shrink-0 whitespace-nowrap">
                  {isSpanish
                    ? "Cero apertura automática · Sin cookies"
                    : "Zero auto-open · No cookies"}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  globalThis.dispatchEvent(
                    new CustomEvent("qrb-open-inspector"),
                  )}
                class="qr-pitch-cta"
              >
                <span>📷</span>
                <span>
                  {isSpanish
                    ? "Escanear con cámara o subir captura de QR"
                    : "Scan with Camera or Drop QR Screenshot"}
                </span>
              </button>

              <div class="space-y-2 pt-1">
                <label class="block text-xs font-black text-[#1e1714]">
                  {isSpanish
                    ? "🔄 O desenmascara un link corto o destino sospechoso:"
                    : "🔄 Or unmask a shortlink / suspicious QR URL directly:"}
                </label>
                <div class="flex gap-2">
                  <input
                    type="url"
                    value={peekInput}
                    onInput={(e) =>
                      setPeekInput((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runInlinePeek();
                      }
                    }}
                    placeholder="https://bit.ly/..."
                    class={INPUT_CLASS}
                    aria-label={isSpanish
                      ? "URL o link corto para revisar"
                      : "URL or shortlink to unmask"}
                  />
                  <button
                    type="button"
                    disabled={peekLoading}
                    onClick={() => void runInlinePeek()}
                    class="min-h-[42px] px-4 rounded-xl border-2 border-[#1e1714] bg-amber-200 hover:bg-amber-300 font-black text-xs sm:text-sm text-[#1e1714] shadow-[2px_2px_0_#1e1714] shrink-0 transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {peekLoading
                      ? (isSpanish ? "Revisando…" : "Peeking…")
                      : (isSpanish ? "🔍 Revelar" : "🔍 Unmask")}
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span class="text-[11px] font-bold text-[#6f6158]">
                    {isSpanish ? "Probar ejemplo:" : "Try sample:"}
                  </span>
                  {[
                    {
                      label: isSpanish
                        ? "🔄 Redirección 301 (/why)"
                        : "🔄 Redirect Hop (/why)",
                      target: "https://qrbuddy.app/why",
                    },
                    {
                      label: isSpanish
                        ? "📜 Menú (/menus)"
                        : "📜 Menu Alias (/menus)",
                      target: "https://qrbuddy.app/menus",
                    },
                  ].map((sample) => (
                    <button
                      key={sample.target}
                      type="button"
                      onClick={() => {
                        setPeekInput(sample.target);
                        void runInlinePeek(sample.target);
                      }}
                      class="px-2.5 py-1 rounded-full border border-[#1e1714]/40 bg-[#fffef7] hover:bg-amber-100 text-[11px] font-black text-[#1e1714] transition-colors"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {peekResult && (
                <div class="rounded-xl border-2 border-[#1e1714] bg-[#fffef7] p-3 space-y-2 shadow-[2px_2px_0_#1e1714]">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-mono text-xs font-black text-[#1e1714] truncate">
                      {peekResult.domain}
                    </span>
                    <div class="flex items-center gap-1.5 shrink-0">
                      {peekResult.isRedirected && (
                        <span class="px-2 py-0.5 rounded-full bg-amber-200 border border-[#1e1714] text-[10px] font-black text-[#1e1714]">
                          {isSpanish ? "🔄 Redirigido" : "🔄 Redirect Unmasked"}
                        </span>
                      )}
                      <span class="px-2 py-0.5 rounded-full bg-emerald-100 border border-[#1e1714] text-[10px] font-black text-[#1e1714]">
                        {peekResult.isHttps !== false ? "🔒 HTTPS" : "⚠️ HTTP"}
                      </span>
                    </div>
                  </div>
                  <p class="text-xs font-black text-[#1e1714] leading-snug">
                    {peekResult.title || peekResult.finalUrl}
                  </p>
                  {peekResult.redirectChain &&
                    peekResult.redirectChain.length > 1 && (
                    <p class="font-mono text-[11px] font-bold text-[#6f6158] break-all">
                      {peekResult.redirectChain.join(" → ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <SmartInput
            url={url}
            isDestructible={isDestructible}
            isDynamic={isDynamic}
            editUrl={editUrl}
            maxDownloads={maxDownloads}
            isBucket={isBucket}
            bucketUrl={bucketUrl}
            logoUrl={logoUrl}
            qrStyle={style}
            customStyle={customStyle}
            frameConfig={frameConfig}
            onModalStateChange={(isOpen) => (isModalOpen.value = isOpen)}
            hidePrimaryInput={Boolean(toolPreset)}
            lang={locale}
          />
        </div>

        {/* Pastel Bento Feature Grid (02-social-square & 03-story vibe) */}
        <section class="space-y-4 pt-4">
          <h2 class="text-xl sm:text-2xl font-black text-[#1e1714] text-center">
            {resolvedFeaturesTitle}
          </h2>
          <div
            class={`grid gap-4 ${
              valueCards.length === 4 ? "sm:grid-cols-2" : "sm:grid-cols-3"
            }`}
          >
            {valueCards.map((card, idx) => {
              const toneClass = BENTO_CARD_TONES[idx % BENTO_CARD_TONES.length];
              return (
                <div
                  key={card.title}
                  class={`${toneClass} border-3 border-[#1e1714] rounded-2xl p-5 shadow-chunky space-y-2 flex flex-col justify-between`}
                >
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-2xl leading-none">{card.icon}</span>
                      {card.tag && (
                        <span class="px-2.5 py-0.5 rounded-full bg-[#fffef7] border-2 border-[#1e1714] text-[11px] font-black text-[#1e1714] shrink-0 whitespace-nowrap">
                          {card.tag}
                        </span>
                      )}
                    </div>
                    <h3 class="text-base sm:text-lg font-black text-[#1e1714] leading-snug">
                      {card.title}
                    </h3>
                  </div>
                  <p class="text-xs sm:text-sm font-bold text-[#1e1714]/85 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Signature Neo-Toybrut Comparison Table (04-comparison-card vibe) */}
        <section class="space-y-3">
          <div class="text-center space-y-1">
            <h2 class="text-2xl sm:text-3xl font-black text-[#1e1714] tracking-tight">
              {comparisonTitle}
            </h2>
            <p class="text-xs sm:text-sm text-[#57524b] font-bold">
              {comparisonSubtitle}
            </p>
          </div>

          <div class="border-3 border-[#1e1714] rounded-3xl shadow-chunky overflow-hidden bg-[#fffef7]">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[500px] text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr class="border-b-3 border-[#1e1714] text-[#1e1714] font-black text-xs sm:text-sm">
                    <th class="py-3.5 px-4 bg-[#fbf1e4] border-r-2 border-[#1e1714] w-[30%]">
                      {comparisonColumns?.feature ??
                        (isSpanish ? "Lo que importa" : "What Matters")}
                    </th>
                    {qrbuddyFirst
                      ? (
                        <>
                          <th class="py-3.5 px-4 bg-gradient-to-r from-[#ff9a8b] via-[#ff758f] to-[#b86bff] text-[#1e1714] border-r-2 border-[#1e1714] w-[36%]">
                            {comparisonColumns?.col2 ??
                              (isSpanish
                                ? "QRBuddy (Gratis + Pasaporte)"
                                : "QRBuddy (Free + Passport)")}
                          </th>
                          <th class="py-3.5 px-4 bg-[#fbf1e4] text-[#1e1714] w-[34%]">
                            {comparisonColumns?.col1 ??
                              (isSpanish
                                ? "Otros ($35/mes)"
                                : "The $35/mo Giants")}
                          </th>
                        </>
                      )
                      : (
                        <>
                          <th class="py-3.5 px-4 bg-[#fbf1e4] text-[#1e1714] border-r-2 border-[#1e1714] w-[34%]">
                            {comparisonColumns?.col1 ??
                              (isSpanish ? "Estudio Gratis" : "Free Studio")}
                          </th>
                          <th class="py-3.5 px-4 bg-gradient-to-r from-[#ff9a8b] via-[#ff758f] to-[#b86bff] text-[#1e1714] w-[36%]">
                            {comparisonColumns?.col2 ??
                              (isSpanish
                                ? "Pasaporte QRBuddy 🛂"
                                : "QRBuddy Passport 🛂")}
                          </th>
                        </>
                      )}
                  </tr>
                </thead>
                <tbody class="divide-y-2 divide-[#1e1714]">
                  {comparisonItems.map((item) => (
                    <tr key={item.feature}>
                      <td class="py-3 px-4 font-black text-[#1e1714] bg-[#fffef7] border-r-2 border-[#1e1714]">
                        {item.feature}
                      </td>
                      {qrbuddyFirst
                        ? (
                          <>
                            <td class="py-3 px-4 font-black text-[#1e1714] bg-[#f8de7e] border-r-2 border-[#1e1714]">
                              {item.supporter}
                            </td>
                            <td class="py-3 px-4 font-bold text-[#343331] bg-[#fffef7]">
                              {item.free}
                            </td>
                          </>
                        )
                        : (
                          <>
                            <td class="py-3 px-4 font-bold text-[#343331] bg-[#fffef7] border-r-2 border-[#1e1714]">
                              {item.free}
                            </td>
                            <td class="py-3 px-4 font-black text-[#1e1714] bg-[#f8de7e]">
                              {item.supporter}
                            </td>
                          </>
                        )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dark Espresso Footer Callout Bar (04-comparison-card signature bar) */}
          <div class="bg-[#1e1714] text-[#fffef7] border-3 border-[#1e1714] rounded-2xl px-4 sm:px-5 py-3 shadow-chunky flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-black">
            <span>
              {isSpanish
                ? "Cambio en 30 segundos · Degradados para imprenta · Sin cuentas"
                : "Switch in 30 seconds · Print-verified gradients · No account walls"}
            </span>
            <PricingLink class="text-[#9ef0c8] font-mono font-black hover:underline cursor-pointer">
              {isSpanish
                ? "Pasaporte ~$32/año →"
                : "qrbuddy.app · ~$32/yr Pass →"}
            </PricingLink>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section class="bg-[#fffef7] border-3 border-[#1e1714] rounded-2xl p-6 shadow-chunky space-y-4">
          <h2 class="text-lg sm:text-xl font-black text-[#1e1714]">
            {resolvedFaqTitle}
          </h2>
          <div class="space-y-3 text-xs sm:text-sm">
            {faqItems.map((faq) => (
              <details
                key={faq.q}
                class="group border-2 border-[#E6E4D9] rounded-xl p-3.5 bg-[#fbf1e4]/50 open:bg-[#fffef7] open:border-[#1e1714] transition-colors"
              >
                <summary class="font-bold cursor-pointer text-[#1e1714] flex items-center justify-between list-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] rounded-md">
                  <span>{faq.q}</span>
                  <span class="text-[#6f6158] group-open:rotate-180 transition-transform font-mono">
                    ▼
                  </span>
                </summary>
                <p class="mt-2 text-[#57524b] leading-relaxed pl-1">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom Passport Card — Warm Neo-Toybrut Cream, Sovereign Voice */}
        <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-6 sm:p-8 shadow-chunky text-center space-y-3.5">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#1e1714] bg-amber-200 text-xs font-black text-[#1e1714]">
            <span>🛂</span>
            <span>
              {isSpanish
                ? "Cero Suscripciones Mensuales"
                : "Zero Monthly Subscriptions"}
            </span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-[#1e1714] tracking-tight text-balance">
            {isSpanish
              ? "100 Links Editables, Envíos de 500 MB y Reporte de 90 Días."
              : "100 Editable Links, 500 MB Drops & 90-Day Field Reports."}
          </h2>
          <p class="text-sm font-bold text-[#57524b] max-w-md mx-auto">
            {isSpanish
              ? "Los códigos estáticos y 5 links editables son gratis para siempre. El Pasaporte QRBuddy cuesta ~$32 USD (A$49) por 365 días en un solo pago sin renovación automática."
              : "Static codes and 5 editable links stay free forever. The QRBuddy Passport is ~$32 USD (A$49) once for 365 days — no automatic renewal."}
          </p>
          <div class="pt-1 flex justify-center gap-3">
            <PricingLink
              label={ctaLabel ?? (isSpanish
                ? "Obtener Pasaporte QRBuddy 🛂✨"
                : "Get QRBuddy Passport 🛂✨")}
              className="text-base px-6 py-3"
            />
          </div>
        </div>

        {/* Internal Link Graph — Explore More QR Tools */}
        <nav
          aria-label={isSpanish ? "Más herramientas QR" : "More QR tools"}
          class="pt-2 space-y-2.5 text-center"
        >
          <p class="text-xs font-black uppercase tracking-wider text-[#6f6158]">
            {isSpanish
              ? "Estudios Especializados y Guías"
              : "Specialized QR Studios & Guides"}
          </p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            {EXPLORE_LINKS[locale].map((link) => (
              <a
                key={link.href}
                href={link.href}
                class="px-3 min-h-[36px] inline-flex items-center rounded-full border-2 border-[#1e1714]/30 bg-[#fffef7]/90 hover:bg-[#fffef7] hover:border-[#1e1714] text-xs font-bold text-[#1e1714] transition-all"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      </main>

      <FooterDock lang={locale} />

      {/* Modals */}
      <PricingModal lang={locale} />
      <AboutModal lang={locale} />
    </div>
  );
}
