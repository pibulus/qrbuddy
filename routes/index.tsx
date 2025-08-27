import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import ShuffleButton from "../islands/ShuffleButton.tsx";
import URLInput from "../islands/URLInput.tsx";
import ActionButtons from "../islands/ActionButtons.tsx";
import StylePills from "../islands/StylePills.tsx";
import KeyboardHandler from "../islands/KeyboardHandler.tsx";
import EasterEggs from "../islands/EasterEggs.tsx";
import { QR_STYLES } from "../utils/qr-styles.ts";

export default function Home() {
  const url = useSignal("");
  const style = useSignal<keyof typeof QR_STYLES>("sunset");
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
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1">
        <KeyboardHandler
          url={url}
          style={style}
          triggerDownload={triggerDownload}
          triggerCopy={triggerCopy}
          isAnimating={isAnimating}
        />
        <EasterEggs url={url} style={style} />
        <div class="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <div class="text-center space-y-2">
            <h1 class="text-5xl font-black text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg text-gray-600 tracking-wider">
              Drop a link. Watch it bloom.
            </p>
          </div>

          {/* QR Code Display */}
          <div class="flex justify-center">
            <div class="shadow-xl rounded-2xl">
              <QRCanvas
                url={url}
                style={style}
                triggerDownload={triggerDownload}
                triggerCopy={triggerCopy}
              />
            </div>
          </div>

          {/* URL Input */}
          <URLInput url={url} />

          {/* Action Buttons */}
          <div class="flex gap-4">
            <ShuffleButton
              style={style}
              isAnimating={isAnimating}
            />

            <ActionButtons
              triggerDownload={triggerDownload}
              url={url}
              style={style}
            />
          </div>

          {/* Style Pills */}
          <StylePills style={style} />
        </div>

        {/* Footer */}
        <footer class="mt-16 text-center text-xs text-gray-500 opacity-60">
          Made with 🧁 by SoftStack
        </footer>
      </div>
    </>
  );
}
