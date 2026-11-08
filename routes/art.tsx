import { Head } from "$fresh/runtime.ts";
import ArtStudio from "../islands/ArtStudio.tsx";

export default function ArtPage() {
  return (
    <>
      <Head>
        <title>Art mode · QRBuddy</title>
        <meta
          name="description"
          content="Repaint a QR code into a picture with a QR ControlNet."
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://qrbuddy.app/art" />
      </Head>

      <main class="min-h-screen bg-[#fbf1e4] text-[#1e1714] flex flex-col items-center px-4 py-10 gap-6">
        <header class="w-full max-w-2xl space-y-2">
          <a
            href="/"
            class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-wider opacity-60 hover:opacity-100"
          >
            ← QRBuddy
          </a>
          <h1 class="text-3xl font-black tracking-tight">Art mode</h1>
          <p class="text-sm font-bold opacity-70 max-w-prose">
            A QR ControlNet repaints the code into a picture. The code is still
            the subject — the picture is what it is made of. Raster output, and
            every result is decoded before it is offered.
          </p>
        </header>

        <ArtStudio />

        <p class="w-full max-w-2xl text-[11px] font-bold opacity-45 max-w-prose">
          Short links paint better than long ones. A dense payload leaves the
          model almost no room, and a picture that does not scan is discarded.
        </p>
      </main>
    </>
  );
}
