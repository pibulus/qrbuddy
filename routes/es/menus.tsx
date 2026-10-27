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
    icon: "📜",
    tag: "Sin Reimprimir",
    title: "Cambia la Carta cuando Quieras",
    desc:
      "Imprime los acrílicos de mesa una sola vez. Actualiza enlaces de temporada, precios o especiales en segundos sin tocar el código.",
  },
  {
    icon: "🕰️",
    tag: "Horario Automático",
    title: "Cambio de Desayuno a Cena",
    desc:
      "Un mismo código en la mesa abre la carta de cafetería por la mañana y pasa al menú de cenas o coctelería por la noche.",
  },
  {
    icon: "🍷",
    tag: "Luz Tenue",
    title: "Lectura Rápida con Luz de Vela",
    desc:
      "Cada paleta está calibrada con alto contraste para que las cámaras lean a la primera en comedores con luz cálida o terrazas.",
  },
  {
    icon: "📐",
    tag: "SVG de Imprenta",
    title: "Listo para Acrílicos, Madera y Papel",
    desc:
      "Descarga SVG vectorial real o PNG de 3000px con logo central — además de paquetes ZIP para numerar hasta 50 mesas de un jalón.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR Directos de Menú",
    free: "Ilimitados · Dura para siempre ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Links Editables de Menú",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + horarios",
  },
  {
    feature: "Subida de Cartas en PDF",
    free: "Archivos de hasta 50 MB",
    supporter: "Archivos de hasta 500 MB + sin marca",
  },
  {
    feature: "Estadísticas y Hora Pico",
    free: "Contador total de escaneos",
    supporter: " Tendencias de 90 días, hora pico y CSV",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "$0 · Sin cuenta necesaria",
    supporter: "~$32 USD (A$49) / año · Sin cobro automático",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Se puede cambiar el enlace del menú sin volver a imprimir los códigos de las mesas?",
    a: "Sí. Activa el botón 'Editable tras imprimir + Stats' debajo del enlace antes de descargar. QRBuddy genera un enlace corto editable cuya llave se guarda en el dispositivo y en el Pasaporte de 4 palabras para actualizar el destino cuando cambie la carta. Un QR estático graba el enlace directo en la imagen y no puede modificarse tras imprimirse.",
  },
  {
    q: "¿Qué sucede cuando terminan los 365 días del Pasaporte QRBuddy?",
    a: "El Pasaporte dura 365 días y jamás se cobra en automático. Las funciones gratuitas siguen abiertas, los códigos estáticos funcionan por siempre y los enlaces editables gratuitos mantienen su operación dentro de los límites de uso justo.",
  },
  {
    q: "¿Funciona con menús en PDF, Google Drive, sitios web o plataformas de pedidos?",
    a: "Sí. Acepta cualquier dirección HTTPS — carta web, PDF en Google Drive o Dropbox, o sistema de pedidos en línea — además de permitir generar lotes ZIP de hasta 50 mesas de un jalón.",
  },
  {
    q: "¿Puede un mismo código QR cambiar entre menú matutino y nocturno automáticamente?",
    a: "Sí. Desde el panel de edición (/edit) de cualquier código editable se puede activar el ruteo por horario para mostrar la carta de cafetería en la mañana y el menú de cenas por la noche.",
  },
];

export default function MenusEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/menus";
  const title =
    "Códigos QR para Menús de Restaurantes y Cafeterías (Sin Renta Mensual) | QRBuddy";
  const description =
    "Crea códigos QR estáticos o editables para menús de restaurantes, bares y cafeterías. Exportación SVG vectorial gratis, horarios automáticos y cero suscripciones trampa.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/menus"
        ogTitle="Códigos QR para Menús de Restaurantes — Sin Rentas Mensuales"
        ogImageAlt="Códigos QR con estilo para menús de restaurantes y cafeterías"
        themeColor="#2E7D32"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Estudio de Menús para Restaurantes"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Restaurantes y Cafeterías"
        title="Códigos QR para Menús."
        titleHighlight="Hechos para el Comedor."
        tagline="Genera códigos estáticos eternos o enlaces editables que cambian del desayuno a la cena sin reimprimir acrílicos."
        subtagline="Pega el enlace del menú abajo: descarga PNG de 3000px o SVG vectorial para imprenta sin crear cuenta."
        defaultStyle="matcha"
        defaultUrl="https://bistro-roma.mx/menu"
        defaultCaption="VER MENÚ"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Hecho para Cafeterías, Restaurantes, Bares e Imprentas"
        faqTitle="Preguntas Frecuentes sobre Menús QR"
        valueCards={VALUE_CARDS}
        comparisonTitle="Estudio Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los códigos estáticos y 5 links editables son gratis; el Pasaporte suma 100 links y analíticas de 90 días"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
