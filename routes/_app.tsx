import { type PageProps } from "$fresh/server.ts";
import { asset } from "$fresh/runtime.ts";
import { getSupabaseUrl } from "../utils/api.ts";

export default function App({ Component, url }: PageProps) {
  const isSpanish = /^\/es(?:\/|$)/.test(url.pathname) ||
    (["/privacy", "/terms"].includes(url.pathname) &&
      url.searchParams.get("lang") === "es");
  // Injected on every route so islands on /edit, /q, etc. can reach Supabase —
  // not just the home page (see utils/api.ts resolveSupabaseUrl fallback chain).
  const envScript = `
    window.__SUPABASE_URL__ = ${JSON.stringify(getSupabaseUrl() ?? "")};
    window.__SUPABASE_ANON_KEY__ = ${
    JSON.stringify(Deno.env.get("SUPABASE_ANON_KEY") ?? "")
  };
  `;

  return (
    <html lang={isSpanish ? "es" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <script
          defer
          src="https://fleetcount.pibulus.deno.net/beacon.js"
          data-site="qrbuddy.app"
        >
        </script>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="280ec8ac-9eb5-4d06-89fe-369960e40b5d"
          data-exclude-search="true"
          data-exclude-hash="true"
        >
        </script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbf1e4" />
        <link rel="stylesheet" href={asset("/styles.css")} />
        <script
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{ __html: envScript }}
        />
        {
          /* Honour OS reduced-motion. Inlined here (not in the Tailwind input)
            so it ships verbatim regardless of the build pipeline. */
        }
        <style
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html:
              "@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}",
          }}
        />
        {/* Resize guard: suppresses transition jitter during window resize/rotation */}
        <script
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html:
              `(function(){var t;addEventListener("resize",function(){document.documentElement.classList.add("is-resizing");clearTimeout(t);t=setTimeout(function(){document.documentElement.classList.remove("is-resizing")},150)})})();`,
          }}
        />
        {/* Dropzone Miss Shield: dropping files outside designated dropzones must never navigate away */}
        <script
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html:
              `(function(){function outside(e){var t=e.target;return !(t&&t.closest&&t.closest("[data-dropzone]"))}` +
              `["dragover","drop"].forEach(function(n){addEventListener(n,function(e){if(outside(e))e.preventDefault()},false)})})();`,
          }}
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
