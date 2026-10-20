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
    icon: "📍",
    title: "Galería de fotos del gran día",
    desc:
      "Arma una galería en QRBuddy con hasta 10 fotos. Tus invitados la ven o descargan al instante desde su celular sin instalar nada.",
  },
  {
    icon: "🔗",
    title: "Mixtape de audio para la fiesta",
    desc:
      "Sube hasta 10 canciones para compartir las rolas de la boda en un reproductor web bonito. Los links duran 30 días.",
  },
  {
    icon: "🌸",
    title: "Ubicación, horarios y mesa de regalos",
    desc:
      "Crea un QR para el mapa del salón, el itinerario o las confirmaciones. Descárgalo en PNG o SVG listo para tus invitaciones.",
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
    feature: "Presentación de fotos o playlist",
    free: "Hasta 10 fotos o pistas; audio de hasta 5 MB por archivo",
    supporter: "Mismo límite; 500 MB aplica a un archivo individual",
  },
  {
    feature: "Vencimiento del enlace del archivo",
    free: "30 días",
    supporter: "30 días",
  },
  {
    feature: "Pase Supporter",
    free: "No hace falta comprarlo",
    supporter: "A$49 por 365 días; un pago, sin renovación automática",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Los invitados pueden subir fotos a un álbum compartido?",
    a: "QRBuddy no ofrece un álbum para que varios invitados suban fotos. Puedes crear y gestionar una presentación de hasta 10 fotos y compartir su enlace o QR para que los invitados la vean o descarguen.",
  },
  {
    q: "¿Puedo crear una presentación de fotos o playlist?",
    a: "Sí. Un enlace puede incluir hasta 10 fotos o 10 pistas de audio. Cada audio debe medir hasta 5 MB; las fotos grandes pueden reducirse antes de compartirlas. Los enlaces vencen a los 30 días.",
  },
  {
    q: "¿Puedo cambiar el enlace del evento después de imprimirlo?",
    a: "Sí, si creas un QR editable y conservas su enlace privado de edición. Un QR estático no se puede cambiar porque el destino está codificado en la imagen.",
  },
  {
    q: "¿Cuánto tiempo están disponibles las fotos y el audio?",
    a: "Los enlaces para compartir archivos vencen a los 30 días. La limpieza se ejecuta a diario y puede tardar más; consulta el aviso de privacidad.",
  },
];

export default function BodasEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/bodas";
  const title = "Códigos QR para Bodas, Detalles y Contenido | QRBuddy";
  const description =
    "Crea códigos QR para sitios de boda y detalles del evento, además de presentaciones temporales de fotos y playlists alojadas por QRBuddy.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/weddings"
        ogImageAlt="Códigos QR con estilo para los detalles de una boda"
        themeColor="#BA5566"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy para Bodas"
        applicationCategory="LifestyleApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pase Supporter: A$49 por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Bodas y celebraciones"
        title="Un QR para los momentos que quieres compartir."
        tagline="Comparte los detalles del evento, una pequeña presentación de fotos o una playlist con un solo escaneo."
        subtagline="Las presentaciones y playlists admiten hasta 10 elementos y vencen a los 30 días. Cada audio puede medir hasta 5 MB; las fotos grandes pueden reducirse. Los invitados ven o descargan; no suben contenido."
        defaultStyle="blush"
        defaultUrl="https://nuestraboda.love"
        defaultCaption="NUESTRO DÍA"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="Códigos QR para compartir los detalles"
        faqTitle="Preguntas frecuentes"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy gratis y el Pase Supporter"
        comparisonSubtitle="Límites de archivo y duración del enlace"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase Supporter 💜"
      />
    </>
  );
}
