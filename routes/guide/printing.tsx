import { Head } from "$fresh/runtime.ts";
import QrPrintGuideIsland from "../../islands/QrPrintGuideIsland.tsx";

export default function GuidePrintingPage() {
  const canonicalUrl = "https://qrbuddy.app/guide/printing";
  const title =
    "QR Code Print Size Calculator & Anti-Hostage Guide (2026) | QRBuddy";
  const description =
    "Calculate exact optical QR print dimensions for restaurant menus, stickers, and banners. Discover the 10:1 distance formula and why free QR generators break printed codes.";

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
                headline: "QR Code Print Size Calculator & Anti-Hostage Guide",
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
                        "The optical scanning standard is Size = Distance ÷ 10. For a table menu scanned from 0.5 meters, the minimum size is 5 cm (2 inches). For dense URLs or dim lighting, Distance ÷ 8 (6.25 cm) is recommended.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Why do 'free' QR codes stop working after printing?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "Venture-backed QR code generators encode an intermediary redirect server into the code, offer a 14-day trial, and then hold the destination hostage behind a $15–$30/month subscription.",
                    },
                  },
                  {
                    "@type": "Question",
                    name:
                      "Should I print QR codes from SVG vector files or PNG?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "Always export vector SVG files for physical printing. SVG paths scale infinitely without pixelation, whereas 72 DPI PNG images become blurry and unreadable when enlarged.",
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
