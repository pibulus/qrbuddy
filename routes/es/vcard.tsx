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
    icon: "👤",
    title: "Directo a la Agenda del Celular",
    desc:
      "Codifica una tarjeta estándar vCard 3.0 (RFC 6350). Un escaneo abre la ficha nativa de 'Agregar contacto' en iPhone y Android.",
  },
  {
    icon: "✈️",
    title: "Funciona sin Internet en Eventos",
    desc:
      "Los códigos vCard directos no dependen de señal celular ni Wi-Fi en ferias o congresos: los datos viven dentro del gráfico impreso.",
  },
  {
    icon: "⚡",
    title: "Combínalo con Links Editables",
    desc:
      "Para actualizar un portafolio o WhatsApp tras imprimir tarjetas, basta activar un enlace dinámico editable o perfil social.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "QR de Contacto vCard 3.0 directo",
    free: "Ilimitado, funciona sin internet para siempre ($0)",
    supporter: "Incluido",
  },
  {
    feature: "SVG vectorial para tarjetas impresas",
    free: "Gratis con paletas de color y logo central",
    supporter: "Incluido + lotes ZIP de hasta 50 tarjetas",
  },
  {
    feature: "Links dinámicos editables de portafolio",
    free: "5 links editables permanentes incluidos gratis",
    supporter: "100 links editables + analíticas de 90 días",
  },
  {
    feature: "Envío de catálogos o press kits (PDF)",
    free: "Archivos de hasta 50 MB (vigencia de 30 días)",
    supporter: "Archivos de hasta 500 MB + páginas sin marca",
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
    q: "¿Cuál es la diferencia entre un QR vCard directo y un link editable?",
    a: "Un QR vCard directo guarda nombre, teléfono, correo, empresa y sitio web directamente en los cuadritos del código para que cualquier teléfono guarde el contacto incluso sin conexión a internet. Un link editable apunta a una dirección corta que permite cambiar la página de destino después de imprimir.",
  },
  {
    q: "¿Se puede llevar el QR vCard en la pantalla de bloqueo del celular?",
    a: "Sí. Descargar el PNG de 2000px o 3000px con marco permite guardarlo en favoritos o fondo de bloqueo para compartir datos al instante en reuniones y exposiciones.",
  },
  {
    q: "¿Cuántos datos conviene incluir en una tarjeta de presentación impresa?",
    a: "Mientras más texto se agregue, más pequeños se vuelven los módulos del QR. En una tarjeta impresa estándar, incluir Nombre, Puesto, Empresa, Teléfono, Correo y un Sitio Web mantiene el código limpio y rápido de leer.",
  },
  {
    q: "¿Se pueden generar códigos QR para todo un equipo en un solo archivo?",
    a: "Sí. En Personalizar → Opciones → Lotes se pueden pegar hasta 50 filas y descargar un paquete ZIP con todos los PNGs, SVGs vectoriales y un archivo manifest.csv para imprenta.",
  },
];

export default function VCardEsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/vcard";
  const title =
    "Generador de Código QR vCard Gratis para Tarjetas de Presentación | QRBuddy";
  const description =
    "Crea un código QR vCard 3.0 para tarjetas de presentación que guarda el contacto directo en iPhone y Android sin internet. Exportación SVG vectorial y PNG 3000px gratis.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/vcard"
        ogTitle="Generador QR vCard para Tarjetas de Presentación — SVG Vectorial Gratis"
        ogImageAlt="Código QR vCard para tarjetas de presentación y contacto"
        themeColor="#3C096C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Generador de QR vCard"
        applicationCategory="BusinessApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Generador gratuito de códigos QR vCard 3.0 con exportación SVG vectorial; Pasaporte opcional por A$49"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Tarjetas y Credenciales"
        title="Un Escaneo Guarda el Contacto."
        tagline="Arma un código QR vCard 3.0 que funciona sin internet para tarjetas de presentación, gafetes y pantallas de bloqueo."
        subtagline="Completa los datos abajo: la matriz QR se actualiza al instante lista para exportar en SVG vectorial de imprenta o PNG."
        defaultStyle="grape"
        defaultCaption="GUARDAR CONTACTO"
        toolPreset="vcard"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Hecho para Papelería Impresa, Gafetes y Networking"
        faqTitle="Preguntas sobre Códigos QR vCard"
        valueCards={VALUE_CARDS}
        comparisonTitle="Estudio vCard Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los códigos vCard directos son gratis para siempre; el Pasaporte amplía links editables y envíos"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
