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
    tag: "Nada Se Abre Solo",
    title: "Frena Etiquetas Falsas",
    desc:
      "A veces pegan códigos falsos sobre parquímetros o menús. Revisa el sitio web real y su título antes de decidir entrar.",
  },
  {
    icon: "🕵️",
    tag: "Hasta 5 Saltos",
    title: "Revela Links Cortos Ocultos",
    desc:
      "Enlaces como bit.ly o tinyurl esconden a dónde llevan. Desenrolla toda la cadena en un clic para ver el dominio final.",
  },
  {
    icon: "📸",
    tag: "100% En Dispositivo",
    title: "Lee Capturas en Privado",
    desc:
      "Sube una captura de pantalla de WhatsApp, correo o cartel. La imagen se lee dentro del navegador y jamás se sube a un servidor.",
  },
  {
    icon: "📶",
    tag: "Texto Claro",
    title: "Lee Redes Wi-Fi y Contactos",
    desc:
      "Muestra el nombre exacto de la red Wi-Fi, la contraseña, el teléfono o la tarjeta de contacto antes de unirse a la red.",
  },
];

const COMPARISON_ITEMS: ComparisonItem[] = [
  {
    feature: "Etiquetas en la Calle",
    free: "Suele abrir el link al primer toque",
    supporter: "Vista previa segura · No abre solo",
  },
  {
    feature: "Links Cortos (bit.ly / tinyurl)",
    free: "Sigue la redirección a ciegas",
    supporter: "Revela hasta 5 saltos ocultos",
  },
  {
    feature: "Escanear desde Capturas",
    free: "Incómodo o sube la foto",
    supporter: "Suelta cualquier imagen · 100% local",
  },
  {
    feature: "Datos de Wi-Fi y Contacto",
    free: "Oculta la clave o los campos",
    supporter: "Muestra texto y clave en claro",
  },
  {
    feature: "Anuncios e Instalar Apps",
    free: "Apps con anuncios o cobros semanales",
    supporter: "$0 · Gratis siempre en navegador",
  },
  {
    feature: "Estudio de Creación QR",
    free: "Solo escáner",
    supporter: "Estudio completo + Pase ~$32/año",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "¿Por qué es riesgoso escanear códigos QR callejeros con la cámara normal?",
    a: "A veces pegan etiquetas QR falsas sobre parquímetros, menús o carteles ocultando una página fraudulenta tras un acortador de enlaces. QRBuddy muestra primero a dónde lleva el código y desenmascara los links cortos sin abrir la página por sorpresa.",
  },
  {
    q: "¿Se suben a algún servidor las capturas de pantalla o el video de la cámara?",
    a: "Jamás. Tanto la cámara como las capturas de pantalla se leen 100% dentro del navegador en el propio dispositivo. Solo cuando un código contiene un link corto se consulta a dónde redirige esa dirección.",
  },
  {
    q: "¿Puede el escáner mostrar a dónde lleva un link de bit.ly o tinyurl?",
    a: "Sí. Al detectar un acortador conocido (como bit.ly, t.co, tinyurl.com, qr.ae, qrco.de o shorturl.at) — o al pegar cualquier enlace en la barra — QRBuddy sigue hasta 5 redirecciones y muestra el sitio web final.",
  },
  {
    q: "¿Tiene algún costo o requiere cuenta el Escáner Seguro de QR?",
    a: "No. Escanear códigos QR, leer capturas de pantalla y revelar links cortos es 100% gratis para siempre, sin registro, sin instalar aplicaciones y sin anuncios.",
  },
];

export default function EscanearEsPage({ data }: PageProps<PageData>) {
  const canonicalUrl = "https://qrbuddy.app/es/escanear";
  const title =
    "Escáner de Código QR Seguro y Lector de Capturas Gratis | QRBuddy";
  const description =
    "Mira a dónde lleva cualquier código QR antes de abrirlo. Escanea carteles con la cámara, sube una captura de pantalla o revela links cortos bit.ly y tinyurl gratis.";

  return (
    <>
      <VerticalLandingHead
        lang="es"
        canonicalUrl={canonicalUrl}
        title={title}
        description={description}
        altLang="en"
        altHref="https://qrbuddy.app/for/inspect"
        ogTitle="Escáner Seguro de Códigos QR — Mira A Dónde Lleva Antes de Abrirlo"
        ogImageAlt="Escáner seguro de QRBuddy mostrando el sitio web real detrás de un código QR"
        themeColor="#0B4F6C"
        supabaseUrl={data?.supabaseUrl}
        jsonLdName="QRBuddy Escáner Seguro de QR e Inspector de Links"
        applicationCategory="SecurityApplication"
        price="0"
        priceCurrency="AUD"
        offerDescription="Escáner gratuito de códigos QR en el navegador, lector de capturas y verificador de redirecciones"
        faqItems={FAQ_ITEMS}
      />

      <VerticalStudio
        lang="es"
        badge="Escáner Seguro de QR 🛡️"
        title="Mira A Dónde Va Cualquier QR."
        titleHighlight="Antes de Abrirlo."
        tagline="Apunta la cámara a un cartel en la calle, sube una captura o pega un link corto para ver la página real que esconde — antes de que se abra nada."
        subtagline="Prueba abajo el revelador de links cortos en vivo o abre el escáner de cámara y capturas — 100% gratis y sin instalar apps."
        defaultStyle="pool"
        defaultUrl="https://qrbuddy.app/es?inspect=1"
        defaultCaption="ESCANEO SEGURO"
        toolPreset="inspect"
        homeUrl="/es"
        homeLabel="← Volver al estudio"
        featuresTitle="Ideal para Parquímetros, Carteles, Menús y Capturas de Pantalla"
        faqTitle="Preguntas sobre Escaneo Seguro de QR"
        valueCards={VALUE_CARDS}
        comparisonTitle="Escáner Seguro QRBuddy vs. Cámara Normal"
        comparisonSubtitle="Revisa cualquier código QR o link corto sin abrirlo a ciegas — 100% gratis para siempre"
        comparisonColumns={{
          feature: "Lo que importa",
          col1: "Cámara Normal / Apps de Escaneo",
          col2: "Escáner Seguro QRBuddy",
        }}
        qrbuddyFirst
        comparisonItems={COMPARISON_ITEMS}
        faqItems={FAQ_ITEMS}
        ctaLabel="Obtener Pasaporte QRBuddy 🛂✨"
      />
    </>
  );
}
