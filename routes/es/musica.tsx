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
    title: "Reproductor de Mixtapes de 10 Pistas",
    desc:
      "Suelta hasta 10 pistas de audio (máx. 5 MB cada una) para crear un reproductor web con avance automático y ranking de reproducciones.",
  },
  {
    icon: "🔗",
    title: "Actualiza Stickers y Merch en Gira",
    desc:
      "Usa un QR dinámico editable en vinilos, cassettes o carteles y cambia el destino en cada nuevo sencillo o fecha de concierto sin reimprimir.",
  },
  {
    icon: "🎨",
    title: "SVG Vectorial para Fundas y Carteles",
    desc:
      "Elige un degradado de alto contraste, coloca el logo de la banda al centro y exporta PNG de 3000px o SVG vectorial para imprenta.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos para lanzamientos",
    free: "Ilimitados; el destino queda grabado directo en el QR ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Enlaces editables para giras y merch",
    free: "5 enlaces editables permanentes incluidos gratis",
    supporter: "100 enlaces editables + ruteo iOS/Android y por horario",
  },
  {
    feature: "Mixtape reproducible de varias pistas",
    free: "Hasta 10 pistas de hasta 5 MB cada una (30 días en línea)",
    supporter: "Mismo tope de 10 pistas + ranking por canción y modo sin marca",
  },
  {
    feature: "Envío de archivo individual (WAV / Stems)",
    free: "Hasta 50 MB por archivo (vigencia de 30 días)",
    supporter: "Hasta 500 MB por archivo individual (vigencia de 30 días)",
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
    q: "¿Cómo funciona una playlist o mixtape alojado en QRBuddy?",
    a: "Al soltar de 2 a 10 archivos de audio (MP3, M4A, WAV u OGG de hasta 5 MB cada uno) en el cuadro principal, QRBuddy genera una página en /f/{código} con reproductor web y avance automático. Los envíos alojados permanecen activos durante 30 días.",
  },
  {
    q: "¿Se puede cambiar a dónde apunta el QR de un vinilo o sticker después de imprimir?",
    a: "Sí. Activando 'Editable tras imprimir + Stats' debajo del enlace antes de exportar, el QR impreso redirige a través de un enlace corto editable que hoy puede abrir una preventa y el mes próximo la boletera de la gira.",
  },
  {
    q: "¿Permite enviar un master WAV pesado o paquete ZIP por código QR?",
    a: "Los envíos de un solo archivo admiten hasta 50 MB gratis y hasta 500 MB con el Pasaporte QRBuddy, con opción de autodestrucción tras 1, 5, 10 o 100 descargas.",
  },
  {
    q: "¿El Pasaporte muestra qué canción del mixtape se escuchó más?",
    a: "Sí. En cualquier mixtape o galería propia (/f/{código}), el Reporte de Campo del Pasaporte muestra aperturas de 7, 30 y 90 días, ciudades principales, hora pico y el ranking de reproducciones por pista con exportación CSV.",
  },
];

export default function MusicaEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/musica";
  const title =
    "Códigos QR para Música, Bandas y Mixtapes Reproducibles | QRBuddy";
  const description =
    "Crea códigos QR con degradados para vinilos, cassettes, carteles y merch. Sube hasta 10 pistas para armar un mixtape web o descarga SVG vectorial gratis.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/music"
        ogTitle="Códigos QR para Música, Vinilos y Mixtapes — QRBuddy"
        ogImageAlt="Código QR para lanzamientos musicales y mixtapes"
        themeColor="#E600E6"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Estudio para Música y Bandas"
        applicationCategory="MultimediaApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Músicos y Sellos Independientes"
        title="El Mixtape a un Solo Escaneo."
        tagline="Suelta hasta 10 pistas para armar un reproductor web al instante, o genera QRs editables para vinilos, cassettes y carteles."
        subtagline="Pega el link del lanzamiento o suelta audios abajo: descarga PNG de 3000px y SVG vectorial gratis."
        defaultStyle="vapor"
        defaultUrl="https://bandcamp.com/album"
        defaultCaption="ESCUCHAR"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Hecho para Vinilos, Cassettes, Fanzines, Carteles y Merch"
        faqTitle="Preguntas sobre QRs para Música y Mixtapes"
        valueCards={VALUE_CARDS}
        comparisonTitle="Estudio Musical Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los QRs estáticos, 5 links editables y mixtapes de 10 pistas son gratis; el Pasaporte suma 500 MB y estadísticas"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
