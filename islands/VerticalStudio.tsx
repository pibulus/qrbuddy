import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
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
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import { getClientLocale } from "../utils/i18n.ts";

export interface ValueCard {
  icon: string;
  title: string;
  desc: string;
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

export interface VerticalStudioProps {
  badge: string;
  title: string;
  tagline: string;
  subtagline: string;
  defaultStyle: keyof typeof QR_STYLES;
  defaultUrl?: string;
  defaultCaption?: string;
  valueCards: ValueCard[];
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonItems: ComparisonItem[];
  comparisonColumns?: {
    feature?: string;
    col1?: string;
    col2?: string;
  };
  faqItems: FAQItem[];
  ctaLabel?: string;
  lang?: "en" | "es";
  homeUrl?: string;
  homeLabel?: string;
  featuresTitle?: string;
  faqTitle?: string;
}

export default function VerticalStudio({
  badge,
  title,
  tagline,
  subtagline,
  defaultStyle,
  defaultUrl = "",
  defaultCaption = "SCAN ME",
  valueCards,
  comparisonTitle,
  comparisonSubtitle,
  comparisonItems,
  comparisonColumns,
  faqItems,
  ctaLabel,
  lang,
  homeUrl = "/",
  homeLabel = "← Back to QRBuddy Home",
  featuresTitle = "Why Professionals Choose QRBuddy",
  faqTitle = "Frequently Asked Questions",
}: VerticalStudioProps) {
  const locale = getClientLocale(lang);
  const isSpanish = locale === "es";
  const url = useSignal(defaultUrl);
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
    if (defaultUrl && !url.value) {
      url.value = defaultUrl;
    }
  }, [defaultUrl]);

  return (
    <div class="min-h-screen flex flex-col items-center justify-start px-4 pb-12 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 relative selection:bg-pink-300 selection:text-black">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
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
        {/* Navigation Breadcrumb + Style Selector */}
        <div class="flex items-center justify-between gap-1.5 sm:gap-2">
          <a
            href={homeUrl}
            class="inline-flex items-center gap-1 px-2.5 sm:px-3 min-h-[36px] bg-white border-2 border-black rounded-full text-xs font-black shadow-chunky hover:-translate-y-0.5 transition-transform shrink-0"
          >
            <span class="sm:hidden">
              {isSpanish ? "← Inicio" : "← Home"}
            </span>
            <span class="hidden sm:inline">{homeLabel}</span>
          </a>
          <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span class="inline-flex items-center gap-1 px-2.5 sm:px-3 min-h-[36px] bg-black text-white rounded-full text-[11px] sm:text-xs font-black tracking-wide uppercase truncate">
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

        {/* Hero Header */}
        <header class="text-center space-y-2 px-2 animate-fade-in">
          <h1 class="text-3xl sm:text-5xl font-black text-black tracking-tight leading-tight">
            {title}
          </h1>
          <p class="text-base sm:text-lg font-bold text-gray-800 max-w-xl mx-auto">
            {tagline}
          </p>
          <p class="text-xs sm:text-sm text-gray-600 font-medium max-w-lg mx-auto">
            {subtagline}
          </p>
        </header>

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
            lang={locale}
          />
        </div>

        {/* Feature Highlights Grid */}
        <section class="space-y-4 pt-4">
          <h2 class="text-xl sm:text-2xl font-black text-black text-center">
            {featuresTitle}
          </h2>
          <div class="grid sm:grid-cols-3 gap-4">
            {valueCards.map((card) => (
              <div
                key={card.title}
                class="bg-white border-3 border-black rounded-2xl p-5 shadow-chunky space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div class="text-3xl mb-2">{card.icon}</div>
                  <h3 class="text-base font-black text-black">{card.title}</h3>
                </div>
                <p class="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Anti-Corporate Comparison Table */}
        <section class="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-chunky space-y-5">
          <div class="text-center space-y-1">
            <h2 class="text-xl sm:text-2xl font-black text-black">
              {comparisonTitle}
            </h2>
            <p class="text-xs sm:text-sm text-gray-600 font-medium">
              {comparisonSubtitle}
            </p>
          </div>

          <div class="overflow-x-auto -mx-2 px-2">
            <table class="w-full min-w-[480px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr class="border-b-3 border-black text-gray-500 font-black uppercase text-[11px] tracking-wider">
                  <th class="py-2.5 px-3">
                    {comparisonColumns?.feature ??
                      (isSpanish ? "Función" : "Feature")}
                  </th>
                  <th class="py-2.5 px-3 text-gray-600">
                    {comparisonColumns?.col1 ??
                      (isSpanish ? "Gratis" : "Free")}
                  </th>
                  <th class="py-2.5 px-3 text-purple-700">
                    {comparisonColumns?.col2 ??
                      (isSpanish
                        ? "Pasaporte QRBuddy 🛂"
                        : "QRBuddy Passport 🛂")}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y-2 divide-gray-200 font-medium">
                {comparisonItems.map((item) => (
                  <tr
                    key={item.feature}
                    class="hover:bg-gray-50 transition-colors"
                  >
                    <td class="py-3 px-3 font-bold text-black">
                      {item.feature}
                    </td>
                    <td class="py-3 px-3 text-gray-700 bg-gray-50/50">
                      {item.free}
                    </td>
                    <td class="py-3 px-3 text-purple-900 font-bold bg-purple-50/50">
                      {item.supporter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section class="bg-white/90 border-3 border-black rounded-2xl p-6 shadow-chunky space-y-4">
          <h2 class="text-lg sm:text-xl font-black text-black">
            {faqTitle}
          </h2>
          <div class="space-y-3 text-xs sm:text-sm">
            {faqItems.map((faq) => (
              <details
                key={faq.q}
                class="group border-2 border-gray-200 rounded-xl p-3.5 bg-white open:border-black transition-colors"
              >
                <summary class="font-bold cursor-pointer text-black flex items-center justify-between list-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-md">
                  <span>{faq.q}</span>
                  <span class="text-gray-400 group-open:rotate-180 transition-transform font-mono">
                    ▼
                  </span>
                </summary>
                <p class="mt-2 text-gray-700 leading-relaxed pl-1">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <div class="bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 border-4 border-black rounded-3xl p-6 sm:p-8 shadow-chunky text-center space-y-4">
          <h2 class="text-2xl sm:text-3xl font-black text-white drop-shadow">
            {isSpanish
              ? "¿Quieres más margen para crear y compartir?"
              : "Need more room to create and share?"}
          </h2>
          <p class="text-sm font-bold text-white/95 max-w-md mx-auto">
            {isSpanish
              ? "Los códigos estáticos y las funciones gratuitas siguen disponibles. El Pasaporte QRBuddy cuesta ~$32 USD (A$49) por 365 días, en un solo pago y sin renovación automática."
              : "Free features stay available. The QRBuddy Passport is ~$32 USD (A$49) for 365 days, paid once with no automatic renewal."}
          </p>
          <div class="pt-2 flex justify-center gap-3">
            <PricingLink
              label={ctaLabel ?? (isSpanish
                ? "Obtener Pasaporte QRBuddy 🛂✨"
                : "Get QRBuddy Passport 🛂✨")}
              className="text-base px-6 py-3"
            />
          </div>
        </div>
      </main>

      <FooterDock lang={locale} />

      {/* Modals */}
      <PricingModal lang={locale} />
      <AboutModal lang={locale} />
    </div>
  );
}
