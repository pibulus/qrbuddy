import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>qrbuddy</title>
        <link rel="stylesheet" href="/styles.css" />
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
