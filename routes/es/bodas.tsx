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
    icon: "💌",
    title: "Confirmaciones, Mapas y Mesas de Regalos",
    desc:
      "Conecta invitaciones al sitio de la boda, ubicación del salón o lista de regalos con un QR estático eterno o un enlace editable.",
  },
  {
    icon: "📸",
    title: "Galerías de hasta 10 Fotos",
    desc:
      "Suelta hasta 10 fotos en el estudio para crear una galería web de 30 días lista para ver y descargar desde cualquier celular.",
  },
  {
    icon: "🎶",
    title: "Mixtape de la Fiesta y SVG para Imprenta",
    desc:
      "Comparte una playlist de hasta 10 pistas (5 MB por pista) o descarga vectores SVG limpios para invitaciones impresas y tarjetas de mesa.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos para invitaciones",
    free: "Ilimitados; el destino queda grabado directo en el QR ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Enlaces dinámicos editables del evento",
    free: "5 enlaces editables permanentes incluidos gratis",
    supporter: "100 enlaces editables + portadas personalizadas",
  },
  {
    feature: "Galería de fotos o playlist de audio",
    free: "Hasta 10 fotos o pistas; audios de hasta 5 MB cada uno",
    supporter: "Mismo tope múltiple; archivos individuales de hasta 500 MB",
  },
  {
    feature: "Páginas limpias sin marca (White-Label)",
    free: "Incluye sello discreto de QRBuddy al pie",
    supporter: "Modo sin marca activable en un clic",
  },
  {
    feature: "Vigencia de archivos alojados",
    free: "30 días",
    supporter: "30 días",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "Sin compra necesaria",
    supporter:
      "~$32 USD (A$49) una vez por 365 días; sin renovación automática",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Cómo funcionan las galerías de fotos para bodas en QRBuddy?",
    a: "Las galerías permiten al organizador seleccionar y subir hasta 10 fotos para compartirlas en una presentación deslizable que los invitados ven o descargan al escanear el QR. Para recibir un archivo individual en un buzón protegido por PIN, está disponible la herramienta Buzón en Personalizar.",
  },
  {
    q: "¿Se puede actualizar el enlace de confirmación o mapa después de imprimir las invitaciones?",
    a: "Sí. Activando el botón 'Editable tras imprimir + Stats' antes de descargar el archivo SVG o PNG, el código impreso apunta a un enlace corto editable cuyo destino puede modificarse antes o después de la boda.",
  },
  {
    q: "¿Cuánto tiempo permanecen en línea las galerías de fotos y playlists?",
    a: "Los archivos alojados, galerías de fotos y mixtapes permanecen activos durante 30 días. Los códigos QR estáticos o editables que apuntan a un sitio web externo de boda no tienen límite de 30 días.",
  },
  {
    q: "¿Sirven los archivos SVG para imprenta, serigrafía o grabado en papel?",
    a: "Sí. El botón 'SVG' junto a 'Guardar PNG' descarga trazos vectoriales reales listos para abrir en Illustrator, InDesign, Affinity o Canva.",
  },
];

export default function BodasEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/bodas";
  const title =
    "Códigos QR para Bodas, Invitaciones, Confirmaciones y Fotos | QRBuddy";
  const description =
    "Crea códigos QR con estilo para invitaciones de boda, mapas, confirmaciones, galerías de 10 fotos y playlists. Exportación SVG vectorial gratis sin suscripciones.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/weddings"
        ogTitle="Códigos QR para Bodas, Invitaciones y Galerías — QRBuddy"
        ogImageAlt="Códigos QR con estilo para invitaciones y detalles de boda"
        themeColor="#BA5566"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Estudio de Bodas"
        applicationCategory="LifestyleApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Bodas y Celebraciones"
        title="Códigos QR para Bodas a la Altura de la Papelería."
        tagline="Enlaza invitaciones con confirmaciones, mapas del salón, galerías de 10 fotos o playlists en un solo escaneo."
        subtagline="Pega el enlace del evento o suelta fotos/audios abajo: exporta PNG de 3000px o SVG vectorial para imprenta."
        defaultStyle="blush"
        defaultUrl="https://nuestraboda.love/rsvp"
        defaultCaption="NUESTRO DÍA"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Diseñado para Invitaciones, Mesas y Recuerdos"
        faqTitle="Preguntas sobre Códigos QR para Bodas"
        valueCards={VALUE_CARDS}
        comparisonTitle="Estudio de Bodas Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los QRs estáticos y 5 links editables son gratis; el Pasaporte añade páginas sin marca y envíos de 500 MB"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
