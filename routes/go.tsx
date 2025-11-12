import { PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";

interface GoPageData {
  destination: string;
  tier: "free" | "pro";
  skipInterstitial: boolean;
}

export const handler = {
  GET(req: Request, ctx: any) {
    const url = new URL(req.url);
    const destination = url.searchParams.get("url") || "";
    const tier = url.searchParams.get("tier") || "free";

    // Pro users skip interstitial
    const skipInterstitial = tier === "pro";

    if (!destination) {
      return new Response("Missing destination URL", { status: 400 });
    }

    // If Pro tier, redirect immediately
    if (skipInterstitial) {
      return new Response(null, {
        status: 302,
        headers: { Location: destination },
      });
    }

    return ctx.render({ destination, tier, skipInterstitial });
  },
};

export default function GoPage({ data }: PageProps<GoPageData>) {
  const { destination } = data;

  return (
    <>
      <Head>
        <title>Redirecting... | QRBuddy</title>
        <meta name="robots" content="noindex, nofollow" />

        {/* Auto-redirect after 3 seconds */}
        <script>
          {`
            setTimeout(function() {
              window.location.href = '${destination}';
            }, 3000);
          `}
        </script>
      </Head>

      <div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-qr-cream via-white to-qr-sunset1">
        <div class="w-full max-w-md">
          {/* Main card */}
          <div class="bg-white border-4 border-black rounded-2xl p-8 shadow-chunky text-center space-y-6 animate-slide-in">
            {/* Logo/Icon */}
            <div class="text-6xl animate-bounce-slow">🌈</div>

            {/* QRBuddy branding */}
            <div>
              <h1 class="text-3xl font-black text-black mb-2">QRBuddy</h1>
              <p class="text-sm text-gray-600">
                Drop a link. Watch it bloom.
              </p>
            </div>

            {/* Redirect message */}
            <div class="py-4 px-4 bg-gradient-to-r from-pink-50 to-purple-50 border-3 border-pink-200 rounded-xl">
              <p class="text-sm font-bold text-gray-800 mb-2">
                Taking you to:
              </p>
              <p class="text-xs text-gray-600 break-all font-mono">
                {destination}
              </p>
            </div>

            {/* Loading animation */}
            <div class="flex justify-center gap-2">
              <div class="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>

            {/* Skip button */}
            <a
              href={destination}
              class="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95"
            >
              Skip & Continue →
            </a>

            {/* CTA */}
            <div class="pt-4 border-t-2 border-gray-200">
              <p class="text-xs text-gray-600 mb-3">
                Want beautiful QR codes like this?
              </p>
              <a
                href="/?utm_source=interstitial&utm_medium=qr_scan"
                class="inline-block px-4 py-2 bg-white text-black border-3 border-black rounded-xl font-bold shadow-chunky transition-all hover:scale-105 active:scale-95 text-sm"
              >
                Create Your Own QR →
              </a>
            </div>

            {/* Tiny footer */}
            <p class="text-xs text-gray-400">
              Made with QRBuddy • Upgrade to Pro to remove this
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          .animate-slide-in {
            animation: slide-in 0.4s ease-out;
          }

          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}
      </style>
    </>
  );
}
