import { Head } from "$fresh/runtime.ts";
import { ErrorPageProps } from "$fresh/server.ts";

// Fresh had no _500.tsx — any unhandled throw in a handler or render (a
// non-JSON edge-fn response, a null field, a rendering bug) fell through to
// Fresh's default stack-trace page. That page is public and mid-scan, so it
// leaked internals to strangers and gave them nothing to do but leave.
// This never re-throws — it's the last line, not another thing to fail.
export default function Error500({ error }: ErrorPageProps) {
  console.error("[ROUTE:_500] unhandled:", error);

  return (
    <>
      <Head>
        <title>💥 Something popped | QRBuddy</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main class="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1">
        <div class="max-w-md w-full text-center">
          <div class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-10 shadow-chunky animate-pop-in">
            <div class="text-6xl mb-4" aria-hidden="true">
              🧯
            </div>
            <h1 class="text-3xl font-black text-[#1e1714] mb-3">
              Something popped
            </h1>
            <p class="text-[#6e6058] text-lg mb-6">
              That's on this end, not the QR code. Try again in a moment.
            </p>
            <a href="/" class="qr-pitch-cta">
              Back to QRBuddy
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
