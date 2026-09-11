import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import QRCanvas from "../../islands/QRCanvas.tsx";
import SmartInput from "../../islands/SmartInput.tsx";
import StyleSelector from "../../islands/StyleSelector.tsx";
import EasterEggs from "../../islands/EasterEggs.tsx";
import ErrorBoundary from "../../islands/ErrorBoundary.tsx";
import ToastManager from "../../islands/ToastManager.tsx";
import Analytics from "../../islands/Analytics.tsx";

import { AboutLink, AboutModal } from "../../islands/AboutModal.tsx";
import { KofiButton, KofiModal } from "../../islands/KofiModal.tsx";
import { PricingLink, PricingModal } from "../../islands/PricingModal.tsx";
import { QR_STYLES } from "../../utils/qr-styles.ts";
import type { QRStyle } from "../../types/qr-types.ts";
import { getSupabaseUrl } from "../../utils/api.ts";
import { UNLIMITED_SCANS } from "../../utils/constants.ts";

interface SpanishHomeProps {
  supabaseUrl?: string;
}

export const handler: Handlers<SpanishHomeProps> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

export default function SpanishHome({ data }: PageProps<SpanishHomeProps>) {
  const url = useSignal("");
  const style = useSignal<keyof typeof QR_STYLES | "custom">("sunset");
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
  const frameConfig = useSignal<{ enabled: boolean; caption: string } | null>(
    null,
  );

  const title = "QRBuddy — Generador de Códigos QR Hermosos y Éticos";
  const description =
    "Generador de códigos QR con gradientes, enlaces dinámicos sin suscripciones forzadas, transferencia de archivos autodestructibles y reproductores de música.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://qrbuddy.app/es" />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/es"
        />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app"
        />

        {/* Performance hints */}
        {data?.supabaseUrl && (
          <>
            <link rel="dns-prefetch" href={data.supabaseUrl} />
            <link rel="preconnect" href={data.supabaseUrl} />
          </>
        )}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="QRBuddy" />
        <meta property="og:url" content="https://qrbuddy.app/es" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Generador de códigos QR éticos y hermosos"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app/es" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF69B4" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "QRBuddy en Español",
            "url": "https://qrbuddy.app/es",
            "description": description,
            "applicationCategory": "UtilityApplication",
            "operatingSystem": "All",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "creator": {
              "@type": "Person",
              "name": "Pablo",
            },
          })}
        </script>
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-start sm:justify-center px-6 pb-6 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 relative sm:bg-[length:200%_200%] sm:animate-gradient-flow sm:[animation-duration:16s]">
        <ToastManager />
        <Analytics
          url={url}
          style={style}
          isDynamic={isDynamic}
          isDestructible={isDestructible}
          logoUrl={logoUrl}
        />

        <EasterEggs url={url} style={style} />

        {/* Style Selector */}
        <div
          class="absolute top-7 right-4 sm:top-12 sm:right-6 z-50 animate-fade-in"
          aria-label="Selector de estilos"
        >
          <StyleSelector
            style={style}
            customStyle={customStyle}
            isHidden={isModalOpen}
          />
        </div>

        {/* Language switcher pill */}
        <div class="absolute top-7 left-4 sm:top-12 sm:left-6 z-50 animate-fade-in">
          <a
            href="/"
            class="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-black rounded-xl text-xs font-black shadow-chunky hover:scale-105 active:scale-95 transition-all"
            title="Switch to English"
          >
            🇦🇺 English
          </a>
        </div>

        <main id="main-content" class="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Hero Text */}
          <header class="text-center space-y-1.5 px-4 mb-2 animate-fade-in">
            <h1 class="text-4xl sm:text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg font-bold text-gray-800">
              Deja caer un enlace. Míralo florecer. 🌸
            </p>
            <p class="text-[11px] font-black uppercase tracking-wider text-gray-500 pt-1">
              Sin Suscripciones • Sin Enlaces Rotos • Utilidad Honesta
            </p>
          </header>

          {/* QR Code Display */}
          <div class="flex justify-center animate-slide-up">
            <div class="shadow-xl rounded-2xl w-full max-w-[300px] sm:max-w-[360px] transition-all duration-300">
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
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Smart Input */}
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
            frameConfig={frameConfig}
            onModalStateChange={(isOpen) => (isModalOpen.value = isOpen)}
          />
        </main>

        {/* Footer */}
        <footer class="mt-16 py-8 border-t-4 border-black w-full max-w-xl mx-auto">
          <div class="px-4 text-center space-y-4">
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <PricingLink label="Pase de Soporte ✨" />
              <AboutLink />
              <KofiButton size="sm" label="Propina ☕" />
            </div>

            {/* Vertical Soluciones & Guías */}
            <div class="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs font-bold text-gray-700">
              <span class="text-gray-400 font-normal">Soluciones:</span>
              <a href="/es/menus" class="hover:underline hover:text-black">
                Menús para Restaurantes 📜
              </a>
              <span class="text-gray-300">•</span>
              <a href="/es/bodas" class="hover:underline hover:text-black">
                Bodas y Fotos 📸
              </a>
              <span class="text-gray-300">•</span>
              <a href="/es/musica" class="hover:underline hover:text-black">
                Mixtapes y Música 📼
              </a>
              <span class="text-gray-300">•</span>
              <a href="/es/archivos" class="hover:underline hover:text-black">
                Archivos Secretos 🔐
              </a>
              <span class="text-gray-300">•</span>
              <a
                href="/es/guia/impresion"
                class="hover:underline text-indigo-700 font-black"
              >
                Calculadora & Guía 📐
              </a>
            </div>

            <p class="text-center text-xs text-gray-500 mt-4 opacity-70 font-medium">
              Hecho por Pablo • Mexicano-Australiano • Software libre de
              espionaje corporativo.
            </p>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <PricingModal />
      <AboutModal />
      <KofiModal kofiUsername="madebypablo" />
    </>
  );
}
