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
    tag: "Planes Editables",
    title: "Confirmaciones, Mapas y Regalos",
    desc:
      "Conecta invitaciones al sitio de la boda, ubicación del salón o mesa de regalos con un QR directo eterno o un enlace editable.",
  },
  {
    icon: "📸",
    tag: "Galería de 10 Fotos",
    title: "Presentaciones de Fotos en un Toque",
    desc:
      "Suelta hasta 10 fotos en el estudio para crear una galería web de 30 días lista para ver y guardar desde cualquier celular.",
  },
  {
    icon: "🎶",
    tag: "Mixtape de Audio",
    title: "Playlist de la Fiesta al Instante",
    desc:
      "Comparte hasta 10 pistas de audio (5 MB por pista) con reproducción continua en el navegador — sin instalar apps.",
  },
  {
    icon: "📐",
    tag: "Papel y Grabado",
    title: "SVG Vectorial de Alta Papelería",
    desc:
      "Descarga vectores SVG reales y PNG de 3000px con contraste verificado para invitaciones en relieve, serigrafía y tarjetas de mesa.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR Directos para Invitaciones",
    free: "Ilimitados · Dura para siempre ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Links Editables del Evento y Horario",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + Portadas",
  },
  {
    feature: "Galería de 10 Fotos o Mixtape de Audio",
    free: "Hasta 10 fotos o pistas (5 MB/pista)",
    supporter: "Incluido + archivos de hasta 500 MB",
  },
  {
    feature: "Páginas Limpias Sin Marca",
    free: "Sello discreto de QRBuddy al pie",
    supporter: "Modo sin marca en un clic",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "$0 · Sin cuenta necesaria",
    supporter: "~$32 USD (A$49) / año · Sin cobro automático",
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
        title="Códigos QR para Bodas."
        titleHighlight="A la Altura de la Papelería."
        tagline="Enlaza invitaciones con confirmaciones, mapas del salón, galerías de 10 fotos o playlists en un solo escaneo."
        subtagline="Pega el enlace del evento o suelta fotos/audios abajo: exporta PNG de 3000px o SVG vectorial para imprenta."
        defaultStyle="blush"
        defaultUrl="https://qrbuddy.app/demo/wedding?lang=es"
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
