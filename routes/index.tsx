import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import SmartInput from "../islands/SmartInput.tsx";
import StyleSelector from "../islands/StyleSelector.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import ErrorBoundary from "../islands/ErrorBoundary.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import Analytics from "../islands/Analytics.tsx";
import { AboutLink, AboutModal } from "../islands/AboutModal.tsx";
import { KofiButton, KofiModal } from "../islands/KofiModal.tsx";
import { PricingLink, PricingModal } from "../islands/PricingModal.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";
import { getSupabaseUrl } from "../utils/api.ts";
import { UNLIMITED_SCANS } from "../utils/constants.ts";
import RotatingTitle from "../islands/RotatingTitle.tsx";

interface HomeProps {
  posthogKey?: string;
  paymentUrlPro?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export const handler: Handlers<HomeProps> = {
  GET(_req, ctx) {
    const posthogKey = Deno.env.get("POSTHOG_KEY");
    const paymentUrlPro = Deno.env.get("PAYMENT_URL_PRO");
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    return ctx.render({
      posthogKey,
      paymentUrlPro,
      supabaseUrl: supabaseUrl ?? undefined,
      supabaseAnonKey: supabaseAnonKey ?? undefined,
    });
  },
};

export default function Home({ data }: PageProps<HomeProps>) {
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

  return (
    <>
      <Head>
        <title>QRBuddy - Drop a link. Watch it bloom.</title>
        <meta
          name="description"
          content="Beautiful QR code generator with 6 gradients, WiFi/vCard/SMS/Email templates, custom logos, and editable QR codes. Free, privacy-first, minimal analytics."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://qrbuddy.app" />

        {/* Performance hints */}
        <link
          rel="dns-prefetch"
          href="https://rckahvngsukzkmbpaejs.supabase.co"
        />
        <link
          rel="preconnect"
          href="https://rckahvngsukzkmbpaejs.supabase.co"
        />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://qrbuddy.app" />
        <meta
          property="og:title"
          content="QRBuddy - Beautiful QR Codes with Templates & Logos"
        />
        <meta
          property="og:description"
          content="Free QR code generator with WiFi/vCard/SMS templates, custom logos, 6 gradient styles, and editable QR codes. Privacy-first, minimal analytics."
        />
        <meta property="og:image" content="https://qrbuddy.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Beautiful gradient QR code generator"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app" />
        <meta
          name="twitter:title"
          content="QRBuddy - Beautiful QR Codes with Templates & Logos"
        />
        <meta
          name="twitter:description"
          content="Free QR code generator with WiFi/vCard/SMS templates, custom logos, 6 gradient styles, and editable QR codes. Privacy-first, minimal analytics."
        />
        <meta name="twitter:image" content="https://qrbuddy.app/og-image.png" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF69B4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />

        {/* Inject env vars for client-side */}
        <script>
          {`
            window.__PAYMENT_URL_PRO__ = '${data?.paymentUrlPro || ""}';
            window.__SUPABASE_URL__ = '${data?.supabaseUrl || ""}';
            window.__SUPABASE_ANON_KEY__ = '${data?.supabaseAnonKey || ""}';
          `}
        </script>

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "QRBuddy",
            "url": "https://qrbuddy.app",
            "description":
              "Beautiful gradient QR code generator with personality. Create stunning QR codes with WiFi/vCard/SMS/Email templates, custom logos, and editable redirects.",
            "applicationCategory": "UtilityApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "creator": {
              "@type": "Person",
              "name": "Pablo",
            },
            "featureList": [
              "6 gradient presets (Sunset, Pool, Terminal, Candy, Vapor, Brutalist)",
              "Custom gradient creator",
              "5 QR templates: WiFi, vCard, SMS, Email, Plain Text",
              "Custom logo in QR center",
              "Destructible QR codes (one-time use)",
              "Dynamic QR codes (editable redirects)",
              "Drag & drop file upload",
              "Copy to clipboard",
              "Download PNG",
              "Mobile-first responsive design",
              "Privacy-first (minimal analytics, respects Do Not Track)",
            ],
            "operatingSystem": "Any (Web-based)",
            "browserRequirements":
              "Requires JavaScript, Modern browser with Clipboard API support",
          })}
        </script>
      </Head>

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
      >
        Skip to main content
      </a>

      <div class="min-h-screen flex flex-col items-center justify-start sm:justify-center pt-12 sm:pt-6 p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1 relative">
        <ToastManager />
        <Analytics
          posthogKey={data?.posthogKey}
          url={url}
          style={style}
          isDynamic={isDynamic}
          isDestructible={isDestructible}
          logoUrl={logoUrl}
        />
        <EasterEggs url={url} style={style} />

        {/* Style Selector - Top Right Corner */}
        <div
          class="absolute top-4 right-4 sm:top-6 sm:right-6 z-50"
          aria-label="Style selector"
        >
          <StyleSelector style={style} customStyle={customStyle} />
        </div>

        <main id="main-content" class="w-full max-w-md space-y-8 sm:space-y-10">
          {/* Hero Text */}
          <header class="text-center space-y-2 px-4">
            <h1 class="text-4xl sm:text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <RotatingTitle />
          </header>

          {/* QR Code Display - FIRST */}
          <div class="flex justify-center">
            <div class="shadow-xl rounded-2xl w-full max-w-[320px] sm:max-w-md transition-all duration-300">
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
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Smart Input - BELOW QR */}
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
          />
        </main>

        {/* Footer */}
        <footer class="mt-14 py-8 border-t-4 border-black">
          <div class="max-w-md mx-auto px-4">
            <div class="flex items-center justify-center gap-4 flex-wrap">
              <PricingLink label="Pro ✨" />
              <AboutLink />
              <KofiButton size="sm" />
            </div>
            <p class="text-center text-xs text-gray-500 mt-4 opacity-60">
              <span class="hidden sm:inline">
                Made by Pablo • Melbourne • Drop a link. Watch it bloom.
              </span>
              <span class="sm:hidden">Made by Pablo • Melbourne</span>
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
