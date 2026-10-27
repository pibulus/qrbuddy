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
    icon: "🛡️",
    title: "Esclusa Sin Apertura Automática",
    desc:
      "Las cámaras nativas suelen abrir redirecciones con un solo toque. La esclusa decodifica primero el contenido bruto en memoria sin abrir ninguna página por sorpresa.",
  },
  {
    icon: "🕵️",
    title: "Desenmascara Links Cortos Ocultos",
    desc:
      "Cuando una etiqueta se esconde tras bit.ly, t.co, tinyurl o qr.ae, el inspector sigue hasta 5 saltos de redirección y muestra el dominio final real.",
  },
  {
    icon: "📶",
    title: "Analiza Wi-Fi, vCard y Mensajes SMS",
    desc:
      "Muestra de forma clara el contenido estructurado de cualquier QR: nombre de red Wi-Fi, tipo de seguridad, tarjetas de contacto o comandos SMS antes de ejecutar nada.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Cuarentena sin apertura automática",
    free:
      "Incluida — decodifica en una esclusa visual antes de abrir pestañas ($0)",
    supporter: "Incluido",
  },
  {
    feature: "Desenmascarado de links cortos",
    free: "Sigue hasta 5 saltos de redirección (bit.ly, tinyurl, qr.ae, etc.)",
    supporter: "Incluido",
  },
  {
    feature: "Escaneo por cámara o captura de pantalla",
    free:
      "100% local en el navegador; las imágenes nunca salen del dispositivo",
    supporter: "Incluido",
  },
  {
    feature: "Inspector de datos estructurados",
    free:
      "Muestra cadenas reales de Wi-Fi, vCard, mailto, tel y GS1 Digital Link",
    supporter: "Incluido",
  },
  {
    feature: "Pasaporte QRBuddy",
    free: "Sin compra necesaria para escanear o inspeccionar",
    supporter:
      "~$32 USD (A$49) una vez por 365 días para 100 links editables y envíos de 500 MB",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Qué es el 'quishing' (phishing con QR) y cómo lo detiene la esclusa?",
    a: "El quishing ocurre cuando alguien pega una etiqueta QR falsa sobre un parquímetro, menú de restaurante o cartel en la calle, ocultando una web fraudulenta tras un acortador de URL. La esclusa de QRBuddy decodifica el texto localmente y rastrea las redirecciones sin cargar ni ejecutar la página de destino en el navegador.",
  },
  {
    q: "¿Se suben a algún servidor las capturas de pantalla o el video de la cámara?",
    a: "Jamás. Tanto los cuadros de la cámara como las capturas de pantalla se decodifican 100% en la memoria del navegador mediante JavaScript local. Solo cuando aparece un link acortado se consultan los encabezados de redirección para revelar el destino final.",
  },
  {
    q: "¿Puede el inspector revelar a dónde lleva un link de bit.ly o tinyurl?",
    a: "Sí. Al detectar un dominio acortador conocido (como bit.ly, t.co, tinyurl.com, qr.ae, qrco.de o shorturl.at) — o al pegar cualquier enlace en la barra del inspector — QRBuddy sigue hasta 5 saltos HTTP y muestra el dominio final con claridad.",
  },
  {
    q: "¿Tiene algún costo o requiere cuenta el Inspector Seguro de QR?",
    a: "No. El escáner e inspector de enlaces de QRBuddy es 100% gratuito para siempre, sin registro, sin instalar aplicaciones y sin rastreadores.",
  },
];

export default function EscanearEsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/escanear";
  const title =
    "Escáner de Código QR Seguro e Inspector de Links Ocultos Gratis | QRBuddy";
  const description =
    "Escanea códigos QR de la calle o sube una captura de pantalla sin abrir el enlace automáticamente. Desenmascara redirecciones bit.ly y tinyurl y revisa el destino real en una esclusa segura.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/inspect"
        ogTitle="Escáner Seguro de Códigos QR e Inspector de Redirecciones — Sin Apertura Automática"
        ogImageAlt="Esclusa segura de QRBuddy revelando el destino real de un código QR"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Escáner Seguro de QR e Inspector de Links"
        applicationCategory="SecurityApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Escáner gratuito de códigos QR en el navegador, lector de capturas e inspector de redirecciones"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Esclusa Segura Anti-Quishing"
        title="Mira Qué Esconde Cualquier QR Antes de Abrirlo."
        tagline="Escanea un cartel en la calle con la cámara, sube una captura o pega un link corto sospechoso. La esclusa revela el destino real manteniendo el navegador a salvo."
        subtagline="Prueba abajo el desenmascarador de links cortos en vivo o abre el escáner de cámara y capturas — 100% gratis y sin instalar apps."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/es?inspect=1"
        defaultCaption="ESCANEO SEGURO"
        toolPreset="inspect"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Ideal para Parquímetros, Carteles en la Calle, Menús y Capturas"
        faqTitle="Preguntas sobre Escaneo Seguro de QR y Anti-Quishing"
        valueCards={VALUE_CARDS}
        comparisonTitle="Esclusa Segura Gratis y Estudio QRBuddy"
        comparisonSubtitle="El escaneo, la lectura de capturas y el desenmascarado de links son 100% gratis para siempre"
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
