import { Head } from "$fresh/runtime.ts";
import EditQRForm from "../islands/EditQRForm.tsx";
import { PricingModal } from "../islands/PricingModal.tsx";
import ToastManager from "../islands/ToastManager.tsx";

export default function EditPage() {
  return (
    <>
      <Head>
        <title>Edit Dynamic QR - QRBuddy</title>
        <meta
          name="description"
          content="Edit your dynamic QR code destination and settings"
        />
        <meta name="robots" content="noindex" />
      </Head>

      <div class="min-h-[100dvh] w-full overflow-x-hidden flex flex-col items-center justify-between px-4 sm:px-6 pt-8 pb-6 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <main class="w-full max-w-xl space-y-6">
          {/* Header */}
          <header class="text-center space-y-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-amber-200 text-xs font-black uppercase tracking-wider text-black shadow-chunky">
              <span>👑</span>
              <span>Editable QR</span>
            </span>
            <h1 class="text-3xl sm:text-5xl font-black text-black tracking-tight">
              Edit Dynamic QR
            </h1>
            <p class="text-sm sm:text-base font-bold text-neutral-700">
              Update your QR code destination, routing, and sticker
            </p>
          </header>

          {/* Edit Form Island */}
          <EditQRForm />

          {/* Back to Home */}
          <div class="text-center pt-2">
            <a
              href="/"
              class="min-h-[44px] inline-flex items-center justify-center px-6 py-3 bg-white hover:bg-amber-200 text-black font-black text-sm rounded-full border-2 border-black shadow-chunky hover:scale-105 transition-all"
            >
              ← Back to QRBuddy
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer class="mt-16 py-6 text-center text-xs font-bold text-neutral-600">
          Made by Pablo • Melbourne
        </footer>

        <PricingModal />
        <ToastManager />
      </div>
    </>
  );
}
