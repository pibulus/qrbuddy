/**
 * Competitor Comparison & "Day-8 Refugee" Rescue Data (`utils/comparisons.ts`)
 *
 * Powers `/compare`, `/es/comparar`, `/vs/[slug]`, and `/es/vs/[slug]`.
 * Written in strict Sovereign Voice: zero "you/your", zero royal "we/us",
 * zero interrogative UI headers, cognitively ergonomic 2-6 word table cells.
 */

import type {
  ComparisonItem,
  FAQItem,
  ValueCard,
} from "../islands/VerticalStudio.tsx";
import type { QR_STYLES } from "./qr-styles.ts";

export type CompetitorSlug =
  | "qrio"
  | "qrfy"
  | "bitly"
  | "qr-code-generator";

export interface CompetitorLocaleContent {
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogImageAlt: string;
  jsonLdName: string;
  badge: string;
  title: string;
  tagline: string;
  subtagline: string;
  defaultCaption: string;
  featuresTitle: string;
  faqTitle: string;
  comparisonTitle: string;
  comparisonSubtitle: string;
  comparisonColumns: {
    feature: string;
    col1: string;
    col2: string;
  };
  valueCards: ValueCard[];
  comparisonItems: ComparisonItem[];
  faqItems: FAQItem[];
  ctaLabel: string;
}

export interface CompetitorEntry {
  slug: CompetitorSlug;
  brandName: string;
  defaultStyle: keyof typeof QR_STYLES;
  en: CompetitorLocaleContent;
  es: CompetitorLocaleContent;
}

export const COMPETITOR_SLUGS: CompetitorSlug[] = [
  "qrio",
  "qrfy",
  "bitly",
  "qr-code-generator",
];

export function isValidCompetitorSlug(slug: string): slug is CompetitorSlug {
  return (COMPETITOR_SLUGS as string[]).includes(slug);
}

export interface NavPillItem {
  href: string;
  label: string;
  active: boolean;
}

export function getComparisonNavPills(
  lang: "en" | "es",
  activeSlug?: CompetitorSlug | "all",
): NavPillItem[] {
  const current = activeSlug ?? "all";
  if (lang === "es") {
    return [
      {
        href: "/es/comparar",
        label: "Panorama General",
        active: current === "all",
      },
      {
        href: "/es/vs/qrio",
        label: "vs. QR.io",
        active: current === "qrio",
      },
      {
        href: "/es/vs/qrfy",
        label: "vs. QRFY",
        active: current === "qrfy",
      },
      {
        href: "/es/vs/bitly",
        label: "vs. Bitly",
        active: current === "bitly",
      },
      {
        href: "/es/vs/qr-code-generator",
        label: "vs. QR Code Generator",
        active: current === "qr-code-generator",
      },
    ];
  }
  return [
    {
      href: "/compare",
      label: "All Comparisons",
      active: current === "all",
    },
    {
      href: "/vs/qrio",
      label: "vs. QR.io",
      active: current === "qrio",
    },
    {
      href: "/vs/qrfy",
      label: "vs. QRFY",
      active: current === "qrfy",
    },
    {
      href: "/vs/bitly",
      label: "vs. Bitly",
      active: current === "bitly",
    },
    {
      href: "/vs/qr-code-generator",
      label: "vs. QR Code Generator",
      active: current === "qr-code-generator",
    },
  ];
}

