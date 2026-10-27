import { Handlers, PageProps } from "$fresh/server.ts";
import VerticalStudio, {
  type ComparisonItem,
  type FAQItem,
  type ValueCard,
} from "../../islands/VerticalStudio.tsx";
import VerticalLandingHead from "../../components/VerticalLandingHead.tsx";
import { getComparisonNavPills } from "../../utils/comparisons.ts";
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
    icon: "⚡",
    title: "Edita el Link Tras Imprimir",
    tag: "5 Gratis · 100 Pro",
    desc:
      "Corrige un enlace, cambia el menú de temporada o alterna Desayuno y Cena sin reimprimir un solo folleto.",
  },
  {
    icon: "📐",
    title: "SVG Vectorial y ZIP por Lotes",
    tag: "Gratis Siempre",
    desc:
      "Descarga SVG vectorial real, PNG de 3000px o paquetes ZIP de 50 códigos con manifiesto CSV en un clic.",
  },
  {
    icon: "📼",
    title: "Mixtapes de 500 MB, Fotos y Notas",
    tag: "Sello QRBuddy",
    desc:
      "Convierte cualquier sticker en un mixtape reproducible, galería de fotos o nota secreta de 1 escaneo.",
  },
  {
    icon: "🔍",
    title: "Escaneo en Bares + Inspector QR",
    tag: "Sin Registro",
    desc:
      "Paletas con contraste bloqueado para cámaras reales. Además: inspecciona QRs callejeros antes de abrirlos.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Precio Anual",
    free: "$348 – $420 / año ($29–$35/mes)",
    supporter: "$0 Gratis · ~$32/año Pasaporte",
  },
  {
    feature: "Apagón al Día 8",
    free: "Desactiva QRs impresos tras la prueba",
    supporter: "Jamás — los códigos siguen vivos",
  },
  {
    feature: "Trampa de Renovación",
    free: "Cargo mensual recurrente",
    supporter: "Cero cobro automático (pase 1 año)",
  },
  {
    feature: "Editar Link Impreso",
    free: "0–2 gratis antes del muro de pago",
    supporter: "5 Gratis siempre · 100 con Pase",
  },
  {
    feature: "SVG Vectorial + ZIP de 50",
    free: "Bloqueado tras plan de $35/mes",
    supporter: "Gratis (SVG + PNG 3000px + CSV)",
  },
  {
    feature: "Horarios de Menú",
    free: "Solo plan empresarial ($199+/mes)",
    supporter: "Desayuno/Cena e iOS/Android",
  },
  {
    feature: "Mixtapes, Fotos y Notas",
    free: "Solo página PDF básica",
    supporter: "Envíos de 500 MB + notas 1-vista",
  },
  {
    feature: "Cuenta y Privacidad",
    free: "Correo obligatorio y spam",
    supporter: "Sin registro (clave de 4 palabras)",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Por qué dejó de funcionar un código QR creado en otra página después de 14 días?",
    a: "Muchos generadores que pagan anuncios en buscadores convierten el código en un enlace 'dinámico' sin avisar claramente y apagan la redirección tras 7 o 14 días de prueba, exigiendo entre $15 y $35 USD al mes para reactivarlo. En QRBuddy los códigos estáticos graban el enlace directo en los cuadritos para que jamás caduquen, y los códigos editables se eligen de forma explícita.",
  },
  {
    q: "¿Se puede rescatar un QR impreso en otra plataforma sin volver a imprimir?",
    a: "Si el código impreso contiene la dirección corta de otro proveedor (como qr.io o qrco.de), solo ese proveedor controla ese enlace. Para el siguiente tiraje de menús, empaques o tarjetas, generar un QR estático directo o un enlace editable transparente en QRBuddy evita volver a depender de rentas mensuales.",
  },
  {
    q: "¿Cómo puede QRBuddy cobrar ~$32 USD al año en lugar de $35 USD al mes?",
    a: "Redirigir un enlace corto y generar vectores cuesta fracciones de centavo en infraestructura moderna. QRBuddy es obra de un desarrollador independiente sin gastos masivos en anuncios ni equipos de ventas corporativos: los códigos estáticos son gratis para siempre y el Pasaporte anual cuesta un pago único de A$49 (~$32 USD) sin renovación automática.",
  },
  {
    q: "¿Qué ocurre cuando terminan los 365 días del Pasaporte QRBuddy?",
    a: "Nunca hay cargos sorpresa. Al cumplirse los 365 días, el Pasaporte simplemente termina a menos que se decida renovarlo manualmente. Los códigos estáticos siguen funcionando para siempre y los enlaces editables gratuitos conservan su operación normal.",
  },
];

export default function CompararEspanolPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/comparar";
  const title =
    "QRBuddy vs Bitly, QR.io y QRFY — Alternativa sin QRs Secuestrados | QRBuddy";
  const description =
    "Compara QRBuddy frente a los generadores de QR de $35/mes. Crea códigos QR estáticos permanentes gratis o consigue 100 códigos dinámicos editables, SVG vectorial y analíticas por ~$32 USD al año sin renovación automática.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/compare"
        ogTitle="QRBuddy vs Generadores con Suscripción — Cero Links Secuestrados"
        ogImageAlt="Comparativa de QRBuddy frente a generadores de códigos QR con suscripción mensual"
        themeColor="#fbf1e4"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="Comparativa Honesta QRBuddy"
        applicationCategory="BusinessApplication"
        price="49"
        priceCurrency="AUD"
        offerDescription="Pasaporte QRBuddy: A$49 (~$32 USD) por 365 días, un solo pago sin renovación automática"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Cero Rentas Trampa"
        title="Rompe la factura de $35/mes. QRs libres para siempre."
        tagline="Códigos directos gratis para siempre. Links editables, SVG vectorial, ZIP por lotes y mixtapes de 500 MB — hechos para imprenta."
        subtagline="Genera un QR permanente aquí abajo: descarga PNG 3000px o SVG vectorial al instante y sin crear cuenta."
        defaultStyle="sunset"
        defaultUrl="https://qrbuddy.app/es"
        defaultCaption="ESCANÉAME"
        navPills={getComparisonNavPills("es", "all")}
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="El 80/20 que importa + El sello único de QRBuddy"
        faqTitle="Preguntas frecuentes al cambiar de plataforma"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy vs. Los Gigantes del QR Secuestrado"
        comparisonSubtitle="Sin pagar $420 al año solo por redirigir un enlace"
        qrbuddyFirst
        comparisonColumns={{
          feature: "Capacidad",
          col1: "Bitly / QR.io / QRFY",
          col2: "QRBuddy (Gratis + Pasaporte)",
        }}
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy (~$32/año) 🛂✨"
      />
    </>
  );
}
