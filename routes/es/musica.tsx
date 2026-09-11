import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
import { getSupabaseUrl } from "../../utils/api.ts";

interface PageData {
  supabaseUrl?: string;
}

export const handler: Handlers<PageData> = {
  GET(_req, ctx) {
    return ctx.render({ supabaseUrl: getSupabaseUrl() ?? undefined });
  },
};

const VALUE_CARDS: ValueCard[] = [
  {
    icon: "📼",
    title: "Reproductor de Casete al Escanear",
    desc:
      "Sube hasta 10 pistas de audio. Cuando tus fans escaneen tu calcomanía o inserto de vinilo, se abre un reproductor web interactivo con avance automático.",
  },
  {
    icon: "📦",
    title: "Descarga de EP Completo en ZIP",
    desc:
      "Tus oyentes pueden escuchar las canciones en streaming directo o presionar 'Descargar Todo' para obtener el EP, stems o arte gráfico en un archivo ZIP limpio.",
  },
  {
    icon: "⚡",
    title: "Nativo para Merch y Vinilo",
    desc:
      "Descarga archivos SVG vectoriales listos para serigrafía en camisetas, portadas de casetes J-card, pósters de gira o galletas de vinilo.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Experiencia de Audio",
    corporate:
      "Redirige a plataformas con anuncios de terceros y suscripciones",
    qrbuddy: "Reproductor web dedicado con avance automático de canciones",
  },
  {
    feature: "Descargas Directas",
    corporate: "Solo enlaces simples, cero empaquetado de archivos",
    qrbuddy: "Streaming directo en navegador + descarga de álbum en ZIP",
  },
  {
    feature: "Privacidad de tus Fans",
    corporate: "Rastrea a tus oyentes con píxeles publicitarios y telemetría",
    qrbuddy: "100% privado, cero rastreadores, conexión directa con tus fans",
  },
  {
    feature: "Costo para Artistas",
    corporate: "$20 – $40 USD/mes por campaña de enlaces",
    qrbuddy: "$49 USD/año con lanzamientos dinámicos ilimitados",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cómo funciona el reproductor de mixtape en el QR?",
    a: "Subes tus archivos de audio en formato MP3, WAV o FLAC (hasta 10 canciones). QRBuddy genera una página de reproductor personalizada con controles táctiles, avance automático y botón de descarga ZIP.",
  },
  {
    q: "¿Puedo poner el código QR en mercancía y stickers de gira?",
    a: "¡Totalmente! Descarga el código QR en formato SVG vectorial o PNG de alta resolución. Queda perfecto impreso en calcomanías, ropa, estuches de casetes y pósters.",
  },
  {
    q: "¿Puedo cambiar las canciones después de imprimir los stickers?",
    a: "Sí. Con un código QR dinámico en QRBuddy, puedes actualizar el enlace de destino o agregar material adicional incluso después de haber repartido las calcomanías.",
  },
  {
    q: "¿Se comprime o pierde calidad el audio?",
    a: "Tus archivos de audio se entregan directamente en su formato original sin recodificación destructiva ni pérdida de calidad.",
  },
];

export default function MusicaEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/musica";
  const title =
    "Códigos QR para Música — Mixtapes Físicos y Lanzamientos | QRBuddy";
  const description =
    "Crea mixtapes en códigos QR para casetes, vinilos, calcomanías y mercancía oficial de bandas en México, España y Latinoamérica. Reproductor web multitrack con descarga ZIP.";

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
          href="https://qrbuddy.app/for/music"
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
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://qrbuddy.app/og-card.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="QRBuddy - Códigos QR interactivos para música y mixtapes"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://qrbuddy.app/og-card.png" />

        {/* PWA */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#E600E6" />

        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "QRBuddy para Música y Mixtapes",
                "url": canonicalUrl,
                "description": description,
                "applicationCategory": "MultimediaApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "49",
                  "priceCurrency": "USD",
                  "description":
                    "Pase de Estudio Anual con reproductores multitrack interactivos y descargas ZIP",
                },
              },
              {
                "@type": "FAQPage",
                "mainEntity": FAQ_ITEMS.map((item) => ({
                  "@type": "Question",
                  "name": item.q,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.a,
                  },
                })),
              },
            ],
          })}
        </script>
      </Head>

      <VerticalStudio
        badge="Músicos y Sellos Discográficos"
        title="Mixtapes Físicos y Lanzamientos en QR."
        tagline="Convierte calcomanías, casetes y vinilos en reproductores de audio interactivos multitrack al escanear."
        subtagline="Sube hasta 10 canciones. Tus fans escanean para escuchar con avance automático o descargar el EP completo en un archivo ZIP."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="ESCUCHAR"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="¿Por Qué los Músicos Eligen QRBuddy?"
        faqTitle="Preguntas Frecuentes sobre QR para Música"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Enlaces de Música Tradicionales"
        comparisonSubtitle="Por qué sellos independientes y artistas eligen QRBuddy para lanzamientos físicos"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase de Artista ($49/año) 🎵"
      />
    </>
  );
}
