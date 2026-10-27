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
    tag: "Reproductor de 10 Pistas",
    title: "Mixtapes Reproducibles en Navegador",
    desc:
      "Suelta hasta 10 pistas de audio (máx. 5 MB cada una) para crear un reproductor web con avance automático al instante.",
  },
  {
    icon: "🔗",
    tag: "Listo para Gira",
    title: "Actualiza Stickers y Merch en Vivo",
    desc:
      "Imprime un QR editable en vinilos, cassettes o carteles y cambia el destino en cada nuevo sencillo o fecha de concierto.",
  },
  {
    icon: "📦",
    tag: "Hasta 500 MB",
    title: "Envía Masters WAV y Paquetes de Stems",
    desc:
      "Comparte archivos de 50 MB gratis o paquetes de hasta 500 MB con el Pasaporte — con opción de autodestrucción por descargas.",
  },
  {
    icon: "🎨",
    tag: "SVG para Maquila",
    title: "Vectores para Fundas, Stickers y Carteles",
    desc:
      "Elige una paleta de alto contraste, coloca el logo al centro y exporta PNG de 3000px o SVG vectorial listo para imprenta.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR Directos para Lanzamientos",
    free: "Ilimitados · Dura para siempre ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Links Editables para Giras y Merch",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + horarios",
  },
  {
    feature: "Mixtape Reproducible de 10 Pistas",
    free: "Hasta 10 pistas (5 MB c/u · 30 días)",
    supporter: "Incluido + ranking por canción",
  },
  {
    feature: "Envío de Master WAV / Stems ZIP",
    free: "Archivos de hasta 50 MB",
    supporter: "Archivos de hasta 500 MB + sin marca",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "$0 · Sin cuenta necesaria",
    supporter: "~$32 USD (A$49) / año · Sin cobro automático",
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
        title="Pon el Mixtape."
        titleHighlight="A un Solo Escaneo."
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
