import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import SmartInput from "../islands/SmartInput.tsx";
import ActionButtons from "../islands/ActionButtons.tsx";
import StyleSelector from "../islands/StyleSelector.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import ErrorBoundary from "../islands/ErrorBoundary.tsx";
import ToastManager from "../islands/ToastManager.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";
import type { QRStyle } from "../types/qr-types.ts";

export default function SharePage(props: PageProps) {
  const urlParams = new URL(props.url).searchParams;
  const sharedData = urlParams.get("d") || "";
  const sharedStyle = (urlParams.get("s") || "sunset") as
    | keyof typeof QR_STYLES
    | "custom";

  const url = useSignal(decodeURIComponent(sharedData));
  const style = useSignal<keyof typeof QR_STYLES | "custom">(sharedStyle);
  const customStyle = useSignal<QRStyle | null>(null);
  const triggerDownload = useSignal(false);
  const isDestructible = useSignal(false);
  const isDynamic = useSignal(false);
  const editUrl = useSignal("");
  const maxDownloads = useSignal(1);
  const isBucket = useSignal(false);
  const bucketUrl = useSignal("");
  const logoUrl = useSignal("");

  return (
    <>
      <Head>
        <title>
          QRBuddy - {sharedData
            ? decodeURIComponent(sharedData)
            : "Drop a link. Watch it bloom."}
        </title>
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
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1 relative">
        <ToastManager />
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
              {sharedData ? "Shared QR Code" : "Generate beautiful QR codes"}
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
          />

          {/* Action Buttons - Side by Side */}
          <ActionButtons
            triggerDownload={triggerDownload}
            url={url}
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
