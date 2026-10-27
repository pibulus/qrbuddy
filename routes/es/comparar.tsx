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
    icon: "🔒",
    title: "Los QRs estáticos nunca caducan",
    desc:
      "Al crear un QR estático, el enlace queda grabado directamente en la matriz gráfica. No pasa por servidores intermediarios y funciona para siempre.",
  },
  {
    icon: "⚡",
    title: "Links editables sin rentas mensuales",
    desc:
      "Incluye hasta 5 códigos QR dinámicos editables gratis, o desbloquea 100 códigos editables y analíticas de 90 días con el Pasaporte anual (~$32 USD / A$49).",
  },
  {
    icon: "🎨",
    title: "SVG vectorial y contraste verificado",
    desc:
      "Descarga SVG vectorial real y PNG de hasta 3000px con verificación de contraste WCAG en vivo, logo central y paquetes ZIP listos para imprenta.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Códigos QR estáticos",
    free: "Suelen cambiarse por redirecciones ocultas de prueba de 7 a 14 días",
    supporter:
      "Ilimitados, codificados directo en la imagen, duran siempre ($0)",
  },
  {
    feature: "Códigos editables (dinámicos) gratis",
    free: "Se desactivan a los 7–14 días si no pagas suscripción mensual",
    supporter: "5 códigos editables permanentes incluidos gratis ($0)",
  },
  {
    feature: "Costo anual por funciones Pro",
    free: "$180 a $420 USD al año ($15–$35 USD/mes recurrentes)",
    supporter:
      "~$32 USD (A$49) un solo pago por 365 días — sin cobro automático",
  },
  {
    feature: "Registro y tarjeta obligatoria",
    free: "Piden crear cuenta antes de descargar vectores",
    supporter: "Cero muros de registro — descarga PNG y SVG al instante",
  },
  {
    feature: "Ruteo inteligente y portadas",
    free: "Bloqueado en planes empresariales de $35+/mes",
    supporter: "Horarios de menú, desvío iOS/Android y portadas incluidas",
  },
  {
    feature: "Envío de archivos y música",
    free: "Alojar PDF o MP3 exige plan mensual de pago",
    supporter: "Galerías de fotos, mixtapes de audio y envíos de hasta 500 MB",
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
        badge="Comparativa Honesta"
        title="Sin trampas de 14 días. Sin rentas de $35 al mes."
        tagline="Reemplaza los códigos QR que caducan tras imprimir con códigos estáticos permanentes o enlaces editables justos."
        subtagline="Prueba el estudio en vivo aquí abajo: descarga PNG para imprenta y SVG vectorial real al instante y sin crear cuenta."
        defaultStyle="sunset"
        defaultUrl="https://qrbuddy.app/es"
        defaultCaption="ESCANÉAME"
        homeUrl="/es"
        homeLabel="← Volver al inicio"
        featuresTitle="Cómo QRBuddy resuelve la trampa de los QRs"
        faqTitle="Preguntas frecuentes al cambiar de plataforma"
        valueCards={VALUE_CARDS}
        comparisonTitle="QRBuddy frente a las 'pruebas gratis' trampa"
        comparisonSubtitle="Comparativa directa frente a QR.io, QRFY, Bitly y QR-Code-Generator"
        comparisonColumns={{
          feature: "Lo que importa",
          col1: "Sitios QR de 'prueba gratis'",
          col2: "QRBuddy y Pasaporte 🛂",
        }}
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy (~$32/año) 🛂✨"
      />
    </>
  );
}
