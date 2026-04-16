import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";

interface GoData {
  url: string;
  tier: string;
}

export const handler: Handlers<GoData> = {
  GET(req, ctx) {
    const params = new URL(req.url).searchParams;
    const url = params.get("url") || "";
    const tier = params.get("tier") || "free";

    // Validate the redirect URL - block dangerous protocols
    if (
      !url ||
      url.startsWith("javascript:") ||
      url.startsWith("data:") ||
      url.startsWith("file:")
    ) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    return ctx.render({ url, tier });
  },
};

export default function Go({ data }: PageProps<GoData>) {
  const { url } = data;

  return (
    <>
      <Head>
        <title>Redirecting... - QRBuddy</title>
        <meta name="robots" content="noindex" />
        <meta http-equiv="refresh" content={`3;url=${url}`} />
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
        <div class="max-w-lg w-full">
          <div class="bg-white border-4 border-black rounded-2xl p-8 md:p-10 text-center shadow-[6px_6px_0_rgba(0,0,0,0.15)]">
            {/* QRBuddy branding */}
            <div class="text-4xl mb-4">
              📱
            </div>

            <h1 class="text-2xl md:text-3xl font-black text-gray-900 mb-3">
              You're being redirected
            </h1>

            <p class="text-gray-500 text-sm mb-6">
              This QR code was made with QRBuddy (free tier)
            </p>

            {/* Destination preview */}
            <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6 text-left break-all">
              <p class="text-xs text-gray-400 uppercase font-bold mb-1 tracking-wider">
                Destination
              </p>
              <p class="text-gray-700 text-sm font-mono">
                {url.length > 80 ? url.slice(0, 80) + "..." : url}
              </p>
            </div>

            {/* CTA */}
            <a
              href={url}
              class="inline-block w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-xl border-3 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)] hover:scale-[1.02] hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] transition-all"
            >
              Continue to site →
            </a>

            <p class="text-gray-400 text-xs mt-4">
              You'll be redirected in a moment
            </p>
          </div>

          {/* Upgrade nudge */}
          <div class="mt-6 text-center">
            <p class="text-gray-500 text-sm mb-2">
              Want instant redirects with no interstitial?
            </p>
            <a
              href="/"
              class="text-purple-600 font-semibold text-sm hover:underline"
            >
              Try QRBuddy Pro →
            </a>
          </div>
        </div>

        <footer class="mt-12 text-center text-gray-400 text-xs">
          Made by Pablo in Melbourne
        </footer>
      </div>
    </>
  );
}
