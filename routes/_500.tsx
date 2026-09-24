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
      <main class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50">
        <div class="max-w-md w-full text-center">
          <div class="bg-white border-4 border-black rounded-2xl p-10 shadow-[6px_6px_0_rgba(0,0,0,0.15)]">
            <div class="text-6xl mb-4" aria-hidden="true">
              🧯
            </div>
            <h1 class="text-3xl font-black text-gray-900 mb-3">
              Something popped
            </h1>
            <p class="text-gray-500 text-lg mb-6">
              That's on this end, not the QR code. Try again in a moment.
            </p>
            <a
              href="/"
              class="inline-block px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl border-3 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all"
            >
              Back to QRBuddy
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
