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
    title: "Un QR para el menú",
    desc:
      "Crea un QR estático para un PDF o sitio web, o usa un QR editable si quieres poder cambiar el destino.",
  },
  {
    icon: "🔗",
    title: "Elige cómo funciona el enlace",
    desc:
      "Los QR estáticos codifican el destino directamente. Los editables usan el servicio de redirección de QRBuddy y pueden tener límites de escaneos o vencimiento.",
  },
  {
    icon: "🎨",
    title: "Combínalo con tu local",
    desc:
      "Elige colores, añade un logo y descarga un PNG o SVG para mesas y ventanas.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos",
    free: "Ilimitados; el destino queda codificado en el QR",
    supporter: "Incluidos",
  },
  {
    feature: "Códigos QR editables",
    free: "Disponibles dentro de los límites gratuitos",
    supporter: "Límites de creación más amplios",
  },
  {
    feature: "Subida de archivos",
    free: "Hasta 50 MB por archivo; los enlaces vencen a los 30 días",
    supporter: "Hasta 500 MB por archivo; los enlaces vencen a los 30 días",
  },
  {
    feature: "Pase Supporter",
    free: "No hace falta comprarlo",
    supporter: "A$49 por 365 días; un pago, sin renovación automática",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Puedo cambiar el enlace del menú sin reimprimir el QR?",
    a: "Sí, si creas un QR editable y conservas su enlace privado de edición. Un QR estático no se puede cambiar porque el destino está codificado en la imagen.",
  },
  {
    q: "¿Qué pasa cuando vence el Pase Supporter?",
    a: "El pase termina después de 365 días y no se renueva automáticamente. Las funciones gratuitas siguen disponibles. Los QR editables tienen sus propios límites de escaneos y vencimiento, y dependen del servicio de redirección de QRBuddy.",
  },
  {
    q: "¿Puedo enlazar un PDF, sitio web o página de pedidos?",
    a: "Sí. Puedes enlazar directamente a un archivo PDF, tu sitio web o la página de pedidos que uses.",
  },
  {
    q: "¿Puedo limitar los escaneos o fijar una fecha de vencimiento?",
    a: "Los QR editables permiten configurar un límite de escaneos o una fecha de vencimiento. El servicio de redirección también aplica controles de uso; QRBuddy no promete escaneos ilimitados.",
  },
];

export default function MenusEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/menus";
  const title = "Códigos QR para Menús de Restaurantes | QRBuddy";
  const description =
    "Crea códigos QR con estilo para menús, pedidos y sitios web. Elige un QR estático o un enlace editable. Hay funciones gratuitas; el Pase Supporter amplía algunos límites.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/menus"
        ogTitle="Códigos QR para Menús — QRBuddy"
        ogImageAlt="Códigos QR con estilo para menús de restaurantes"
        themeColor="#2E7D32"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy para Menús de Restaurantes"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pase Supporter: A$49 por 365 días, un pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Restaurantes y cafeterías"
        title="Códigos QR para menús fáciles de actualizar."
        tagline="Crea códigos con estilo o enlaces editables para menús y pedidos en línea."
        subtagline="Guarda el enlace privado de edición del QR editable para cambiar el destino sin reimprimir."
        defaultStyle="matcha"
        defaultUrl="https://tu-restaurante.com/menu.pdf"
        defaultCaption="MENÚ"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="Códigos QR para tu restaurante"
        faqTitle="Preguntas frecuentes sobre menús QR"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy gratis y el Pase Supporter"
        comparisonSubtitle="Funciones incluidas y límites más amplios"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pase Supporter ✨"
      />
    </>
  );
}
