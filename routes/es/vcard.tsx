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
    tag: "En Un Toque",
    title: "Directo a la Agenda del Celular",
    desc:
      "Un escaneo abre la ficha nativa de 'Agregar contacto' en iPhone y Android con nombre, teléfono, correo y sitio web listos.",
  },
  {
    icon: "✈️",
    tag: "100% Sin Señal",
    title: "Funciona sin Internet en Eventos",
    desc:
      "Las tarjetas de contacto directas no dependen de Wi-Fi ni señal celular en ferias o congresos: los datos viven en el código impreso.",
  },
  {
    icon: "⚡",
    tag: "Opción Editable",
    title: "Combínalo con un Link Editable",
    desc:
      "Actualiza el portafolio o puesto de trabajo después de imprimir 500 tarjetas activando la opción de enlace editable.",
  },
  {
    icon: "📐",
    tag: "Papel y Pantalla",
    title: "Nítido en Papel o Pantalla de Bloqueo",
    desc:
      "Descarga SVG vectorial real para imprenta profesional o guarda un PNG de 3000px con marco para la pantalla de bloqueo.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "QR de Contacto Directo (vCard)",
    free: "Ilimitado · Funciona sin internet ($0)",
    supporter: "Incluido",
  },
  {
    feature: "Archivos SVG Vectorial y PNG 3000px",
    free: "Gratis con paletas y logo central",
    supporter: "Incluido + lotes ZIP de 50 tarjetas",
  },
  {
    feature: "Links Editables de Portafolio o Bio",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + stats de 90 días",
  },
  {
    feature: "Envío de Catálogos o Press Kits",
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
        title="Tarjetas de Contacto Digitales."
        titleHighlight="Guardadas en un Escaneo."
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
