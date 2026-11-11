import { Head } from "$fresh/runtime.ts";
import ArtStudio from "../islands/ArtStudio.tsx";

export default function ArtPage() {
  return (
    <>
      <Head>
        <title>Art Press · QRBuddy</title>
        <meta
          name="description"
          content="Paint a working QR code into an illustrated scene, verified to scan."
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://qrbuddy.app/art" />
      </Head>

      <main class="min-h-screen bg-[#fbf1e4] text-[#1e1714] flex flex-col items-center px-4 py-10 gap-6">
        <header class="w-full max-w-2xl space-y-2">
          <a
            href="/"
            class="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full border-2 border-[#1e1714]/25 hover:border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] transition-colors"
          >
            ← Back to Studio
          </a>
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-[#1e1714]">
            Art press.
          </h1>
          <p class="text-sm font-bold text-[#5c4f47] max-w-prose leading-relaxed">
            Paints a working QR code into an illustrated scene. The code stays
            the subject — the picture becomes the ink. Every plate is
            scan-checked before it reaches the table.
          </p>
        </header>

        <ArtStudio />

        <p class="w-full max-w-2xl text-xs font-bold text-[#5c4f47] max-w-prose">
          Short links paint cleaner than long ones. Dense payloads leave less
          room for brushwork, and any plate that fails to scan is discarded.
        </p>
      </main>
    </>
  );
}
