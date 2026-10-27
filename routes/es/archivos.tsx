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
    title: "Suelta un Archivo, Obtén un QR",
    desc:
      "Arrastra cualquier PDF, ZIP, imagen o pista de audio al cuadro principal para generar una página de descarga y su código QR en segundos.",
  },
  {
    icon: "💣",
    title: "Límites de Descarga con Autodestrucción",
    desc:
      "Mantén el enlace activo por 30 días o fija un tope estricto (1, 5, 10 o 100 descargas) que se autodestruye al agotarse.",
  },
  {
    icon: "📦",
    title: "Envíos Pesados de hasta 500 MB",
    desc:
      "El nivel gratuito admite archivos de hasta 50 MB. El Pasaporte QRBuddy desbloquea envíos individuales de hasta 500 MB y buzones con PIN.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos",
    free: "Ilimitados; el destino queda grabado directo en el QR ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Envío de archivo individual por QR",
    free: "Hasta 50 MB por archivo",
    supporter: "Hasta 500 MB por archivo individual (10× más grande)",
  },
  {
    feature: "Límite de descargas y autodestrucción",
    free: "Ilimitado o tope de 1 / 5 / 10 / 100 descargas",
    supporter: "Incluido + páginas limpias sin marca",
  },
  {
    feature: "Vigencia del enlace",
    free: "Vence a los 30 días",
    supporter: "Vence a los 30 días + analíticas de 90 días",
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
        title="Suelta un Archivo. Comparte el QR. Listo."
        tagline="Convierte PDFs, paquetes ZIP, fotos o audios en un código QR descargable con vigencia de 30 días o autodestrucción por usos."
        subtagline="Arrastra un archivo al cuadro de abajo o toca el clip para preparar el envío."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/f/demo"
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
