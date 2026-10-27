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
    icon: "📦",
    tag: "Caja + Celular",
    title: "Un Código para Caja y Cliente",
    desc:
      "Combina el código de barras de caja con enlaces web de producto, lote y fecha de caducidad en un solo código 2D limpio.",
  },
  {
    icon: "✅",
    tag: "Cero Errores",
    title: "Verificador de Dígito en Vivo",
    desc:
      "Detecta errores de captura en el código de barras al instante y corrige el último dígito verificador con un clic antes de imprimir.",
  },
  {
    icon: "⚡",
    tag: "Ruteo por Lote",
    title: "Actualiza Certificados sin Reimprimir",
    desc:
      "Conecta el empaque a enlaces editables para renovar análisis de laboratorio, ingredientes o recetas sin cambiar etiquetas.",
  },
  {
    icon: "📐",
    tag: "Pre-Prensa Lista",
    title: "SVG Vectorial y Paquetes ZIP de 50 SKUs",
    desc:
      "Descarga curvas SVG limpias para Illustrator o genera hasta 50 códigos de producto de un jalón con manifest.csv para imprenta.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Constructor GS1 + Validador de Dígito",
    free: "Ilimitado · Dura para siempre ($0)",
    supporter: "Incluido",
  },
  {
    feature: "SVG Vectorial y PNG 3000px de Etiqueta",
    free: "Gratis con contraste verificado",
    supporter: "Incluido",
  },
  {
    feature: "Paquetes ZIP por Lote (PNG + SVG + CSV)",
    free: "Hasta 50 SKUs por ZIP gratis",
    supporter: "Incluido",
  },
  {
    feature: "Links Editables de Producto y Lote",
    free: "5 links editables gratis incluidos",
    supporter: "100 links editables + CSV de 90 días",
  },
  {
    feature: "Certificados y Fichas Técnicas PDF",
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
    q: "¿Qué es la iniciativa GS1 Sunrise 2027 para empaques y etiquetas?",
    a: "GS1 Sunrise 2027 es la transición global del comercio minorista desde los códigos de barras lineales 1D (UPC/EAN) hacia códigos QR 2D con estructura GS1 Digital Link. Un solo código QR en el envase permite cobrar en caja leyendo el GTIN (01) y, al mismo tiempo, abrir información del producto, lote o trazabilidad cuando el consumidor lo escanea con su celular.",
  },
  {
    q: "¿Cómo se estructura una dirección GS1 Digital Link?",
    a: "Combina el dominio web de la marca con Identificadores de Aplicación (AI) en la ruta: /01/{GTIN-14} seguido de datos opcionales como /10/{Lote}, /21/{Serie} y /17/{AAMMDD-Caducidad}. Los códigos EAN-13 o UPC-12 se rellenan con ceros a la izquierda hasta completar 14 dígitos.",
  },
  {
    q: "¿Cómo evita errores de imprenta el validador Mod-10?",
    a: "El último número de todo código GTIN/EAN/UPC es un dígito verificador calculado con el algoritmo Mod-10. Si hay un error de captura antes de imprimir miles de etiquetas, los lectores de punto de venta rechazarán el código. QRBuddy verifica el dígito en tiempo real y ofrece corregirlo con un clic.",
  },
  {
    q: "¿Pueden marcas independientes de alimentos, café, vino o cosmética usarlo gratis?",
    a: "Sí. Crear códigos GS1 Digital Link estáticos y descargar vectores SVG o paquetes ZIP de hasta 50 SKUs es 100% gratuito. Si la marca desea administrar hasta 100 enlaces dinámicos editables con analíticas de escaneo de 90 días, el Pasaporte anual cuesta A$49 (~$32 USD) sin rentas mensuales.",
  },
];

export default function Gs1EsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/gs1";
  const title =
    "Generador QR GS1 Sunrise 2027 Digital Link (GTIN, Lote y Caducidad) | QRBuddy";
  const description =
    "Generador gratuito de códigos QR 2D GS1 Digital Link (/01/GTIN/10/LOTE/17/EXP) con validación Mod-10 en vivo, exportación SVG vectorial y lotes ZIP para empaques.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/gs1"
        ogTitle="Constructor QR GS1 Sunrise 2027 Digital Link — Validador GTIN y SVG"
        ogImageAlt="Generador de códigos QR 2D GS1 Digital Link para empaques y etiquetas"
        themeColor="#1B4332"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Constructor GS1 Digital Link"
        applicationCategory="BusinessApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Constructor gratuito de códigos GS1 Digital Link con validación Mod-10 y exportación SVG vectorial"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Empaques GS1 Sunrise 2027"
        title="Códigos 2D para Empaques."
        titleHighlight="Hechos para Marcas Independientes."
        tagline="Genera rutas estándar /01/GTIN/10/LOTE/17/EXP con validación Mod-10 en vivo y descarga SVG vectorial listo para imprenta."
        subtagline="Ingresa el dominio de marca, código GTIN, lote y caducidad abajo: descarga el vector directo o activa Editable para rutear escaneos."
        defaultStyle="matcha"
        defaultCaption="INFO PRODUCTO"
        toolPreset="gs1"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Diseñado para Alimentos, Bebidas, Café, Vino y Cosmética"
        faqTitle="Preguntas sobre GS1 Sunrise 2027 y Empaques"
        valueCards={VALUE_CARDS}
        comparisonTitle="Constructor GS1 Gratis y Pasaporte QRBuddy"
        comparisonSubtitle="Los vectores GS1 directos y lotes ZIP son gratis; el Pasaporte suma 100 redirecciones editables y analíticas"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
