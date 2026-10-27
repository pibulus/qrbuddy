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
    icon: "📶",
    title: "Conexión en un Solo Escaneo",
    desc:
      "Las cámaras de iPhone y Android leen el formato estándar WIFI: de forma nativa y conectan al instante sin escribir contraseñas.",
  },
  {
    icon: "🔒",
    title: "100% Local y Privado",
    desc:
      "El nombre de red y la contraseña se codifican directamente en el navegador dentro del gráfico. Las claves jamás tocan un servidor.",
  },
  {
    icon: "🖼️",
    title: "Listo para Enmarcar e Imprimir",
    desc:
      "Descarga PNG de 3000px con marco o SVG vectorial real para mostradores de cafetería, departamentos Airbnb, estudios y oficinas.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Generación de QR para Wi-Fi",
    free: "Ilimitada, codificación directa, dura para siempre ($0)",
    supporter: "Incluido",
  },
  {
    feature: "Privacidad de la contraseña",
    free: "Procesada localmente en el navegador; nunca sale del dispositivo",
    supporter: "Misma codificación local privada",
  },
  {
    feature: "Exportación SVG vectorial y PNG 3000px",
    free: "Gratis con marcos y textos personalizados",
    supporter: "Incluido + lotes ZIP de hasta 50 códigos",
  },
  {
    feature: "Manual de casa o menú digital",
    free: "Hasta 5 links dinámicos editables y envíos de 50 MB",
    supporter: "100 links editables, envíos de 500 MB y analíticas de 90 días",
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
    q: "¿Caduca algún día un código QR de Wi-Fi?",
    a: "Nunca. Un código QR de Wi-Fi es una matriz estática que guarda el nombre de red (SSID), el tipo de seguridad y la contraseña directamente en los cuadritos impresos. Funciona sin internet para siempre mientras no cambie la clave del módem.",
  },
  {
    q: "¿Se envía la contraseña del Wi-Fi a algún servidor al crear el código?",
    a: "No. QRBuddy genera la cadena WIFI: directamente en el navegador del dispositivo. Ni el nombre de la red ni la contraseña se transmiten por internet.",
  },
  {
    q: "¿Qué celulares pueden escanear una tarjeta QR de Wi-Fi sin instalar apps?",
    a: "Cualquier iPhone con iOS 11 o superior y teléfonos Android con Android 10 o superior reconocen códigos QR de Wi-Fi directamente desde la cámara original y muestran el botón para unirse a la red.",
  },
  {
    q: "¿Qué pasa si cambia la contraseña del módem después de imprimir el letrero?",
    a: "Como el estándar nativo de Wi-Fi guarda la clave directo en la imagen, cambiar la clave del módem requiere imprimir una nueva etiqueta, o bien configurar la red de invitados del router con el mismo nombre y clave impresos.",
  },
];

export default function WifiEsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/wifi";
  const title =
    "Generador de Código QR para Wi-Fi Gratis (Cafeterías, Airbnb y Oficina) | QRBuddy";
  const description =
    "Crea e imprime una tarjeta QR de Wi-Fi para cafetería, Airbnb u oficina en 10 segundos. 100% privado en el navegador, con degradados, marcos y descarga SVG vectorial gratis.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/wifi"
        ogTitle="Generador de Tarjetas QR para Wi-Fi — Descarga PNG y SVG Gratis"
        ogImageAlt="Tarjeta con código QR de Wi-Fi para cafetería o Airbnb"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Generador de QR Wi-Fi"
        applicationCategory="UtilitiesApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Generador gratuito de códigos QR para Wi-Fi con exportación PNG y SVG vectorial"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Cafeterías, Airbnb y Oficinas"
        title="Imprime una Tarjeta Wi-Fi en Diez Segundos."
        tagline="Un escaneo conecta a los invitados a la red. Cero errores de dedo, cero servidores externos y sin fecha de caducidad."
        subtagline="Escribe el nombre de la red y la clave abajo: el código se actualiza en vivo listo para bajar en PNG o SVG vectorial."
        defaultStyle="pool"
        defaultCaption="WIFI GRATIS"
        toolPreset="wifi"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Ideal para Mostradores, Huéspedes y Salas de Juntas"
        faqTitle="Preguntas sobre Códigos QR de Wi-Fi"
        valueCards={VALUE_CARDS}
        comparisonTitle="Estudio Wi-Fi Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Las tarjetas Wi-Fi son 100% gratis para siempre; el Pasaporte amplía límites de links y archivos"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
