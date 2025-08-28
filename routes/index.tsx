import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import URLInput from "../islands/URLInput.tsx";
import ActionButtons from "../islands/ActionButtons.tsx";
import StyleSelector from "../islands/StyleSelector.tsx";
import ShuffleAction from "../islands/ShuffleAction.tsx";
import KeyboardHandler from "../islands/KeyboardHandler.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import ErrorBoundary from "../islands/ErrorBoundary.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";

export default function Home() {
  const url = useSignal("");
  const style = useSignal<keyof typeof QR_STYLES | 'custom'>("sunset");
  const customStyle = useSignal<any>(null);
  const triggerDownload = useSignal(false);
  const isAnimating = useSignal(false);
  const triggerCopy = useSignal(false);

  return (
    <>
      <Head>
        <title>QRBuddy - Drop a link. Watch it bloom.</title>
        <meta
          name="description"
          content="The Porkbun of QR generators. Beautiful gradient QR codes that make you smile."
        />
        <meta property="og:title" content="QRBuddy - Beautiful QR Codes" />
        <meta
          property="og:description"
          content="Drop a link. Watch it bloom. Create stunning gradient QR codes in seconds."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF69B4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />
      </Head>

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
        <div class="absolute top-6 right-6">
          <StyleSelector style={style} customStyle={customStyle} />
        </div>
        
        <div class="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <div class="text-center space-y-2">
            <h1 class="text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg text-gray-600">
              Generate beautiful QR codes
            </p>
          </div>

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
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* URL Input - BELOW QR */}
          <URLInput url={url} />

          {/* Action Buttons - Side by Side */}
          <ActionButtons
            triggerDownload={triggerDownload}
            url={url}
            style={style}
          />
        </div>

        {/* Footer */}
        <footer class="mt-16 text-center text-sm text-gray-500 opacity-60">
          Made with 🧁 by Pablo
        </footer>
      </div>
    </>
  );
}
