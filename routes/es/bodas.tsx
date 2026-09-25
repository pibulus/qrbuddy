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
    icon: "📸",
    title: "Galería de Fotos sin Apps",
    desc:
      "Tus invitados escanean el código en la mesa y suben fotos en resolución original directamente a tu baúl privado. Sin descargar nada.",
  },
  {
    icon: "🎵",
    title: "Tu Canción de Entrada o Playlist",
    desc:
      "Incluye la canción de su primer baile o la lista de la fiesta. Al escanear, se abre un reproductor retro que avanza canciones automáticamente.",
  },
  {
    icon: "🌸",
    title: "Estética Rosa Pastel y Oro Rosa",
    desc:
      "Gradientes elegantes en tonos blush, crema y rose gold que combinan con tu papelería, flores y centros de mesa.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Duración Activa",
    corporate: "Borran las fotos tras 30 días a menos que pagues mensual",
    qrbuddy: "Activo por 365 días completos con el Pase de 1 Año",
  },
  {
    feature: "Para los Invitados",
    corporate: "Obliga a descargar apps y crear cuentas molestas",
    qrbuddy: "Cero descargas — abre directo en Safari o Chrome móvil",
  },
  {
    feature: "Música y Audio",
    corporate: "Solo fotos, nada de sonido",
    qrbuddy: "Reproductor de audio integrado con avance automático",
  },
  {
    feature: "Calidad de Foto",
    corporate: "Comprimen las fotos a baja resolución",
    qrbuddy: "Descarga todas las fotos originales en un solo archivo ZIP",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cómo suben las fotos los invitados en la boda?",
    a: "Los invitados solo apuntan la cámara de su celular al código QR de la mesa. Se abre una pantalla limpia donde pueden seleccionar fotos de su carrete y subirlas al instante.",
  },
  {
    q: "¿Cómo descargamos todas las fotos después del evento?",
    a: "Desde tu enlace de organizador, presionas 'Descargar Todo' y recibes un archivo ZIP con todas las fotos tomadas por tus invitados en su resolución original.",
  },
  {
    q: "¿Puedo imprimir el código QR en las invitaciones y tarjetas de mesa?",
    a: "¡Sí! Puedes descargar el QR en formato PNG de alta resolución o vector SVG con el marco 'FOTOS' o 'SCAN ME' listo para Canva o tu imprenta.",
  },
  {
    q: "¿Cuánto tiempo dura el código QR activo?",
    a: "Tu código y baúl privado se mantienen activos por 12 meses completos para que puedan revivir los recuerdos incluso después de la luna de miel.",
  },
];

export default function BodasEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/bodas";
  const title =
    "Códigos QR para Bodas — Galería de Fotos y Música de Invitados | QRBuddy";
  const description =
    "Códigos QR elegantes para bodas y eventos en México, España y Latinoamérica. Tus invitados suben fotos sin descargar apps y escuchan tu música en la mesa. Activo por 1 año.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/weddings"
        ogImageAlt="QRBuddy - Códigos QR para bodas y fotos de invitados"
        themeColor="#BA5566"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy para Bodas"
        applicationCategory="LifestyleApplication"
        price="19"
        offerDescription="Pase de Evento de 1 Año con baúl privado para fotos"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        badge="Bodas y Celebraciones"
        title="Códigos QR para Bodas y Momentos Inolvidables."
        tagline="Reemplaza alquileres caros y apps que expiran a los 30 días con un código elegante para las mesas."
        subtagline="Tus invitados escanean, suben fotos en alta resolución a tu baúl privado y escuchan tu playlist. Activo por 1 año completo."
        defaultStyle="blush"
        defaultUrl="https://nuestraboda.love"
        defaultCaption="FOTOS"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="¿Por Qué las Parejas Eligen QRBuddy?"
        faqTitle="Preguntas Frecuentes sobre QR para Bodas"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs Apps de Fotos Desechables"
        comparisonSubtitle="Por qué las parejas prefieren el baúl privado de 1 año"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase de Boda 💜"
      />
    </>
  );
}
