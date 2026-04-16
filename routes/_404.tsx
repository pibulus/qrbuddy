import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Lost in the pixels | QRBuddy</title>
      </Head>
      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50">
        <div class="max-w-md w-full text-center">
          <div class="bg-white border-4 border-black rounded-2xl p-10 shadow-[6px_6px_0_rgba(0,0,0,0.15)]">
            <div class="text-6xl mb-4">
              📱
            </div>
            <h1 class="text-5xl font-black text-gray-900 mb-3">
              404
            </h1>
            <p class="text-gray-500 text-lg mb-6">
              This QR code leads nowhere. Yet.
            </p>
            <a
              href="/"
              class="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl border-3 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all"
            >
              Make one that does
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
