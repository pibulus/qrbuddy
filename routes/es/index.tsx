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

import { AboutModal } from "../../islands/AboutModal.tsx";
import { PricingModal } from "../../islands/PricingModal.tsx";
import FooterDock from "../../islands/FooterDock.tsx";
import DesignPreferencesSync from "../../islands/DesignPreferencesSync.tsx";
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
  const pngSize = useSignal<1000 | 2000 | 3000>(1000);

  const title =
    "QRBuddy — Estudio Profesional de Códigos QR Gratis y Dinámicos (SVG Vectorial, Logos y Analíticas)";
  const description =
    "Crea códigos QR estáticos y dinámicos editables, Wi-Fi, vCard, portadas de marca, lotes ZIP con manifiesto CSV, entregas de hasta 500 MB y analíticas de 90 días sin suscripciones trampa.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
        />
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
        <link
          rel="alternate"
          hrefLang="x-default"
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
        <meta property="og:locale" content="es_MX" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:url" content="https://qrbuddy.app/es" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Estudio profesional de códigos QR con buena onda"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app/es" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbf1e4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />

        {/* Umami Analytics */}
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="280ec8ac-9eb5-4d06-89fe-369960e40b5d"
          data-exclude-search="true"
          data-exclude-hash="true"
        >
        </script>

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "QRBuddy en Español",
              "url": "https://qrbuddy.app/es",
              "inLanguage": "es",
              "description": description,
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Any (Web-based)",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Estudio Gratuito",
                  "price": "0",
                  "priceCurrency": "AUD",
                },
                {
                  "@type": "Offer",
                  "name": "Pasaporte QRBuddy (1 Año)",
                  "price": "49",
                  "priceCurrency": "AUD",
                },
              ],
              "creator": {
                "@type": "Person",
                "name": "Pablo",
              },
              "featureList": [
                "8 paletas degradadas verificadas para impresión + creador de degradados personalizados",
                "Exportación PNG de alta resolución (hasta 3000px) y SVG vectorial con contraste WCAG en vivo",
                "Todos los tipos de QR: URL, Wi-Fi, vCard, Bio Social, Centro Multimedia, Teléfono, SMS, Correo y Texto",
                "Códigos QR dinámicos editables con rutas por horario (desayuno/comida/cena), iOS/Android y pruebas A/B",
                "Generador de QR por lotes con exportación ZIP (PNG + SVG vectorial + manifest.csv para imprenta)",
                "Entregas multimedia de hasta 500 MB, galerías de fotos, mixtapes de audio y buzones de archivos",
                "Reporte de Campo del Pasaporte: analíticas de 7/30/90 días, ciudades principales, hora pico y exportación CSV",
                "Inspector seguro de QR con vista previa visual del sitio y desenrollado de redirecciones",
              ],
            }),
          }}
        />
      </Head>

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
      >
        Saltar al contenido principal
      </a>

      <div class="min-h-[100dvh] flex flex-col items-center justify-start px-6 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 relative sm:bg-[length:200%_200%] sm:animate-gradient-flow sm:[animation-duration:16s]">
        <ToastManager />
        <Analytics
          url={url}
          style={style}
          isDynamic={isDynamic}
          isDestructible={isDestructible}
          logoUrl={logoUrl}
        />

        <EasterEggs url={url} style={style} />
        <DesignPreferencesSync
          style={style}
          customStyle={customStyle}
          logoUrl={logoUrl}
          frameConfig={frameConfig}
          pngSize={pngSize}
        />

        {/* Shared flex top-rail container */}
        <div
          role="region"
          class="w-full max-w-md flex justify-end mb-2 z-50 animate-fade-in"
          aria-label="Selector de estilos"
        >
          <ErrorBoundary>
            <StyleSelector
              style={style}
              customStyle={customStyle}
              isHidden={isModalOpen}
              lang="es"
            />
          </ErrorBoundary>
        </div>

        <main
          id="main-content"
          class="w-full max-w-md space-y-6 sm:space-y-8 sm:my-auto"
        >
          {/* Hero Text */}
          <header class="text-center space-y-1.5 px-4 mb-2 animate-fade-in">
            <h1 class="text-4xl sm:text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg font-bold text-gray-800">
              Pega un link. Hazlo brillar. 🌸
            </p>
          </header>

          {/* QR Code Display */}
          <div class="flex justify-center animate-slide-up">
            <div class="w-full max-w-[300px] sm:max-w-[360px] transition-all duration-300">
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
                  lang="es"
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
            customStyle={customStyle}
            pngSize={pngSize}
            frameConfig={frameConfig}
            onModalStateChange={(isOpen) => (isModalOpen.value = isOpen)}
            lang="es"
          />
        </main>

        <FooterDock lang="es" />
      </div>

      {/* Modals */}
      <PricingModal lang="es" />
      <AboutModal lang="es" />
      {
        /* Tip Jar parked: re-mount <KofiModal kofiUsername="madebypablo" />
          alongside its FooterDock pill to bring it back. */
      }
    </>
  );
}
