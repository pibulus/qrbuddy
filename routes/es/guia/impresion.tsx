import { Head } from "$fresh/runtime.ts";
import QrPrintGuideIsland from "../../../islands/QrPrintGuideIsland.tsx";

export default function GuiaImpresionPage() {
  const canonicalUrl = "https://qrbuddy.app/es/guia/impresion";
  const title =
    "Calculadora de Tamaño de Impresión QR y Guía Anti-Extorsión (2026) | QRBuddy";
  const description =
    "Calcula el tamaño exacto para imprimir códigos QR en menús, calcomanías y lonas. Descubre la regla óptica 10:1 y por qué los generadores gratis rompen tus códigos impresos.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es" href={canonicalUrl} />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/guide/printing"
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
                headline:
                  "Calculadora de Tamaño de Impresión QR y Guía Anti-Extorsión",
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
                        "La norma óptica estándar es Tamaño = Distancia de Escaneo ÷ 10. Para un menú de mesa visto a 0.5 metros, el tamaño mínimo es de 5 cm. Para iluminación tenue o URLs largas, se recomienda Distancia ÷ 8 (6.25 cm).",
                    },
                  },
                  {
                    "@type": "Question",
                    name:
                      "¿Por qué los códigos QR 'gratuitos' dejan de funcionar después de imprimirlos?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "Muchos generadores codifican su propio servidor de redirección intermedio, ofrecen una prueba de 14 días y luego secuestran el enlace exigiendo $15 a $30 USD al mes para no romper el código impreso con un error 404.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "¿Debo imprimir en archivo vectorial SVG o en PNG?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text:
                        "Siempre exporta en archivo vectorial SVG para impresión profesional. El formato SVG se escala matemáticamente a cualquier resolución sin perder nitidez ni pixelarse.",
                    },
                  },
                ],
              },
            ],
          })}
        </script>
      </Head>

      <QrPrintGuideIsland isSpanish />
    </>
  );
}
