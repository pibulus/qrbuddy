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
    tag: "Cero Teclado",
    title: "Conexión en un Solo Escaneo",
    desc:
      "Las cámaras de iPhone y Android abren la ventana de conexión Wi-Fi al instante. Cero dictar contraseñas ni errores de dedo.",
  },
  {
    icon: "🔒",
    tag: "100% En Dispositivo",
    title: "La Contraseña Queda en Casa",
    desc:
      "El nombre de red y la clave se codifican directamente dentro del navegador. La contraseña jamás se envía a un servidor.",
  },
  {
    icon: "♾️",
    tag: "$0 Para Siempre",
    title: "Funciona Sin Internet y No Caduca",
    desc:
      "Los datos de la red viven en los cuadritos impresos. Sigue funcionando año tras año sin pagos ni suscripciones.",
  },
  {
    icon: "🖼️",
    tag: "Listo para Imprenta",
    title: "Hecho para Enmarcar y Mostradores",
    desc:
      "Descarga un PNG de 3000px con marco o un SVG vectorial para mostradores de cafetería, departamentos Airbnb y oficinas.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Tarjetas QR de Wi-Fi",
    free: "Ilimitadas · Dura para siempre ($0)",
    supporter: "Incluido",
  },
  {
    feature: "Privacidad de la Contraseña",
    free: "100% local en navegador · Cero servidor",
    supporter: "Misma codificación privada",
  },
  {
    feature: "Archivos SVG Vectorial y PNG 3000px",
    free: "Gratis con marcos y textos",
    supporter: "Incluido + lotes ZIP de 50 códigos",
  },
  {
    feature: "Guía de Huéspedes o Menú (Editable)",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + stats de 90 días",
  },
  {
    feature: "Manual de Casa en PDF o Fotos",
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
        title="Imprime una Tarjeta Wi-Fi."
        titleHighlight="Conexión en un Escaneo."
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