export const COMPETITORS: Record<CompetitorSlug, CompetitorEntry> = {
  qrio: {
    slug: "qrio",
    brandName: "QR.io",
    defaultStyle: "sunset",
    en: {
      metaTitle:
        "QR.io Alternative (No $35/mo Subscription or Expired Trial QRs) | QRBuddy",
      metaDescription:
        "Replace expired QR.io codes with permanent static QR codes ($0 forever) or transparent editable dynamic links (5 free, or 100 for ~$32/year once with zero auto-renewal).",
      ogTitle: "QR.io Alternative — Replace Expired Trial QR Codes | QRBuddy",
      ogImageAlt: "QRBuddy vs QR.io side-by-side comparison and QR studio",
      jsonLdName: "QRBuddy — QR.io Alternative Without Monthly Subscriptions",
      badge: "QR.io Alternative",
      title: "Replace Expired QR.io Codes. Keep the Print Run Alive.",
      tagline:
        "Direct static QR codes never expire. Editable dynamic links start with 5 free forever — no 7-day trial shutoff, no $35/month bill.",
      subtagline:
        "Paste the destination link below to mint a permanent replacement in 3000px PNG or print-shop Vector SVG.",
      defaultCaption: "SCAN ME",
      featuresTitle: "Why Switchers Leave QR.io for QRBuddy",
      faqTitle: "Common Questions When Leaving QR.io",
      comparisonTitle: "QRBuddy vs. QR.io Side-by-Side",
      comparisonSubtitle:
        "One-time ~$32/yr Passport vs. $35/month ($420/yr) trial funnel",
      comparisonColumns: {
        feature: "Capability",
        col1: "QR.io",
        col2: "QRBuddy (Free + Passport)",
      },
      valueCards: [
        {
          icon: "🔒",
          title: "Direct Static Codes Never Die",
          tag: "Free Forever",
          desc:
            "Static mode bakes the destination URL directly into the QR modules. Zero intermediate server, zero expiration date.",
        },
        {
          icon: "⚡",
          title: "Edit Links After Printing",
          tag: "5 Free · 100 Pass",
          desc:
            "Every device gets 5 permanent editable dynamic QRs at $0, or 100 editable links with the ~$32/yr Passport.",
        },
        {
          icon: "📐",
          title: "Vector SVG & 50-Code Batch ZIP",
          tag: "Zero Paywall",
          desc:
            "Export true Vector SVGs, 3000px PNGs, and print-shop CSV manifests immediately without entering a card.",
        },
        {
          icon: "📼",
          title: "500 MB Mixtapes, Photos & Secrets",
          tag: "Only on QRBuddy",
          desc:
            "Drop audio mixtapes, wedding photo galleries, or 1-scan self-destructing notes right inside a QR code.",
        },
      ],
      comparisonItems: [
        {
          feature: "Annual Cost",
          free: "$420 / year ($35/mo recurring)",
          supporter: "$0 Free · ~$32/yr Passport",
        },
        {
          feature: "7-Day Trial Shutoff",
          free: "Deactivates printed QRs on Day 8",
          supporter: "Never — codes stay alive",
        },
        {
          feature: "Auto-Renewal Trap",
          free: "Recurring monthly card billing",
          supporter: "Zero auto-billing (1-year pass)",
        },
        {
          feature: "Edit Link After Print",
          free: "0 Free after 7-day trial",
          supporter: "5 Free forever · 100 with Pass",
        },
        {
          feature: "Vector SVG + Batch ZIP",
          free: "Locked behind $35/mo plan",
          supporter: "Free (SVG + 3000px PNG + CSV)",
        },
        {
          feature: "Smart Menu Schedules",
          free: "Not included",
          supporter: "Breakfast/Dinner & iOS/Android",
        },
        {
          feature: "Mixtapes, Photos & Secrets",
          free: "Basic PDF page only",
          supporter: "500 MB drops + 1-scan notes",
        },
        {
          feature: "Account Requirement",
          free: "Mandatory email & card wall",
          supporter: "Zero sign-up (4-word passkey)",
        },
      ],
      faqItems: [
        {
          q: "Why did a QR.io code stop scanning after 7 days?",
          a: "QR.io defaults many new creations into hosted dynamic redirects that require a paid subscription ($35/month) once the 7-day trial window closes. In QRBuddy, static codes encode the destination directly into the graphic so they never expire, and the 5 free editable dynamic links have no 7-day trial shutoff.",
        },
        {
          q: "Can an already-printed QR.io graphic be redirected without reprinting?",
          a: "A printed QR code that encodes a qr.io short link points to QR.io's servers, so only QR.io controls that specific short URL. Before ordering the next print run or placing a replacement sticker over the old square, generate a direct static QR or a QRBuddy editable link so the print stays independent.",
        },
        {
          q: "How does QRBuddy keep editable links at ~$32/year instead of $420/year?",
          a: "Routing an HTTP redirect and rendering SVG vectors costs fractions of a cent on edge infrastructure. QRBuddy operates without paid search ad campaigns or recurring subscription traps, pricing the 365-day Passport at a flat A$49 (~$32 USD) with zero auto-renewal.",
        },
      ],
      ctaLabel: "Unlock QRBuddy Passport (~$32/yr) 🛂✨",
    },
    es: {
      metaTitle:
        "Alternativa a QR.io sin Suscripción de $35/mes ni QRs Caducados | QRBuddy",
      metaDescription:
        "Reemplaza códigos de QR.io desactivados por códigos QR estáticos permanentes ($0 gratis siempre) o enlaces dinámicos editables (5 gratis, o 100 por ~$32 USD al año sin cobro automático).",
      ogTitle: "Alternativa a QR.io — Sin QRs Desactivados al Día 8 | QRBuddy",
      ogImageAlt: "Comparativa de QRBuddy frente a QR.io y estudio QR en vivo",
      jsonLdName: "QRBuddy — Alternativa a QR.io sin Rentas Mensuales",
      badge: "Alternativa a QR.io",
      title: "Reemplaza Códigos de QR.io. Salva el Tiraje Impreso.",
      tagline:
        "Los códigos QR estáticos jamás caducan. Los enlaces editables incluyen 5 gratis para siempre — sin apagón a los 7 días ni cobros de $35/mes.",
      subtagline:
        "Pega el enlace de destino abajo para generar un reemplazo permanente en PNG 3000px o SVG vectorial.",
      defaultCaption: "ESCANÉAME",
      featuresTitle: "Por Qué Dejar QR.io por QRBuddy",
      faqTitle: "Preguntas Frecuentes al Dejar QR.io",
      comparisonTitle: "QRBuddy vs. QR.io Cara a Cara",
      comparisonSubtitle:
        "Pase anual único (~$32 USD) frente a suscripción de $35/mes ($420/año)",
      comparisonColumns: {
        feature: "Capacidad",
        col1: "QR.io",
        col2: "QRBuddy (Gratis + Pasaporte)",
      },
      valueCards: [
        {
          icon: "🔒",
          title: "QRs Estáticos que Jamás Mueren",
          tag: "Gratis Siempre",
          desc:
            "El modo estático graba la URL directamente en los módulos del QR. Cero servidores intermedios y cero caducidad.",
        },
        {
          icon: "⚡",
          title: "Edita el Link Tras Imprimir",
          tag: "5 Gratis · 100 Pro",
          desc:
            "Incluye 5 códigos dinámicos editables permanentes por $0, más el Pasaporte anual (~$32 USD) para 100 enlaces.",
        },
        {
          icon: "📐",
          title: "SVG Vectorial y ZIP de 50",
          tag: "Sin Muro de Pago",
          desc:
            "Descarga SVG vectorial real, PNG de 3000px y lotes ZIP al instante sin crear cuenta ni dejar tarjeta.",
        },
        {
          icon: "📼",
          title: "Mixtapes de 500 MB, Fotos y Notas",
          tag: "Sello QRBuddy",
          desc:
            "Comparte mixtapes de audio, galerías de fotos o notas secretas de 1 escaneo directamente desde un QR.",
        },
      ],
      comparisonItems: [
        {
          feature: "Costo Anual",
          free: "$420 / año ($35/mes recurrente)",
          supporter: "$0 Gratis · ~$32/año Pasaporte",
        },
        {
          feature: "Apagón al Día 8",
          free: "Pausa el QR tras 7 días de prueba",
          supporter: "Jamás — los códigos siguen vivos",
        },
        {
          feature: "Trampa de Renovación",
          free: "Cargo mensual automático",
          supporter: "Cero cobro automático (pase 1 año)",
        },
        {
          feature: "Editar Link Impreso",
          free: "0 gratis tras los 7 días",
          supporter: "5 Gratis siempre · 100 con Pase",
        },
        {
          feature: "SVG Vectorial + ZIP de 50",
          free: "Bloqueado tras plan de $35/mes",
          supporter: "Gratis (SVG + PNG 3000px + CSV)",
        },
        {
          feature: "Horarios de Menú",
          free: "No incluido",
          supporter: "Desayuno/Cena e iOS/Android",
        },
        {
          feature: "Mixtapes, Fotos y Notas",
          free: "Solo página PDF básica",
          supporter: "Envíos de 500 MB + notas 1-vista",
        },
        {
          feature: "Cuenta y Registro",
          free: "Correo y tarjeta obligatorios",
          supporter: "Sin registro (clave de 4 palabras)",
        },
      ],
      faqItems: [
        {
          q: "¿Por qué dejó de escanear un código de QR.io después de 7 días?",
          a: "QR.io genera por defecto enlaces dinámicos alojados que exigen una suscripción de $35 USD al mes al terminar los 7 días de prueba. En QRBuddy, los códigos estáticos graban el destino directo en la imagen para no caducar jamás, y los 5 enlaces editables gratuitos no tienen apagón a los 7 días.",
        },
        {
          q: "¿Se puede redirigir un QR de QR.io ya impreso sin volver a imprimir?",
          a: "Si el gráfico impreso codifica una dirección corta propiedad de qr.io, solo ese servidor controla ese enlace. Para el nuevo tiraje o para colocar una etiqueta de reemplazo sobre el código anterior, genera un QR estático directo o un enlace editable en QRBuddy.",
        },
        {
          q: "¿Por qué QRBuddy cuesta ~$32 USD al año en vez de $420 USD al año?",
          a: "Redirigir un enlace corto y generar vectores cuesta fracciones de centavo. QRBuddy opera de forma independiente sin campañas agresivas de anuncios pagados ni cobros mensuales automáticos.",
        },
      ],
      ctaLabel: "Obtener Pasaporte QRBuddy (~$32/año) 🛂✨",
    },
  },

  qrfy: {
    slug: "qrfy",
    brandName: "QRFY",
    defaultStyle: "candy",
    en: {
      metaTitle:
        "QRFY Alternative — Replace Expired Trial QR Codes (No Monthly Fee) | QRBuddy",
      metaDescription:
        "Looking for a QRFY alternative after a 7-day trial deactivated printed QR codes? Generate permanent static QRs ($0 forever) or editable dynamic links (~$32/yr Passport, no auto-renewal).",
      ogTitle:
        "QRFY Alternative — Permanent Static & Fair Dynamic QRs | QRBuddy",
      ogImageAlt: "QRBuddy vs QRFY comparison and live QR studio",
      jsonLdName: "QRBuddy — QRFY Alternative Without Trial Traps",
      badge: "QRFY Alternative",
      title: "Replace Paused QRFY Codes. Zero Monthly Ransom.",
      tagline:
        "QRFY's 7-day trial pauses printed dynamic QRs unless billed monthly. Mint a permanent static QR or transparent editable link below.",
      subtagline:
        "Export print-verified 3000px PNGs and true Vector SVGs immediately — no account wall, no credit card.",
      defaultCaption: "SCAN ME",
      featuresTitle: "Where QRFY and QRBuddy Diverge",
      faqTitle: "Common Questions When Switching From QRFY",
      comparisonTitle: "QRBuddy vs. QRFY Side-by-Side",
      comparisonSubtitle:
        "No $0.99-to-$39/month bait-and-switch — flat annual Passport or $0 free forever",
      comparisonColumns: {
        feature: "Capability",
        col1: "QRFY",
        col2: "QRBuddy (Free + Passport)",
      },
      valueCards: [
        {
          icon: "🛡️",
          title: "Zero Trial Bait-and-Switch",
          tag: "100% Upfront",
          desc:
            "The Static vs. Editable pill sits right below the URL box so print buyers always know what goes into the ink.",
        },
        {
          icon: "📐",
          title: "Free Print-Shop Vector SVG",
          tag: "Free Forever",
          desc:
            "Download razor-sharp Vector SVGs and 3000px PNGs for Adobe Illustrator, Canva, and affinity print layouts at $0.",
        },
        {
          icon: "⚡",
          title: "Smart Menu & Device Routing",
          tag: "5 Free · 100 Pass",
          desc:
            "Route scans by time of day (Breakfast vs. Dinner menus), iOS vs. Android, or A/B percentage splits.",
        },
        {
          icon: "📼",
          title: "500 MB Mixtapes, Photos & Secrets",
          tag: "Only on QRBuddy",
          desc:
            "Turn any sticker into a playable audio mixtape, event photo drop, or self-destructing 1-scan note.",
        },
      ],
      comparisonItems: [
        {
          feature: "Annual Cost",
          free: "$240 – $468 / year",
          supporter: "$0 Free · ~$32/yr Passport",
        },
        {
          feature: "7-Day Trial Shutoff",
          free: "Pauses printed QRs after 7 days",
          supporter: "Never — codes stay alive",
        },
        {
          feature: "Auto-Renewal Trap",
          free: "Intro trial flips to monthly bill",
          supporter: "Zero auto-billing (1-year pass)",
        },
        {
          feature: "Edit Link After Print",
          free: "0 Free after 7-day trial",
          supporter: "5 Free forever · 100 with Pass",
        },
        {
          feature: "Vector SVG + Batch ZIP",
          free: "Requires active subscription",
          supporter: "Free (SVG + 3000px PNG + CSV)",
        },
        {
          feature: "Smart Menu Schedules",
          free: "Not included",
          supporter: "Breakfast/Dinner & iOS/Android",
        },
        {
          feature: "Mixtapes, Photos & Secrets",
          free: "Subscription-locked pages",
          supporter: "500 MB drops + 1-scan notes",
        },
        {
          feature: "Account Requirement",
          free: "Mandatory email & card wall",
          supporter: "Zero sign-up (4-word passkey)",
        },
      ],
      faqItems: [
        {
          q: "Why did a QRFY code stop working a week after printing?",
          a: "QRFY routes new creations through hosted dynamic links that pause after a 7-day trial unless an ongoing subscription is active. In QRBuddy, static codes encode the destination directly into the QR matrix so they work forever, and the 5 free editable dynamic links never shut off after 7 days.",
        },
        {
          q: "How can a business replace a paused QRFY code on printed menus?",
          a: "Generate a permanent static QR or a QRBuddy editable link above, export the Vector SVG or 3000px PNG, and either print a matching vinyl sticker to cover the paused QRFY square or drop the new vector into the print layout for the next run.",
        },
        {
          q: "Does the QRBuddy Passport auto-renew onto a credit card?",
          a: "Never. The QRBuddy Passport is a single A$49 (~$32 USD) payment for 365 days of expanded limits (100 editable links, 500 MB media drops, 90-day scan analytics) with zero automatic billing.",
        },
      ],
      ctaLabel: "Unlock QRBuddy Passport (~$32/yr) 🛂✨",
    },
    es: {
      metaTitle:
        "Alternativa a QRFY — Reemplaza QRs Caducados sin Suscripción | QRBuddy",
      metaDescription:
        "¿Buscas una alternativa a QRFY tras desactivarse un QR impreso? Genera códigos QR estáticos permanentes ($0 gratis) o enlaces editables (~$32 USD/año sin renovación automática).",
      ogTitle:
        "Alternativa a QRFY — Códigos QR Permanentes y Editables | QRBuddy",
      ogImageAlt: "Comparativa de QRBuddy frente a QRFY y estudio QR en vivo",
      jsonLdName: "QRBuddy — Alternativa a QRFY sin Pruebas Trampa",
      badge: "Alternativa a QRFY",
      title: "Reemplaza QRs Pausados de QRFY. Sin Renta Mensual.",
      tagline:
        "La prueba de 7 días de QRFY pausa los códigos dinámicos impresos salvo pago mensual. Genera abajo un QR estático permanente o editable.",
      subtagline:
        "Descarga PNG de 3000px y SVG vectorial al instante — sin crear cuenta ni ingresar tarjeta.",
      defaultCaption: "ESCANÉAME",
      featuresTitle: "Diferencias Clave Entre QRFY y QRBuddy",
      faqTitle: "Preguntas Frecuentes al Dejar QRFY",
      comparisonTitle: "QRBuddy vs. QRFY Cara a Cara",
      comparisonSubtitle:
        "Sin pruebas que se convierten en $39/mes — Pasaporte anual único o $0 gratis",
      comparisonColumns: {
        feature: "Capacidad",
        col1: "QRFY",
        col2: "QRBuddy (Gratis + Pasaporte)",
      },
      valueCards: [
        {
          icon: "🛡️",
          title: "Cero Pruebas Trampa",
          tag: "100% Claro",
          desc:
            "El selector Estático vs. Editable aparece justo debajo del enlace para saber siempre qué va a imprenta.",
        },
        {
          icon: "📐",
          title: "SVG Vectorial Gratis",
          tag: "Gratis Siempre",
          desc:
            "Descarga archivos SVG vectoriales y PNG de 3000px listos para Illustrator, Canva e imprenta por $0.",
        },
        {
          icon: "⚡",
          title: "Rutas por Horario y Dispositivo",
          tag: "5 Gratis · 100 Pro",
          desc:
            "Dirige escaneos por hora del día (menú de desayuno vs. cena), iOS vs. Android o pruebas A/B.",
        },
        {
          icon: "📼",
          title: "Mixtapes de 500 MB, Fotos y Notas",
          tag: "Sello QRBuddy",
          desc:
            "Convierte cualquier sticker en un mixtape reproducible, galería de fotos o nota secreta de 1 escaneo.",
        },
      ],
      comparisonItems: [
        {
          feature: "Costo Anual",
          free: "$240 – $468 / año",
          supporter: "$0 Gratis · ~$32/año Pasaporte",
        },
        {
          feature: "Apagón al Día 8",
          free: "Pausa el QR tras 7 días de prueba",
          supporter: "Jamás — los códigos siguen vivos",
        },
        {
          feature: "Trampa de Renovación",
          free: "Pasa a cobro mensual automático",
          supporter: "Cero cobro automático (pase 1 año)",
        },
        {
          feature: "Editar Link Impreso",
          free: "0 gratis tras los 7 días",
          supporter: "5 Gratis siempre · 100 con Pase",
        },
        {
          feature: "SVG Vectorial + ZIP de 50",
          free: "Exige suscripción activa",
          supporter: "Gratis (SVG + PNG 3000px + CSV)",
        },
        {
          feature: "Horarios de Menú",
          free: "No incluido",
          supporter: "Desayuno/Cena e iOS/Android",
        },
        {
          feature: "Mixtapes, Fotos y Notas",
          free: "Bloqueado tras suscripción",
          supporter: "Envíos de 500 MB + notas 1-vista",
        },
        {
          feature: "Cuenta y Registro",
          free: "Correo y tarjeta obligatorios",
          supporter: "Sin registro (clave de 4 palabras)",
        },
      ],
      faqItems: [
        {
          q: "¿Por qué dejó de funcionar un código de QRFY una semana después de imprimir?",
          a: "QRFY crea por defecto redirecciones dinámicas que se pausan tras 7 días de prueba si no hay una suscripción activa. En QRBuddy los códigos estáticos graban el enlace directo en la imagen para durar siempre, y los 5 enlaces editables gratuitos no se apagan a los 7 días.",
        },
        {
          q: "¿Cómo reemplazar un QR pausado de QRFY en menús ya impresos?",
          a: "Genera arriba un QR estático permanente o un enlace editable de QRBuddy, exporta el SVG vectorial o PNG de 3000px e imprime un sticker del mismo tamaño para cubrir el código anterior o actualiza el archivo de imprenta.",
        },
        {
          q: "¿El Pasaporte QRBuddy hace cargos automáticos cada mes?",
          a: "Nunca. El Pasaporte QRBuddy cuesta un pago único de A$49 (~$32 USD) por 365 días sin renovación automática.",
        },
      ],
      ctaLabel: "Obtener Pasaporte QRBuddy (~$32/año) 🛂✨",
    },
  },

  bitly: {
    slug: "bitly",
    brandName: "Bitly",
    defaultStyle: "pool",
    en: {
      metaTitle:
        "Bitly QR Code Alternative — Free Vector SVG, Gradients & Dynamic Routing | QRBuddy",
      metaDescription:
        "Compare QRBuddy vs. Bitly QR Codes. Get free vector SVG export, print-verified gradients, 5 free permanent dynamic QRs, and 100 editable links for ~$32/year instead of $120–$420/year.",
      ogTitle:
        "Bitly QR Code Alternative — Vector SVG & Editable QRs Without Enterprise Pricing | QRBuddy",
      ogImageAlt: "QRBuddy vs Bitly QR Codes side-by-side comparison",
      jsonLdName: "QRBuddy — Bitly QR Code Alternative",
      badge: "Bitly Alternative",
      title: "Skip the $420/yr Bitly Paywall. Unlock Vector SVGs.",
      tagline:
        "Bitly locks custom colors, Vector SVGs, and redirect edits behind $10–$35/month plans. QRBuddy sets them free.",
      subtagline:
        "Test custom gradients, center logos, and instant Vector SVG export below — zero sign-up required.",
      defaultCaption: "SCAN ME",
      featuresTitle: "Why Creators & Print Shops Switch From Bitly",
      faqTitle: "Bitly vs. QRBuddy Questions",
      comparisonTitle: "QRBuddy vs. Bitly QR Codes",
      comparisonSubtitle:
        "Full-stack print & media studio vs. enterprise link shortener",
      comparisonColumns: {
        feature: "Capability",
        col1: "Bitly QR Codes",
        col2: "QRBuddy (Free + Passport)",
      },
      valueCards: [
        {
          icon: "🎨",
          title: "Free Vector SVGs, Logos & Gradients",
          tag: "Free Forever",
          desc:
            "Bitly restricts free users to basic codes without SVG export. QRBuddy unlocks 8 contrast-locked gradients and SVG export at $0.",
        },
        {
          icon: "⚡",
          title: "Edit Destination URLs Anytime",
          tag: "5 Free · 100 Pass",
          desc:
            "Every browser gets 5 permanent editable dynamic QRs free, and the ~$32/yr Passport unlocks 100 editable links.",
        },
        {
          icon: "🕒",
          title: "Smart Menu & Device Schedules",
          tag: "Included",
          desc:
            "Switch Breakfast/Lunch/Dinner menus by time of day, split iOS vs. Android app links, or run A/B splits.",
        },
        {
          icon: "📼",
          title: "500 MB Mixtapes, Photos & Secrets",
          tag: "Only on QRBuddy",
          desc:
            "Bitly only shortens URLs. QRBuddy hosts playable audio mixtapes, photo galleries, and 1-scan secret notes.",
        },
      ],
      comparisonItems: [
        {
          feature: "Annual Cost",
          free: "$120 – $420 / year",
          supporter: "$0 Free · ~$32/yr Passport",
        },
        {
          feature: "Vector SVG + 3000px PNG",
          free: "Paid plan required for SVG",
          supporter: "Free forever (SVG + PNG)",
        },
        {
          feature: "Custom Colors & Logos",
          free: "Paywalled on free tier",
          supporter: "8 print-verified palettes + logo free",
        },
        {
          feature: "Edit Link After Print",
          free: "Paid Growth/Premium plan",
          supporter: "5 Free forever · 100 with Pass",
        },
        {
          feature: "50-Code Batch ZIP + CSV",
          free: "Higher paid tiers only",
          supporter: "Free (PNG + SVG + manifest.csv)",
        },
        {
          feature: "Smart Menu Schedules",
          free: "Enterprise tier ($199+/mo)",
          supporter: "Breakfast/Dinner & iOS/Android",
        },
        {
          feature: "Mixtapes, Photos & Secrets",
          free: "Not supported (links only)",
          supporter: "500 MB drops + 1-scan notes",
        },
        {
          feature: "Account Requirement",
          free: "Mandatory account login",
          supporter: "Zero sign-up (4-word passkey)",
        },
      ],
      faqItems: [
        {
          q: "How does QRBuddy compare to Bitly for printed QR codes?",
          a: "Bitly started as a text link shortener and gated QR customization (Vector SVG export, custom colors, center logos, and destination URL editing) behind recurring monthly tiers. QRBuddy is built specifically for physical print runs — giving away Vector SVG export, 3000px PNGs, custom logos, and 8 WCAG-verified gradient palettes at $0.",
        },
        {
          q: "Can a destination URL be changed after printing in QRBuddy without paying $35/month?",
          a: "Yes. Every user gets 5 permanent editable dynamic QR codes for free, and the optional 1-year QRBuddy Passport (~$32 USD / A$49, no auto-renewal) expands capacity to 100 editable dynamic codes with 90-day analytics.",
        },
        {
          q: "Does QRBuddy require creating an email/password account like Bitly?",
          a: "No. Static codes download immediately with zero sign-up, and editable codes + Passport upgrades use a privacy-first 4-word Sovereign Passport synced in the browser.",
        },
      ],
      ctaLabel: "Unlock QRBuddy Passport (~$32/yr) 🛂✨",
    },
    es: {
      metaTitle:
        "Alternativa a Bitly QR — SVG Vectorial Gratis, Logos y QRs Editables | QRBuddy",
      metaDescription:
        "Compara QRBuddy frente a Bitly QR Codes. Exporta SVG vectorial gratis, usa degradados verificados para imprenta, 5 QRs editables gratis y 100 con el Pasaporte de ~$32 USD/año.",
      ogTitle:
        "Alternativa a Bitly QR — SVG Vectorial y QRs Dinámicos sin Suscripción | QRBuddy",
      ogImageAlt: "Comparativa de QRBuddy frente a Bitly QR Codes",
      jsonLdName: "QRBuddy — Alternativa a Bitly para Códigos QR",
      badge: "Alternativa a Bitly",
      title: "Salta el Muro de $420/año de Bitly. Libera el SVG.",
      tagline:
        "Bitly bloquea colores, exportación SVG vectorial y edición de destino tras planes de $10 a $35/mes. QRBuddy los libera.",
      subtagline:
        "Prueba degradados, logos centrales y descarga SVG vectorial abajo — sin crear cuenta.",
      defaultCaption: "ESCANÉAME",
      featuresTitle:
        "Por Qué Diseñadores e Imprentas Cambian Bitly por QRBuddy",
      faqTitle: "Preguntas sobre Bitly vs. QRBuddy",
      comparisonTitle: "QRBuddy vs. Bitly QR Codes",
      comparisonSubtitle:
        "Estudio completo de impresión y multimedia frente a acortador corporativo",
      comparisonColumns: {
        feature: "Capacidad",
        col1: "Bitly QR Codes",
        col2: "QRBuddy (Gratis + Pasaporte)",
      },
      valueCards: [
        {
          icon: "🎨",
          title: "SVG Vectorial, Logos y Degradados",
          tag: "Gratis Siempre",
          desc:
            "Bitly limita su plan gratuito a códigos básicos sin SVG. QRBuddy ofrece 8 paletas verificadas y exportación SVG por $0.",
        },
        {
          icon: "⚡",
          title: "Edita el Destino Cuando Quieras",
          tag: "5 Gratis · 100 Pro",
          desc:
            "Incluye 5 códigos QR dinámicos editables gratis y 100 enlaces editables con el Pasaporte anual (~$32 USD).",
        },
        {
          icon: "🕒",
          title: "Horarios de Menú y Dispositivos",
          tag: "Incluido",
          desc:
            "Cambia menús de Desayuno/Cena según la hora, separa iOS vs. Android o divide tráfico A/B.",
        },
        {
          icon: "📼",
          title: "Mixtapes de 500 MB, Fotos y Notas",
          tag: "Sello QRBuddy",
          desc:
            "Bitly solo acorta enlaces. QRBuddy aloja mixtapes de audio, galerías de fotos y notas de 1 escaneo.",
        },
      ],
      comparisonItems: [
        {
          feature: "Costo Anual",
          free: "$120 – $420 / año",
          supporter: "$0 Gratis · ~$32/año Pasaporte",
        },
        {
          feature: "SVG Vectorial + PNG 3000px",
          free: "Exige plan de pago para SVG",
          supporter: "Gratis siempre (SVG + PNG)",
        },
        {
          feature: "Colores y Logo Central",
          free: "Bloqueado en plan gratis",
          supporter: "8 paletas para imprenta + logo gratis",
        },
        {
          feature: "Editar Link Impreso",
          free: "Solo en planes superiores",
          supporter: "5 Gratis siempre · 100 con Pase",
        },
        {
          feature: "Lotes ZIP de 50 + CSV",
          free: "Solo en planes altos",
          supporter: "Gratis (PNG + SVG + manifest.csv)",
        },
        {
          feature: "Horarios de Menú",
          free: "Plan empresarial ($199+/mes)",
          supporter: "Desayuno/Cena e iOS/Android",
        },
        {
          feature: "Mixtapes, Fotos y Notas",
          free: "No disponible (solo links)",
          supporter: "Envíos de 500 MB + notas 1-vista",
        },
        {
          feature: "Cuenta y Registro",
          free: "Cuenta obligatoria",
          supporter: "Sin registro (clave de 4 palabras)",
        },
      ],
      faqItems: [
        {
          q: "¿En qué se diferencia QRBuddy de Bitly para códigos QR impresos?",
          a: "Bitly nació como acortador de enlaces y bloquea la exportación SVG vectorial, los colores personalizados y la edición de destino en planes mensuales. QRBuddy está diseñado desde cero para impresión física, ofreciendo SVG vectorial, PNG de 3000px, logo central y 8 paletas con contraste verificado por $0.",
        },
        {
          q: "¿Se puede cambiar el enlace de destino después de imprimir sin pagar $35/mes?",
          a: "Sí. Cada navegador cuenta con 5 códigos QR dinámicos editables permanentes gratis, y el Pasaporte anual opcional (~$32 USD / A$49, sin renovación automática) amplía la capacidad a 100 códigos editables.",
        },
        {
          q: "¿Hace falta registrarse con correo y contraseña como en Bitly?",
          a: "No. Los códigos estáticos se descargan al instante sin registro, y los códigos editables usan un Pasaporte Soberano de 4 palabras sin muros de correo.",
        },
      ],
      ctaLabel: "Obtener Pasaporte QRBuddy (~$32/año) 🛂✨",
    },
  },

  "qr-code-generator": {
    slug: "qr-code-generator",
    brandName: "QR Code Generator Pro",
    defaultStyle: "matcha",
    en: {
      metaTitle:
        "QR Code Generator Pro Alternative (One-Time Annual Pass, No Trial Shutoff) | QRBuddy",
      metaDescription:
        "Switch from QR-Code-Generator.com Pro (`qrco.de`) to QRBuddy. Create free permanent static QRs, or unlock 100 editable dynamic QRs and 500 MB drops for ~$32/year with zero auto-renewal.",
      ogTitle:
        "QR Code Generator Pro Alternative — No 14-Day Trial Shutoff | QRBuddy",
      ogImageAlt:
        "QRBuddy vs QR Code Generator Pro comparison and live QR studio",
      jsonLdName:
        "QRBuddy — QR Code Generator Pro Alternative Without Annual Lock-In",
      badge: "QR Code Generator Alternative",
      title: "Print Once. Never Get Billed Monthly.",
      tagline:
        "QR-Code-Generator.com (`qrco.de`) deactivates trial dynamic QRs after 14 days unless billed annually. Mint permanent QRs below.",
      subtagline:
        "Generate direct static QRs ($0 forever) or transparent editable links (5 free, 100 with Passport) right now.",
      defaultCaption: "SCAN ME",
      featuresTitle: "How QRBuddy Beats the 14-Day Trial Funnel",
      faqTitle: "Questions When Leaving QR Code Generator Pro",
      comparisonTitle: "QRBuddy vs. QR Code Generator Pro",
      comparisonSubtitle:
        "Transparent Static vs. Editable toggle vs. 14-day trial lock-in",
      comparisonColumns: {
        feature: "Capability",
        col1: "QR Code Generator Pro",
        col2: "QRBuddy (Free + Passport)",
      },
      valueCards: [
        {
          icon: "🔒",
          title: "1-Click Static vs. Editable Pill",
          tag: "Zero Tricks",
          desc:
            "Every URL input shows a clear pill: Static (Free forever) vs. Editable after print + Stats. No surprise trial redirects.",
        },
        {
          icon: "💰",
          title: "~$32/yr Once vs. $120–$450/yr",
          tag: "No Auto-Renew",
          desc:
            "Instead of billed-annually tiered subscriptions, the QRBuddy Passport is a flat A$49 (~$32 USD) for 365 days.",
        },
        {
          icon: "📐",
          title: "Vector SVG & 50-Code Batch ZIP",
          tag: "Free Forever",
          desc:
            "Download Vector SVGs, 3000px PNGs, or 50-code batch ZIPs with a print manifest immediately — zero account wall.",
        },
        {
          icon: "📼",
          title: "500 MB Mixtapes, Photos & Secrets",
          tag: "Only on QRBuddy",
          desc:
            "Host playable audio mixtapes, event photo galleries, and 1-scan self-destructing notes without a monthly plan.",
        },
      ],
      comparisonItems: [
        {
          feature: "Annual Cost",
          free: "$120 – $450 / year (billed annually)",
          supporter: "$0 Free · ~$32/yr Passport",
        },
        {
          feature: "14-Day Trial Shutoff",
          free: "Deactivates dynamic QRs on Day 15",
          supporter: "Never — codes stay alive",
        },
        {
          feature: "Auto-Renewal Trap",
          free: "Recurring annual subscription",
          supporter: "Zero auto-billing (1-year pass)",
        },
        {
          feature: "Edit Link After Print",
          free: "0 Free after 14-day trial",
          supporter: "5 Free forever · 100 with Pass",
        },
        {
          feature: "Vector SVG + Batch ZIP",
          free: "Locked behind Pro signup",
          supporter: "Free (SVG + 3000px PNG + CSV)",
        },
        {
          feature: "Smart Menu Schedules",
          free: "Not included",
          supporter: "Breakfast/Dinner & iOS/Android",
        },
        {
          feature: "Mixtapes, Photos & Secrets",
          free: "Basic templates only",
          supporter: "500 MB drops + 1-scan notes",
        },
        {
          feature: "Account Requirement",
          free: "Mandatory email & trial signup",
          supporter: "Zero sign-up (4-word passkey)",
        },
      ],
      faqItems: [
        {
          q: "Why did a `qrco.de` QR code display a 'Campaign Deactivated' screen after 14 days?",
          a: "`qrco.de` is the short-link domain used by QR Code Generator Pro's 14-day dynamic trial. Once the 14-day trial expires, the redirect pauses until an annual plan is purchased. In QRBuddy, static QR codes encode the full URL directly into the graphic so they never touch a redirect server, and the 5 free editable dynamic links have no 14-day shutoff.",
        },
        {
          q: "Can a deactivated `qrco.de` printed QR code be fixed without reprinting?",
          a: "Because `qrco.de` is owned by QR Code Generator Pro, only their servers can resolve that specific printed graphic. For the next print batch — or for a replacement sticker placed over the old code — minting a direct static QR or a QRBuddy editable link prevents future subscription lock-in.",
        },
        {
          q: "Does QRBuddy charge monthly or auto-renew at the end of the year?",
          a: "Neither. Static codes and 5 editable dynamic links are $0 forever. The optional QRBuddy Passport is a one-time A$49 (~$32 USD) payment for 365 days with zero automatic renewal.",
        },
      ],
      ctaLabel: "Unlock QRBuddy Passport (~$32/yr) 🛂✨",
    },
    es: {
      metaTitle:
        "Alternativa a QR Code Generator Pro (Sin Trampa de 14 Días) | QRBuddy",
      metaDescription:
        "Cambia de QR-Code-Generator.com Pro (`qrco.de`) a QRBuddy. Crea QRs estáticos permanentes gratis o consigue 100 QRs editables y 500 MB por ~$32 USD/año sin renovación automática.",
      ogTitle:
        "Alternativa a QR Code Generator Pro — Sin QRs Desactivados a los 14 Días | QRBuddy",
      ogImageAlt:
        "Comparativa de QRBuddy frente a QR Code Generator Pro y estudio QR",
      jsonLdName:
        "QRBuddy — Alternativa a QR Code Generator Pro sin Suscripción Anual Forzosa",
      badge: "Alternativa a QR Code Generator",
      title: "Imprime Una Vez. Cero Rentas Mensuales.",
      tagline:
        "QR-Code-Generator.com (`qrco.de`) desactiva los QRs dinámicos de prueba a los 14 días salvo pago anual. Crea QRs permanentes abajo.",
      subtagline:
        "Genera QRs estáticos directos ($0 siempre) o enlaces editables (5 gratis, 100 con Pasaporte) ahora mismo.",
      defaultCaption: "ESCANÉAME",
      featuresTitle: "Cómo QRBuddy Supera el Embudo de 14 Días",
      faqTitle: "Preguntas Frecuentes al Dejar QR Code Generator Pro",
      comparisonTitle: "QRBuddy vs. QR Code Generator Pro",
      comparisonSubtitle:
        "Selector claro Estático vs. Editable frente a bloqueo tras 14 días de prueba",
      comparisonColumns: {
        feature: "Capacidad",
        col1: "QR Code Generator Pro",
        col2: "QRBuddy (Gratis + Pasaporte)",
      },
      valueCards: [
        {
          icon: "🔒",
          title: "Selector Claro Estático vs. Editable",
          tag: "Cero Trampas",
          desc:
            "Debajo de cada URL ves el botón Estático (Gratis siempre) vs. Editable tras imprimir. Sin redirecciones ocultas.",
        },
        {
          icon: "💰",
          title: "~$32/año Único vs. $120–$450/año",
          tag: "Sin Autorenovación",
          desc:
            "En lugar de suscripciones anuales automáticas, el Pasaporte QRBuddy cuesta un pago único de A$49 (~$32 USD) por 365 días.",
        },
        {
          icon: "📐",
          title: "SVG Vectorial y Lotes ZIP de 50",
          tag: "Gratis Siempre",
          desc:
            "Descarga SVG vectorial, PNG de 3000px o paquetes ZIP de 50 códigos con manifiesto CSV al instante y sin registro.",
        },
        {
          icon: "📼",
          title: "Mixtapes de 500 MB, Fotos y Notas",
          tag: "Sello QRBuddy",
          desc:
            "Aloja mixtapes de audio reproducibles, galerías de fotos y notas secretas de 1 escaneo sin pagar mes a mes.",
        },
      ],
      comparisonItems: [
        {
          feature: "Costo Anual",
          free: "$120 – $450 / año (cobro anual)",
          supporter: "$0 Gratis · ~$32/año Pasaporte",
        },
        {
          feature: "Apagón al Día 15",
          free: "Desactiva QRs tras 14 días",
          supporter: "Jamás — los códigos siguen vivos",
        },
        {
          feature: "Trampa de Renovación",
          free: "Suscripción anual recurrente",
          supporter: "Cero cobro automático (pase 1 año)",
        },
        {
          feature: "Editar Link Impreso",
          free: "0 gratis tras 14 días",
          supporter: "5 Gratis siempre · 100 con Pase",
        },
        {
          feature: "SVG Vectorial + ZIP de 50",
          free: "Exige registro en prueba Pro",
          supporter: "Gratis (SVG + PNG 3000px + CSV)",
        },
        {
          feature: "Horarios de Menú",
          free: "No incluido",
          supporter: "Desayuno/Cena e iOS/Android",
        },
        {
          feature: "Mixtapes, Fotos y Notas",
          free: "Solo plantillas básicas",
          supporter: "Envíos de 500 MB + notas 1-vista",
        },
        {
          feature: "Cuenta y Registro",
          free: "Correo y prueba obligatorios",
          supporter: "Sin registro (clave de 4 palabras)",
        },
      ],
      faqItems: [
        {
          q: "¿Por qué un código `qrco.de` muestra 'Campaña Desactivada' después de 14 días?",
          a: "`qrco.de` es el dominio corto de la prueba de 14 días de QR Code Generator Pro. Al vencer los 14 días, la redirección se pausa hasta contratar un plan anual. En QRBuddy los códigos estáticos graban la URL directa en el gráfico para no depender de servidores, y los 5 enlaces editables gratuitos no se apagan a los 14 días.",
        },
        {
          q: "¿Se puede reactivar un QR impreso con `qrco.de` sin volver a imprimir?",
          a: "Como el dominio `qrco.de` pertenece a QR Code Generator Pro, solo sus servidores controlan ese gráfico específico. Para el próximo tiraje o para cubrir el código anterior con un sticker, generar un QR estático directo o un enlace editable en QRBuddy evita futuros bloqueos.",
        },
        {
          q: "¿QRBuddy cobra mes a mes o se renueva automáticamente al año?",
          a: "Ninguna de las dos. Los códigos estáticos y 5 enlaces editables son gratis para siempre. El Pasaporte QRBuddy es un pago único de A$49 (~$32 USD) por 365 días sin renovación automática.",
        },
      ],
      ctaLabel: "Obtener Pasaporte QRBuddy (~$32/año) 🛂✨",
    },
  },
};
