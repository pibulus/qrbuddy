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
    icon: "📜",
    title: "Nunca Vuelvas a Reimprimir",
    desc:
      "Actualiza tu menú en PDF, especiales del día o carta de bebidas al instante. Tus códigos impresos en las mesas y stickers siguen funcionando siempre.",
  },
  {
    icon: "🛡️",
    title: "Cero Enlaces Rotos",
    desc:
      "Las apps corporativas cobran hasta $300 USD al año y rompen tus menús si dejas de pagar. Con QRBuddy, tus códigos nunca dan error 404.",
  },
  {
    icon: "🎨",
    title: "Estética y Colores de tu Local",
    desc:
      "Combina con la decoración de tu cafetería o restaurante: tonos matcha, atardecer cálido o minimalista. Sin cuadros negros aburridos.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Precio Anual",
    corporate: "$300 a $450 USD/año (Cobros mensuales ocultos)",
    qrbuddy: "$49 USD / $499 MXN al año (Pase Studio) o 100% Gratis",
  },
  {
    feature: "Si Cancelas",
    corporate: "Rompen tus códigos impresos con error 404 al instante",
    qrbuddy: "Tus códigos se congelan a su destino y siguen funcionando",
  },
  {
    feature: "Privacidad de tus Clientes",
    corporate: "Rastrean IPs, dispositivos y venden datos de consumo",
    qrbuddy: "Cero rastreo, cero cookies, 100% privado y ético",
  },
  {
    feature: "Diseño y Logo",
    corporate: "Cuadros negros con marcas de agua feas",
    qrbuddy: "Gradientes personalizados, logo al centro y marcos claros",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Puedo cambiar el PDF de mi menú sin tener que reimprimir los códigos?",
    a: "¡Sí! Con un código QR dinámico en QRBuddy, puedes cambiar el archivo PDF, tu página web o tu Instagram cuando quieras desde tu enlace privado de edición.",
  },
  {
    q: "¿Qué pasa si no renuevo el pase el próximo año?",
    a: "A diferencia de servicios como Bitly o Beaconstac que rompen tus códigos impresos para obligarte a pagar, QRBuddy jamás rompe tus enlaces. Simplemente quedan fijos en su último destino.",
  },
  {
    q: "¿Funciona con PDFs de Google Drive, Canva o páginas web?",
    a: "Totalmente. Puedes apuntar tu código QR directamente a un PDF en Drive, Dropbox, tu propia web o sistemas de pedidos como Clip o Square.",
  },
  {
    q: "¿Hay límite de escaneos en las mesas?",
    a: "Sin límite de escaneos. Ya sea que lo escaneen 10 o 50,000 comensales, funciona sin interrupciones.",
  },
];

export default function MenusEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/menus";
  const title =
    "Menús QR para Restaurantes y Cafeterías — Dinámicos y Sin Extorsión | QRBuddy";
  const description =
    "Códigos QR dinámicos para menús de restaurantes, cafeterías y bares en México y Latinoamérica. Actualiza tu PDF en cualquier momento sin reimprimir. Sin suscripciones forzadas.";

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
          href="https://qrbuddy.app/for/menus"
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
          content="QRBuddy - Menús QR dinámicos para restaurantes"
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
        <meta name="theme-color" content="#2E7D32" />

        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                "name": "QRBuddy Menús para Restaurantes",
                "url": canonicalUrl,
                "description": description,
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": "49",
                  "priceCurrency": "USD",
                  "description":
                    "Pase Studio Anual con códigos QR dinámicos ilimitados",
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
        badge="Restaurantes y Cafeterías"
        title="El Menú QR Que Nunca Falla."
        tagline="Códigos QR dinámicos para restaurantes y cafeterías sin pagar $300 USD al año a empresas abusivas."
        subtagline="Actualiza tu carta o enlace en PDF cada vez que cambies un platillo. Tus stickers en mesa siguen funcionando."
        defaultStyle="matcha"
        defaultUrl="https://tu-restaurante.com/menu.pdf"
        defaultCaption="MENÚ"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="¿Por Qué Elegir QRBuddy para tu Restaurante?"
        faqTitle="Preguntas Frecuentes sobre Menús QR"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Servicios Corporativos de QR"
        comparisonSubtitle="Por qué cientos de negocios independientes cambiaron a QRBuddy"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase de Menús ✨"
      />
    </>
  );
}
