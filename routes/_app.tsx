import { type PageProps } from "$fresh/server.ts";
import { getSupabaseUrl } from "../utils/api.ts";

export default function App({ Component }: PageProps) {
  // Injected on every route so islands on /edit, /q, etc. can reach Supabase —
  // not just the home page (see utils/api.ts resolveSupabaseUrl fallback chain).
  const envScript = `
    window.__PAYMENT_URL_PRO__ = ${
    JSON.stringify(Deno.env.get("PAYMENT_URL_PRO") ?? "")
  };
    window.__SUPABASE_URL__ = ${JSON.stringify(getSupabaseUrl() ?? "")};
    window.__SUPABASE_ANON_KEY__ = ${
    JSON.stringify(Deno.env.get("SUPABASE_ANON_KEY") ?? "")
  };
  `;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>qrbuddy</title>
        <link rel="stylesheet" href="/styles.css" />
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
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
