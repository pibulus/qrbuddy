import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import HomeStage from "../../components/HomeStage.tsx";
import { getSupabaseUrl } from "../../utils/api.ts";

interface SpanishHomeProps {
  supabaseUrl?: string;
}

export const handler: Handlers<SpanishHomeProps> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

export default function SpanishHome({ data }: PageProps<SpanishHomeProps>) {
  const title =
    "QRBuddy — Estudio Profesional de Códigos QR Gratis y Dinámicos (SVG Vectorial, Logos y Analíticas)";
  const description =
    "Crea códigos QR estáticos y dinámicos editables, Wi-Fi, vCard, portadas de marca, lotes ZIP con manifiesto CSV, entregas de hasta 500 MB y analíticas de 90 días sin suscripciones trampa.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://qrbuddy.app/es" />
        <link
          rel="alternate"
          hrefLang="es"
          href="https://qrbuddy.app/es"
        />
        <link
          rel="alternate"
          hrefLang="en"
          href="https://qrbuddy.app/"
        />
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://qrbuddy.app/"
        />

        {/* Performance hints */}
        {data?.supabaseUrl && (
          <>
            <link rel="dns-prefetch" href={data.supabaseUrl} />
            <link rel="preconnect" href={data.supabaseUrl} />
          </>
        )}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="QRBuddy" />
        <meta property="og:locale" content="es_MX" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:url" content="https://qrbuddy.app/es" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Estudio profesional de códigos QR con buena onda"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://qrbuddy.app/es" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbf1e4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="QRBuddy" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          // deno-lint-ignore react-no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "QRBuddy en Español",
              "url": "https://qrbuddy.app/es",
              "inLanguage": "es",
              "description": description,
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Any (Web-based)",
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Estudio Gratuito",
                  "price": "0",
                  "priceCurrency": "AUD",
                },
                {
                  "@type": "Offer",
                  "name": "Pasaporte QRBuddy (1 Año)",
                  "price": "49",
                  "priceCurrency": "AUD",
                },
              ],
              "creator": {
                "@type": "Person",
                "name": "Pablo",
              },
              "featureList": [
                "10 paletas verificadas para impresión (Atardecer, Océano, Bosque, Carmesí, Vaporwave, Cósmico, Dulce, Matrix, Brutal, Clásico) + creador de degradados personalizados",
                "Exportación PNG de alta resolución (hasta 3000px) y SVG vectorial con contraste WCAG en vivo",
                "Todos los tipos de QR: URL, Wi-Fi, vCard, Bio Social, Centro Multimedia, Teléfono, SMS, Correo y Texto",
                "Códigos QR dinámicos editables con rutas por horario (desayuno/comida/cena), iOS/Android y pruebas A/B",
                "Generador de QR por lotes con exportación ZIP (PNG + SVG vectorial + manifest.csv para imprenta)",
                "Entregas multimedia de hasta 500 MB, galerías de fotos, mixtapes de audio y buzones de archivos",
                "Reporte de Campo del Pasaporte: analíticas de 7/30/90 días, ciudades principales, hora pico y exportación CSV",
                "Inspector seguro de QR con vista previa visual del sitio y desenrollado de redirecciones",
              ],
            }),
          }}
        />
      </Head>

      <HomeStage lang="es" />
    </>
  );
}
