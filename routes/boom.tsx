import { Head } from "$fresh/runtime.ts";

export default function Boom() {
  return (
    <>
      <Head>
        <title>Already opened | QRBuddy</title>
        <meta
          name="description"
          content="This QR code has already self-destructed"
        />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://qrbuddy.app/boom" />
      </Head>

      <main class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <div class="max-w-md w-full animate-pop-in">
          <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-8 sm:p-10 text-center shadow-chunky space-y-5">
            <span class="inline-flex items-center px-3 py-1 rounded-full border-2 border-[#1e1714] bg-amber-200 text-xs font-black uppercase tracking-wider text-[#1e1714]">
              One-time link
            </span>
            <h1 class="text-5xl sm:text-6xl font-black text-[#1e1714] tracking-tight">
              Poof.
            </h1>
            <div class="space-y-1.5 text-[#4a3f39] text-base font-bold leading-snug">
              <p>Someone already grabbed this one.</p>
              <p class="text-[#574c44] font-semibold">It is gone for good.</p>
            </div>
            <a href="/" class="qr-pitch-cta">
              <span>Make a QR</span>
            </a>
          </div>
          <p class="mt-6 text-center text-xs font-bold text-[#574c44]">
            Made by Pablo • Melbourne
          </p>
        </div>
      </main>
    </>
  );
}
