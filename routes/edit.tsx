import { Head } from "$fresh/runtime.ts";
import EditQRForm from "../islands/EditQRForm.tsx";

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

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1">
        <main class="w-full max-w-2xl space-y-6">
          {/* Header */}
          <header class="text-center space-y-2">
            <h1 class="text-5xl font-black text-black tracking-tight">
              Edit Dynamic QR
            </h1>
            <p class="text-lg text-gray-600">
              Update your QR code destination and settings
            </p>
          </header>

          {/* Edit Form Island */}
          <EditQRForm />

          {/* Back to Home */}
          <div class="text-center">
            <a
              href="/"
              class="inline-block px-6 py-3 bg-black text-white font-bold rounded-xl border-2 border-black shadow-chunky hover:scale-105 transition-transform"
            >
              ← Back to QRBuddy
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer class="mt-16 text-center text-sm text-gray-500 opacity-60">
          Made by Pablo • Melbourne
        </footer>
      </div>
    </>
  );
}
