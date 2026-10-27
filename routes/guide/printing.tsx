import { Head } from "$fresh/runtime.ts";
import QrPrintGuideIsland from "../../islands/QrPrintGuideIsland.tsx";

export default function GuidePrintingPage() {
  const canonicalUrl = "https://qrbuddy.app/guide/printing";
  const title =
    "QR Code Print Size Calculator & Printing Guide (2026) | QRBuddy";
  const description =
    "Estimate QR print sizes for menus, stickers, and banners. Check contrast, export format, destination availability, and real-device scanning before printing.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/es/guia/impresion"
        />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

        {/* OpenGraph */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="QRBuddy" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "TechArticle",
                headline: "QR Code Print Size Calculator & Printing Guide",
                url: canonicalUrl,
                image: "https://qrbuddy.app/og-card.png",
                description: description,
                inLanguage: "en",
                author: {
                  "@type": "Person",
                  name: "Pablo",
                  url: "https://madebypablo.app",
                },
                publisher: {
                  "@type": "Organization",
                  name: "QRBuddy",
                  url: "https://qrbuddy.app",
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name:
                      "What is the formula for calculating minimum QR code print size?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "Distance divided by 10 is a starting estimate, not a guaranteed minimum. At 0.5 meters it suggests 5 cm. Use a larger code for dense content or dim light, then test a printed sample with the intended phones.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Why do 'free' QR codes stop working after printing?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "A static QR image has no expiry of its own, but its destination can disappear. Editable QRs depend on a redirect service and its limits or expiry. Check the provider's terms before printing.",
                    },
                  },
                  {
                    "@type": "Question",
                    name:
                      "Should I print QR codes from SVG vector files or PNG?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "SVG scales without pixelation and is useful for print layouts. PNG also works when it has enough pixels for the final print size. Test the actual printed output before a large run.",
                    },
                  },
                ],
              },
            ],
          })}
        </script>
      </Head>

      <QrPrintGuideIsland />
    </>
  );
}
