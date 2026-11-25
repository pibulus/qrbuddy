import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Lost in the pixels | QRBuddy</title>
      </Head>
      <main class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <div class="max-w-md w-full text-center">
          <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-10 shadow-chunky animate-pop-in">
            <div class="text-6xl mb-4" aria-hidden="true">
              📱
            </div>
            <h1 class="text-5xl font-black text-[#1e1714] mb-3">
              404
            </h1>
            <p class="text-[#6e6058] text-lg mb-6">
              This QR code leads nowhere. Yet.
            </p>
            <a href="/" class="qr-pitch-cta">
              Make one that does
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
