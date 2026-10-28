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
    icon: "📤",
    tag: "Envío al Instante",
    title: "Suelta un Archivo, Obtén un QR",
    desc:
      "Arrastra cualquier PDF, ZIP, imagen o audio al cuadro principal para generar una página de descarga y su código QR en segundos.",
  },
  {
    icon: "💣",
    tag: "Autodestrucción",
    title: "Límites de Descarga por Usos",
    desc:
      "Mantén el enlace activo por 30 días o fija un tope estricto (1, 5, 10 o 100 descargas) que elimina el archivo al agotarse.",
  },
  {
    icon: "🔐",
    tag: "Protegido con PIN",
    title: "Buzones Reutilizables de Recepción",
    desc:
      "Genera un buzón QR de dos vías para recibir archivos de clientes o invitados dentro de una casilla protegida por PIN.",
  },
  {
    icon: "📦",
    tag: "Hasta 500 MB",
    title: "Archivos Pesados Sin Pedir Cuenta",
    desc:
      "El nivel gratuito admite archivos de hasta 50 MB. El Pasaporte QRBuddy desbloquea envíos individuales de hasta 500 MB y modo sin marca.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR Directos",
    free: "Ilimitados · Dura para siempre ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Envío de Archivo por QR",
    free: "Archivos de hasta 50 MB",
    supporter: "Archivos de hasta 500 MB (10× más grande)",
  },
  {
    feature: "Límite de Descargas y Autodestrucción",
    free: "1 / 5 / 10 / 100 o descargas ilimitadas",
    supporter: "Incluido + páginas limpias sin marca",
  },
  {
    feature: "Vigencia y Estadísticas",
    free: "30 días en línea + contador",
    supporter: "30 días + analíticas CSV de 90 días",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "$0 · Sin cuenta necesaria",
    supporter: "~$32 USD (A$49) / año · Sin cobro automático",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Qué tamaños y formatos de archivo se pueden compartir por QR?",
    a: "Las subidas gratuitas admiten archivos de hasta 50 MB (PDF, imágenes, audio, paquetes ZIP y documentos; los ejecutables se bloquean por seguridad). El Pasaporte QRBuddy amplía el límite individual a 500 MB.",
  },
  {
    q: "¿Cómo funciona la autodestrucción por número de descargas?",
    a: "Al preparar un archivo para subir, se puede elegir un límite de 1, 5, 10 o 100 descargas. El conteo se valida de forma atómica en el servidor y, al completarse la última descarga, el archivo se elimina y muestra la pantalla KABOOM.",
  },
  {
    q: "¿Cuánto tiempo permanecen guardados los archivos?",
    a: "Los enlaces estándar vencen a los 30 días de haberse subido, y los buzones reutilizables se limpian tras 30 días sin actividad mediante el proceso diario de limpieza.",
  },
  {
    q: "¿Hace falta tener cuenta o instalar una app para recibir el archivo?",
    a: "No. Al escanear el código QR, la página de descarga se abre directamente en el navegador del celular o computadora sin pedir registro.",
  },
];

export default function ArchivosEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/archivos";
  const title =
    "Compartir Archivos por Código QR y Envíos Autodestructibles (500 MB) | QRBuddy";
  const description =
    "Suelta un archivo para generar un código QR de descarga al instante. Subidas gratis de hasta 50 MB, autodestrucción por descargas y envíos de 500 MB con el Pasaporte QRBuddy.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/lockers"
        ogTitle="Envío de Archivos por QR y Enlaces Autodestructibles — QRBuddy"
        ogImageAlt="Compartir archivos temporales con un código QR de QRBuddy"
        themeColor="#00A84F"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Estudio de Archivos y Buzones"
        applicationCategory="UtilitiesApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Envío de Archivos y Buzones"
        title="Suelta un Archivo."
        titleHighlight="Comparte el QR. Listo."
        tagline="Convierte PDFs, paquetes ZIP, fotos o audios en un código QR descargable con vigencia de 30 días o autodestrucción por usos."
        subtagline="Arrastra un archivo al cuadro de abajo o toca el clip para preparar el envío."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/demo/drop?lang=es"
        defaultCaption="ABRIR ARCHIVO"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Hecho para Entregas Rápidas, Pruebas de Imprenta y Archivos"
        faqTitle="Preguntas sobre Envío de Archivos por QR"
        valueCards={VALUE_CARDS}
        comparisonTitle="Envíos Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los envíos de 50 MB y límites de descarga son gratis; el Pasaporte amplía archivos individuales a 500 MB"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
