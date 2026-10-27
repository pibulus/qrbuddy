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
    title: "Menús Estáticos o Editables",
    desc:
      "Graba el enlace del menú directamente en un QR estático ($0 para siempre) o activa un enlace editable para actualizar precios y platillos sin reimprimir.",
  },
  {
    icon: "🕰️",
    title: "Ruteo de Desayuno, Comida y Cena",
    desc:
      "Los enlaces editables admiten horarios automáticos: el mismo QR impreso en la mesa muestra desayunos por la mañana y carta de noche al atardecer.",
  },
  {
    icon: "🎨",
    title: "Contraste Verificado y SVG Vectorial",
    desc:
      "Elige una paleta pastel-punk, coloca el logo al centro y descarga PNG de 3000px o SVG vectorial listo para acrílicos de mesa y vitrinas.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos para menú",
    free: "Ilimitados; el destino queda grabado directo en el gráfico ($0)",
    supporter: "Incluidos",
  },
  {
    feature: "Enlaces dinámicos editables",
    free: "5 enlaces editables permanentes incluidos gratis",
    supporter: "100 enlaces editables + ruteo por horario y sistema",
  },
  {
    feature: "Subida de archivos PDF",
    free: "Hasta 50 MB por archivo; vigencia de 30 días",
    supporter: "Archivos individuales de hasta 500 MB; vigencia de 30 días",
  },
  {
    feature: "Analíticas y hora pico de escaneos",
    free: "Contador de escaneos en el panel de edición",
    supporter: "Reporte de Campo de 90 días, horas pico y exportación CSV",
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
        title="Códigos QR para Menús que Nunca Secuestran las Mesas."
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
