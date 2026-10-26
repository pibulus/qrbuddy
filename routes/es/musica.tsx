import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../components/VerticalLandingHead.tsx";
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
    icon: "🎧",
    title: "Comparte tu mixtape o demo",
    desc:
      "Sube hasta 10 pistas de audio (hasta 5 MB cada una) y comparte un reproductor web listo para sonar en cualquier navegador.",
  },
  {
    icon: "🔗",
    title: "Actualiza el link después de imprimir",
    desc:
      "Usa un QR editable en tus stickers o flyers y cámbialo con cada nuevo sencillo o gira sin volver a imprimir.",
  },
  {
    icon: "🎨",
    title: "Listo para vinilos, cassettes y merch",
    desc:
      "Elige tu paleta, pon el logo de tu banda o sello y descarga en PNG o SVG de alta resolución.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos",
    free: "Ilimitados; el destino queda codificado en el QR",
    supporter: "Incluidos",
  },
  {
    feature: "Códigos QR editables",
    free: "Disponibles dentro de los límites gratuitos",
    supporter: "Límites de creación más amplios",
  },
  {
    feature: "Subida de un archivo",
    free: "Hasta 50 MB; vence a los 30 días",
    supporter: "Hasta 500 MB; vence a los 30 días",
  },
  {
    feature: "Playlist de varias pistas",
    free: "Hasta 10 pistas de hasta 5 MB cada una",
    supporter: "Mismo límite; 500 MB aplica a un solo archivo",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "No hace falta comprarlo",
    supporter:
      "~$32 USD (A$49) por 365 días; un pago, sin renovación automática",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cómo funciona una playlist de QRBuddy?",
    a: "Sube hasta 10 archivos de audio de hasta 5 MB cada uno. QRBuddy aloja una página donde se pueden escuchar y seleccionar las pistas en el navegador. El enlace vence a los 30 días.",
  },
  {
    q: "¿Puedo cambiar el destino después de imprimir el QR?",
    a: "Sí, con un QR editable y su enlace privado de edición. Un QR estático no se puede cambiar porque el destino está codificado en la imagen.",
  },
  {
    q: "¿Puedo usar el QR en calcomanías y fundas?",
    a: "Descárgalo como PNG o SVG para tu diseño. Prueba el código impreso en su tamaño final. También puedes enlazar directamente a una página de lanzamiento en otro servicio.",
  },
  {
    q: "¿Qué incluye el Pasaporte QRBuddy?",
    a: "Cuesta ~$32 USD (A$49) por un pago y dura 365 días, sin renovación automática. Amplía algunos límites y permite subir un archivo individual de hasta 500 MB. Las playlists siguen limitadas a 10 audios de hasta 5 MB cada uno.",
  },
];

export default function MusicaEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/musica";
  const title = "Códigos QR para Música y Playlists Alojadas | QRBuddy";
  const description =
    "Crea una playlist de QRBuddy con hasta 10 pistas de audio o enlaza un QR a tu página de lanzamiento. Descarga diseños PNG o SVG para tus lanzamientos físicos.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/music"
        ogImageAlt="Código QR para una playlist alojada de QRBuddy"
        themeColor="#E600E6"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy para Música"
        applicationCategory="MultimediaApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Músicos y sellos"
        title="Lleva tu playlist a cada escaneo."
        tagline="Sube hasta 10 pistas para una playlist alojada por QRBuddy o enlaza a tu página de lanzamiento."
        subtagline="Las pistas se reproducen en el navegador y pueden avanzar automáticamente. Los enlaces para compartir archivos vencen a los 30 días."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="ESCUCHAR"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="QR para compartir música"
        faqTitle="Preguntas frecuentes"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy gratis y el Pasaporte QRBuddy"
        comparisonSubtitle="Funciones incluidas y límites de archivo"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
