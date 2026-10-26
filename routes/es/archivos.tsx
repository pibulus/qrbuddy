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
    title: "Pasa un archivo con un escaneo",
    desc:
      "Suelta tu archivo y comparte el link o código QR al instante. Quien lo escanee lo abre o descarga directo en su navegador.",
  },
  {
    icon: "⏳",
    title: "Links temporales sin rastro",
    desc:
      "Los links de archivos vencen a los 30 días. Los buzones reutilizables se limpian solos después de 30 días sin actividad.",
  },
  {
    icon: "📦",
    title: "Archivos pesados de hasta 500 MB",
    desc:
      "Gratis subes archivos de hasta 50 MB. Con el Pasaporte QRBuddy subes archivos individuales de hasta 500 MB (10× más grandes).",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos",
    free: "Ilimitados; el destino queda codificado en el QR",
    supporter: "Incluidos",
  },
  {
    feature: "Subida de un archivo",
    free: "Hasta 50 MB",
    supporter: "Un archivo de hasta 500 MB",
  },
  {
    feature: "Vencimiento del enlace del archivo",
    free: "30 días",
    supporter: "30 días",
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
    q: "¿Qué tamaño de archivo puedo subir?",
    a: "Las subidas gratuitas permiten archivos de hasta 50 MB. El Pasaporte QRBuddy amplía el límite a 500 MB para un solo archivo; no añade subidas de archivos comprimidos con varios elementos.",
  },
  {
    q: "¿Cuánto tiempo se guardan los archivos?",
    a: "Los enlaces para compartir archivos vencen a los 30 días. El contenido de un baúl reutilizable se limpia después de 30 días sin actividad. La limpieza se ejecuta a diario y puede tardar más; consulta el aviso de privacidad.",
  },
  {
    q: "¿Los destinatarios necesitan una cuenta?",
    a: "Pueden abrir un enlace en el navegador. Quien tenga el enlace podría acceder al contenido compartido, así que compártelo solo con las personas indicadas.",
  },
  {
    q: "¿Qué incluye el Pasaporte QRBuddy?",
    a: "Cuesta ~$32 USD (A$49) por un pago y dura 365 días, sin renovación automática. Amplía algunos límites de creación y subida; siguen aplicando controles de uso.",
  },
];

export default function ArchivosEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/archivos";
  const title = "Comparte Archivos Temporales con un Código QR | QRBuddy";
  const description =
    "Comparte archivos con un enlace o código QR de QRBuddy. El límite gratuito es de 50 MB; el Pasaporte QRBuddy amplía el límite individual a 500 MB. Los enlaces vencen a los 30 días.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/lockers"
        ogImageAlt="Compartir archivos temporales con un código QR de QRBuddy"
        themeColor="#00A84F"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="Compartir archivos con QRBuddy"
        applicationCategory="UtilitiesApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Compartir archivos"
        title="Un código QR para compartir archivos temporalmente."
        tagline="Sube un archivo y comparte su enlace o código QR con las personas que lo necesitan."
        subtagline="Los enlaces vencen a los 30 días. La limpieza es diaria y puede tardar más; consulta el aviso de privacidad."
        defaultStyle="terminal"
        defaultCaption="ABRIR ARCHIVO"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="Comparte archivos por QR"
        faqTitle="Preguntas frecuentes"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy gratis y el Pasaporte QRBuddy"
        comparisonSubtitle="Límites de tamaño y tiempo de conservación"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
