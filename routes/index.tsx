import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import SmartInput from "../islands/SmartInput.tsx";
import ActionButtons from "../islands/ActionButtons.tsx";
import StyleSelector from "../islands/StyleSelector.tsx";
import KeyboardHandler from "../islands/KeyboardHandler.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import ErrorBoundary from "../islands/ErrorBoundary.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";

export default function Home() {
  const url = useSignal("");
  const style = useSignal<keyof typeof QR_STYLES | "custom">("sunset");
  const customStyle = useSignal<QRStyle | null>(null);
  const triggerDownload = useSignal(false);
  const isAnimating = useSignal(false);
  const triggerCopy = useSignal(false);
  const isDestructible = useSignal(false);

  return (
    <>
      <Head>
        <title>QRBuddy - Drop a link. Watch it bloom.</title>
        <meta
          name="description"
          content="The Porkbun of QR generators. Beautiful gradient QR codes that make you smile."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://qrbuddy.app" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://qrbuddy.app" />
        <meta property="og:title" content="QRBuddy - Beautiful QR Codes" />
        <meta
          property="og:description"
          content="Drop a link. Watch it bloom. Create stunning gradient QR codes in seconds."
        />
        <meta property="og:image" content="https://qrbuddy.app/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="QRBuddy - Beautiful gradient QR code generator" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app" />
        <meta name="twitter:title" content="QRBuddy - Beautiful QR Codes" />
        <meta
          name="twitter:description"
          content="Drop a link. Watch it bloom. Create stunning gradient QR codes in seconds."
        />
        <meta name="twitter:image" content="https://qrbuddy.app/og-image.png" />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF69B4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "QRBuddy",
            "url": "https://qrbuddy.app",
            "description": "Beautiful gradient QR code generator with personality. Transform boring QR codes into stunning gradient art pieces.",
            "applicationCategory": "UtilityApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Person",
              "name": "Pablo"
            },
            "featureList": [
              "6 gradient presets",
              "Custom gradient creator",
              "Keyboard shortcuts",
              "Copy to clipboard",
              "Download PNG",
              "Mobile-first responsive design"
            ]
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

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1 relative">
        <ToastManager />
        <KeyboardHandler
          url={url}
          style={style}
          triggerDownload={triggerDownload}
          triggerCopy={triggerCopy}
          isAnimating={isAnimating}
        />
        <EasterEggs url={url} style={style} />

        {/* Style Selector - Top Right Corner */}
        <div class="absolute top-6 right-6" aria-label="Style selector">
          <StyleSelector style={style} customStyle={customStyle} />
        </div>

        <main id="main-content" class="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <header class="text-center space-y-2">
            <h1 class="text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg text-gray-600">
              Generate beautiful QR codes
            </p>
          </header>

          {/* QR Code Display - FIRST */}
          <div class="flex justify-center">
            <div class="shadow-xl rounded-2xl">
              <ErrorBoundary>
                <QRCanvas
                  url={url}
                  style={style}
                  customStyle={customStyle}
                  triggerDownload={triggerDownload}
                  triggerCopy={triggerCopy}
                  isDestructible={isDestructible}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Smart Input - BELOW QR */}
          <SmartInput url={url} isDestructible={isDestructible} />

          {/* Action Buttons - Side by Side */}
          <ActionButtons
            triggerDownload={triggerDownload}
            url={url}
            style={style}
          />

          {/* Keyboard Shortcuts Info */}
          <div class="text-center text-sm text-gray-500 space-y-1" role="complementary" aria-label="Keyboard shortcuts">
            <p class="font-medium">Keyboard shortcuts:</p>
            <p><kbd class="px-2 py-1 bg-gray-100 rounded text-xs">S</kbd> Shuffle • <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">D</kbd> Download • <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">C</kbd> Copy</p>
          </div>
        </main>

        {/* Footer */}
        <footer class="mt-16 text-center text-sm text-gray-500 opacity-60">
          Made with 🧁 by Pablo
        </footer>
      </div>
    </>
  );
}
