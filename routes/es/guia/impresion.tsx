import { Head } from "$fresh/runtime.ts";
import QrPrintGuideIsland from "../../../islands/QrPrintGuideIsland.tsx";

export default function GuiaImpresionPage() {
  const canonicalUrl = "https://qrbuddy.app/es/guia/impresion";
  const title = "Calculadora de Tamaño QR y Guía de Impresión (2026) | QRBuddy";
  const description =
    "Estima el tamaño de tus QR para menús, calcomanías y lonas. Revisa contraste, formato, destino y escaneo en teléfonos reales antes de imprimir.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es" href={canonicalUrl} />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/guide/printing"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/guide/printing"
        />

        {/* OpenGraph */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="QRBuddy" />
        <meta property="og:locale" content="es_MX" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy Calculadora de Tamaño QR y Guía de Impresión"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "TechArticle",
                  headline: "Calculadora de Tamaño QR y Guía de Impresión",
                  url: canonicalUrl,
                  image: "https://qrbuddy.app/og-card.png",
                  description: description,
                  inLanguage: "es",
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
                        "¿Cuál es la fórmula para calcular el tamaño de impresión de un código QR?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text:
                          "Dividir la distancia entre 10 da una estimación inicial, no un mínimo garantizado. A 0.5 metros sugiere 5 cm. Usa un código mayor para contenido denso o poca luz y prueba una muestra impresa con los teléfonos previstos.",
                      },
                    },
                    {
                      "@type": "Question",
                      name:
                        "¿Por qué los códigos QR 'gratuitos' dejan de funcionar después de imprimirlos?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text:
                          "La imagen de un QR estático no vence por sí sola, pero su destino puede desaparecer. Los QR editables dependen del servicio de redirección y de sus límites o vencimiento. Revisa las condiciones antes de imprimir.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "¿Debo imprimir en archivo vectorial SVG o en PNG?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text:
                          "SVG permite cambiar el tamaño sin pixelación y es útil para diseños impresos. PNG también sirve si tiene suficientes píxeles para el tamaño final. Prueba la impresión antes de una tirada grande.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </Head>

      <QrPrintGuideIsland isSpanish />
    </>
  );
}
