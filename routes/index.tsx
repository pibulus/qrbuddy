import { useSignal } from "@preact/signals";
import { Head } from "$fresh/runtime.ts";
import QRCanvas from "../islands/QRCanvas.tsx";
import ShuffleButton from "../islands/ShuffleButton.tsx";
import URLInput from "../islands/URLInput.tsx";
import ActionButtons from "../islands/ActionButtons.tsx";
import StylePills from "../islands/StylePills.tsx";

export default function Home() {
  const url = useSignal("");
  const style = useSignal("sunset");
  const triggerDownload = useSignal(false);
  const isAnimating = useSignal(false);

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
        <div class="w-full max-w-md space-y-8">
          {/* Hero Text */}
          <div class="text-center space-y-2">
            <h1 class="text-5xl font-chunky text-black tracking-tight">
              QRBuddy
            </h1>
            <p class="text-lg text-gray-600">
              Drop a link. Watch it bloom.
            </p>
          </div>

          {/* QR Code Display */}
          <div class="flex justify-center">
            <QRCanvas
              url={url}
              style={style}
              triggerDownload={triggerDownload}
            />
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
            />
          </div>

          {/* Style Pills */}
          <StylePills style={style} />
        </div>

        {/* Footer */}
        <footer class="mt-16 text-center text-sm text-gray-500">
          Made with 🧁 by SoftStack
        </footer>
      </div>
    </>
  );
}
