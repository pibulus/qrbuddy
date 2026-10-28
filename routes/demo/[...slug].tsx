import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import FooterDock from "../../islands/FooterDock.tsx";
import { AboutModal } from "../../islands/AboutModal.tsx";
import { PricingLink, PricingModal } from "../../islands/PricingModal.tsx";
import { buildQrSvgString, toSvgDataUrl } from "../../utils/qr-vector-svg.ts";
import type { Locale } from "../../utils/i18n.ts";

type DemoKey = "menu" | "wedding" | "mixtape" | "drop" | "vcard" | "gs1";

interface DemoPageData {
  demoKey: DemoKey;
  lang: Locale;
  gs1PathInfo?: {
    gtin?: string;
    lot?: string;
    expiry?: string;
  };
}

interface DemoConfig {
  key: DemoKey;
  palette: "matcha" | "blush" | "vapor" | "pool" | "sunset" | "grape";
  accentBg: string;
  studioHrefEn: string;
  studioHrefEs: string;
  studioLabelEn: string;
  studioLabelEs: string;
  badgeEn: string;
  badgeEs: string;
  hostBadgeEn: string;
  hostBadgeEs: string;
  titleEn: string;
  titleEs: string;
  subtitleEn: string;
  subtitleEs: string;
  routingBannerEn: string;
  routingBannerEs: string;
  frontItems: ReadonlyArray<{
    icon: string;
    titleEn: string;
    titleEs: string;
    detailEn: string;
    detailEs: string;
    metaEn: string;
    metaEs: string;
  }>;
  stats: {
    shortCode: string;
    scans30d: string;
    scans90d: string;
    peakWindow: string;
    bars: readonly [number, number, number, number, number, number, number];
    citiesEn: string;
    citiesEs: string;
    devices: string;
    routingRuleEn: string;
    routingRuleEs: string;
    highlightLabelEn: string;
    highlightLabelEs: string;
    highlightValueEn: string;
    highlightValueEs: string;
  };
}

export const DEMO_CONFIGS: Record<DemoKey, DemoConfig> = {
  menu: {
    key: "menu",
    palette: "matcha",
    accentBg: "#9ef0c8",
    studioHrefEn: "/for/menus",
    studioHrefEs: "/es/menus",
    studioLabelEn: "← Back to Menu QR Studio",
    studioLabelEs: "← Volver al Estudio de Menús",
    badgeEn: "Live Menu QR Example 📜",
    badgeEs: "Ejemplo Real de Menú QR 📜",
    hostBadgeEn: "BRUNSWICK BISTRO · TABLE 07",
    hostBadgeEs: "BISTRÓ ROMA · MESA 07",
    titleEn: "Evening Kitchen & Natural Wine",
    titleEs: "Cocina de Noche y Vino Natural",
    subtitleEn:
      "Example landing page opened when scanning the sample QR code on the Restaurant Menus studio.",
    subtitleEs:
      "Página de ejemplo que se abre al escanear el código QR de muestra del Estudio de Menús.",
    routingBannerEn:
      "🕰️ Time Routing Active · 7am–3pm opens Morning Coffee · 5pm–11pm opens Dinner List",
    routingBannerEs:
      "🕰️ Horario Inteligente Activo · 7am–3pm abre Desayunos · 5pm–11pm abre Cenas",
    frontItems: [
      {
        icon: "🥖",
        titleEn: "Woodfired Sourdough & Cultured Butter",
        titleEs: "Pan de Masa Madre al Horno de Leña",
        detailEn: "Whipped sea-salt butter, roasted garlic oil, rosemary",
        detailEs: "Mantequilla batida con sal de mar, aceite de ajo asado",
        metaEn: "$11",
        metaEs: "$110",
      },
      {
        icon: "🐙",
        titleEn: "Charred Fremantle Octopus",
        titleEs: "Pulpo a las Brasas con Cítricos",
        detailEn: "Smoked paprika oil, crispy kipfler potatoes, charred lemon",
        detailEs: "Aceite de pimentón ahumado, papa criolla dorada, limón",
        metaEn: "$28",
        metaEs: "$280",
      },
      {
        icon: "🍝",
        titleEn: "Hand-Cut Tagliolini & Wild Mushroom",
        titleEs: "Tagliolini Fresco con Hongos Silvestres",
        detailEn: "Thyme butter emulsion, aged pecorino, cracked black pepper",
        detailEs: "Emulsión de tomillo, pecorino añejo, pimienta negra",
        metaEn: "$32",
        metaEs: "$310",
      },
      {
        icon: "🍷",
        titleEn: "2025 Macedon Ranges Pet-Nat (Chilled)",
        titleEs: "Pet-Nat 2025 Valle de Guadalupe (Copa)",
        detailEn:
          "Unfiltered sparkling rosé · crisp blood orange & wild strawberry",
        detailEs:
          "Espumoso natural sin filtrar · toronja roja y fresa silvestre",
        metaEn: "$16 / $68",
        metaEs: "$160 / $680",
      },
    ],
    stats: {
      shortCode: "bistro-07",
      scans30d: "1,842",
      scans90d: "5,190",
      peakWindow: "7pm–9pm",
      bars: [42, 36, 48, 55, 88, 100, 74],
      citiesEn: "Melbourne (78%) · Fitzroy (14%) · Sydney (8%)",
      citiesEs: "CDMX (76%) · Guadalajara (15%) · Monterrey (9%)",
      devices: "iOS 71% · Android 28% · Desktop 1%",
      routingRuleEn:
        "Editable link + Time-of-Day schedule (Breakfast PDF → Dinner URL)",
      routingRuleEs:
        "Enlace editable + Horario automático (PDF Desayuno → Menú Cena)",
      highlightLabelEn: "Top Table Rush",
      highlightLabelEs: "Hora Pico en Mesas",
      highlightValueEn: "Friday & Saturday · 7:00 PM – 9:00 PM",
      highlightValueEs: "Viernes y Sábado · 7:00 PM – 9:00 PM",
    },
  },

  wedding: {
    key: "wedding",
    palette: "blush",
    accentBg: "#f7d0e6",
    studioHrefEn: "/for/weddings",
    studioHrefEs: "/es/bodas",
    studioLabelEn: "← Back to Wedding QR Studio",
    studioLabelEs: "← Volver al Estudio de Bodas",
    badgeEn: "Live Wedding QR Example 💌",
    badgeEs: "Ejemplo Real de Boda QR 💌",
    hostBadgeEn: "ELENA & MATEO · OCTOBER 28 · GLASSHOUSE GARDENS",
    hostBadgeEs: "ELENA Y MATEO · 28 DE OCTUBRE · JARDÍN BOTÁNICO",
    titleEn: "Ceremony, Courtyard Dinner & Photo Drop",
    titleEs: "Ceremonia, Cena en el Jardín y Galería",
    subtitleEn:
      "Example invitation & event page opened when scanning the sample QR code on the Weddings studio.",
    subtitleEs:
      "Página de ejemplo que se abre al escanear el QR de muestra del Estudio de Bodas.",
    routingBannerEn:
      "✨ Editable Event Link · Points to RSVP before the wedding, then flips to the 10-Photo Gallery the next morning",
    routingBannerEs:
      "✨ Enlace Editable · Apunta al RSVP antes de la boda y cambia a la Galería de Fotos al día siguiente",
    frontItems: [
      {
        icon: "🌿",
        titleEn: "4:00 PM — Conservatory Ceremony",
        titleEs: "4:00 PM — Ceremonia en el Invernadero",
        detailEn:
          "North Glasshouse Lawn · Acoustic string quartet & welcome spritz",
        detailEs: "Jardín Norte · Cuarteto de cuerdas y cóctel de bienvenida",
        metaEn: "Map ↗",
        metaEs: "Mapa ↗",
      },
      {
        icon: "🥂",
        titleEn: "6:30 PM — Long-Table Courtyard Feast",
        titleEs: "6:30 PM — Banquete en el Patio Central",
        detailEn:
          "Shared family platters, speeches, and cake cutting under the figs",
        detailEs:
          "Mesas largas compartidas, brindis y pastel bajo las higueras",
        metaEn: "Menu ↗",
        metaEs: "Menú ↗",
      },
      {
        icon: "📸",
        titleEn: "Curated 10-Photo Film Gallery",
        titleEs: "Galería Curada de 10 Fotos en 35mm",
        detailEn:
          "Swipe & save high-resolution portraits directly in the browser",
        detailEs:
          "Desliza y guarda retratos en alta resolución directo en el navegador",
        metaEn: "10 Photos",
        metaEs: "10 Fotos",
      },
      {
        icon: "🎶",
        titleEn: "Late-Night Reception Mixtape",
        titleEs: "Mixtape de Medianoche (10 Pistas)",
        detailEn:
          "Stream the couple's 10-track reception playlist with auto-advance",
        detailEs:
          "Escucha las 10 canciones favoritas de la fiesta sin instalar apps",
        metaEn: "Play ▶",
        metaEs: "Oír ▶",
      },
    ],
    stats: {
      shortCode: "elena-mateo",
      scans30d: "418",
      scans90d: "1,120",
      peakWindow: "4pm–6pm",
      bars: [18, 22, 25, 34, 62, 100, 84],
      citiesEn: "Melbourne (62%) · Auckland (19%) · Mexico City (19%)",
      citiesEs: "CDMX (64%) · Oaxaca (21%) · Madrid (15%)",
      devices: "iOS 79% · Android 19% · Desktop 2%",
      routingRuleEn:
        "Cover Card enabled · White-label footer · Repointed from RSVP to Photo Gallery",
      routingRuleEs:
        "Tarjeta de Portada activa · Sin marca al pie · Cambiado de RSVP a Galería",
      highlightLabelEn: "Gallery Saves",
      highlightLabelEs: "Descargas de Galería",
      highlightValueEn: "312 guest photo downloads across 3 countries",
      highlightValueEs: "312 descargas de fotos por invitados en 3 países",
    },
  },

  mixtape: {
    key: "mixtape",
    palette: "vapor",
    accentBg: "#e2d4f8",
    studioHrefEn: "/for/music",
    studioHrefEs: "/es/musica",
    studioLabelEn: "← Back to Music & Mixtape Studio",
    studioLabelEs: "← Volver al Estudio de Música",
    badgeEn: "Live Mixtape QR Example 📼",
    badgeEs: "Ejemplo Real de Mixtape QR 📼",
    hostBadgeEn: "SIDE A · BRUNSWICK SYNTH CLUB · LP-04",
    hostBadgeEs: "LADO A · CLUB SINTÉTICO · LP-04",
    titleEn: "Nocturnal Tape #04 (Browser Mixtape Player)",
    titleEs: "Cinta Nocturna #04 (Reproductor Web)",
    subtitleEn:
      "Example 10-track mixtape & merch page opened when scanning a vinyl sticker or cassette J-card QR.",
    subtitleEs:
      "Ejemplo de mixtape de 10 pistas y merch al escanear el QR de un vinilo, cassette o póster.",
    routingBannerEn:
      "🎧 Hosted 10-Track Audio Player · Auto-advances track to track with per-song play stats",
    routingBannerEs:
      "🎧 Reproductor Web de 10 Pistas · Avance continuo entre canciones con conteo por pista",
    frontItems: [
      {
        icon: "▶️",
        titleEn: "01. Warm Analog Rain (Sydney Rd Dub)",
        titleEs: "01. Lluvia Analógica (Versión Dub)",
        detailEn: "Juno-106 tape saturation · 118 BPM · 320kbps MP3",
        detailEs: "Saturación de cinta Juno-106 · 118 BPM · MP3 320kbps",
        metaEn: "03:42 · 318 plays",
        metaEs: "03:42 · 318 repr.",
      },
      {
        icon: "🎵",
        titleEn: "02. Tram 86 at Midnight",
        titleEs: "02. Tranvía 86 a Medianoche",
        detailEn: "Live Roland SH-101 bassline + field recording",
        detailEs: "Bajo Roland SH-101 en vivo + grabación de campo",
        metaEn: "04:15 · 244 plays",
        metaEs: "04:15 · 244 repr.",
      },
      {
        icon: "🎵",
        titleEn: "03. Pastel Punk (Demo Take 2)",
        titleEs: "03. Pastel Punk (Toma Demo 2)",
        detailEn: "Fuzz guitar, CR-78 drum machine, stereo chorus",
        detailEs: "Guitarra fuzz, caja de ritmos CR-78, chorus estéreo",
        metaEn: "02:58 · 197 plays",
        metaEs: "02:58 · 197 repr.",
      },
      {
        icon: "🎲",
        titleEn: "Merch Table Mystery Bonus (QR Roulette)",
        titleEs: "Bonus Misterioso de Merch (Ruleta QR)",
        detailEn:
          "Spins between Bandcamp pre-order, stem pack ZIP, and tour dates",
        detailEs:
          "Gira entre preventa en Bandcamp, paquete de stems y fechas de gira",
        metaEn: "1 spin/day",
        metaEs: "1 giro/día",
      },
    ],
    stats: {
      shortCode: "tape-04",
      scans30d: "964",
      scans90d: "2,810",
      peakWindow: "10pm–12am",
      bars: [28, 31, 40, 52, 79, 100, 68],
      citiesEn: "Melbourne (48%) · Berlin (27%) · Tokyo (25%)",
      citiesEs: "CDMX (51%) · Buenos Aires (28%) · Bogotá (21%)",
      devices: "iOS 64% · Android 31% · Desktop 5%",
      routingRuleEn: "10-track Mixtape Player + Track Leaderboard + CSV export",
      routingRuleEs:
        "Reproductor de 10 pistas + Ranking de canciones + Exportación CSV",
      highlightLabelEn: "#1 Most-Played Track",
      highlightLabelEs: "Canción #1 Más Escuchada",
      highlightValueEn: "01. Warm Analog Rain — 318 complete plays",
      highlightValueEs: "01. Lluvia Analógica — 318 reproducciones",
    },
  },

  drop: {
    key: "drop",
    palette: "pool",
    accentBg: "#9ef0c8",
    studioHrefEn: "/for/lockers",
    studioHrefEs: "/es/archivos",
    studioLabelEn: "← Back to File Drop Studio",
    studioLabelEs: "← Volver al Estudio de Archivos",
    badgeEn: "Live File Drop Example 🔐",
    badgeEs: "Ejemplo Real de Envío QR 🔐",
    hostBadgeEn: "EPHEMERAL TRANSFER · SELF-DESTRUCT ARMED",
    hostBadgeEs: "TRANSFERENCIA TEMPORAL · AUTODESTRUCCIÓN ACTIVA",
    titleEn: "Print_Proof_Package_300DPI.zip (148 MB)",
    titleEs: "Paquete_Imprenta_300DPI.zip (148 MB)",
    subtitleEn:
      "Example self-destructing file locker opened when scanning a file-drop QR code.",
    subtitleEs:
      "Ejemplo de buzón autodestructible que se abre al escanear un código QR de archivo.",
    routingBannerEn:
      "💣 Scan-Count Cap Active · 4 of 5 downloads remaining before automatic purge",
    routingBannerEs:
      "💣 Límite de Descargas Activo · Quedan 4 de 5 descargas antes del borrado automático",
    frontItems: [
      {
        icon: "📦",
        titleEn: "Print_Proof_Package_300DPI.zip",
        titleEs: "Paquete_Imprenta_300DPI.zip",
        detailEn:
          "CMYK press PDFs, Vector SVGs, die-cut outlines · SHA-256 verified",
        detailEs: "PDFs CMYK de imprenta, SVGs vectoriales, líneas de suaje",
        metaEn: "148 MB",
        metaEs: "148 MB",
      },
      {
        icon: "💣",
        titleEn: "Self-Destruct Counter: 4 Uses Left",
        titleEs: "Contador de Autodestrucción: Quedan 4 Usos",
        detailEn:
          "Once download #5 finishes, the storage object is permanently wiped",
        detailEs:
          "Al completarse la descarga #5, el archivo se borra definitivamente",
        metaEn: "4 / 5 left",
        metaEs: "4 / 5 disp.",
      },
      {
        icon: "🛡️",
        titleEn: "Zero Account Required to Receive",
        titleEs: "Sin Cuenta para Descargar",
        detailEn:
          "Scanners tap once to save on iOS, Android, macOS, or Windows",
        detailEs: "Descarga directa en un toque desde iOS, Android, Mac o PC",
        metaEn: "Direct HTTPS",
        metaEs: "HTTPS Directo",
      },
    ],
    stats: {
      shortCode: "drop-7x",
      scans30d: "1",
      scans90d: "1",
      peakWindow: "2pm–4pm",
      bars: [0, 0, 0, 0, 0, 100, 0],
      citiesEn: "Melbourne (100%)",
      citiesEs: "CDMX (100%)",
      devices: "Desktop 100%",
      routingRuleEn:
        "500 MB Passport Drop · 5-download self-destruct cap · 30-day TTL",
      routingRuleEs:
        "Envío Pasaporte 500 MB · Límite de 5 descargas · Vigencia 30 días",
      highlightLabelEn: "Remaining Downloads",
      highlightLabelEs: "Descargas Restantes",
      highlightValueEn: "4 of 5 downloads left (Expires automaticamente at 0)",
      highlightValueEs: "4 de 5 descargas disponibles",
    },
  },

  vcard: {
    key: "vcard",
    palette: "sunset",
    accentBg: "#f8de7e",
    studioHrefEn: "/for/vcard",
    studioHrefEs: "/es/vcard",
    studioLabelEn: "← Back to vCard QR Studio",
    studioLabelEs: "← Volver al Estudio vCard",
    badgeEn: "Live Contact Card Example 👤",
    badgeEs: "Ejemplo Real de Tarjeta vCard 👤",
    hostBadgeEn: "STUDIO MIRADOR · MELBOURNE & CDMX",
    hostBadgeEs: "STUDIO MIRADOR · CDMX Y MELBOURNE",
    titleEn: "Elena Vargas — Creative Director",
    titleEs: "Elena Vargas — Directora Creativa",
    subtitleEn:
      "Example studio portfolio & contact card linked from a vCard 3.0 business card QR.",
    subtitleEs:
      "Ejemplo de portafolio y contacto vinculado desde un código QR vCard 3.0.",
    routingBannerEn:
      "📇 Native vCard 3.0 + Portfolio Link · Saves phone, email & studio URL offline in one tap",
    routingBannerEs:
      "📇 vCard 3.0 Nativa + Portafolio · Guarda teléfono, correo y web sin conexión en un toque",
    frontItems: [
      {
        icon: "🏢",
        titleEn: "Studio Mirador — Brand & Packaging",
        titleEs: "Studio Mirador — Identidad y Empaque",
        detailEn:
          "Print-first visual identity, tactile packaging & exhibition design",
        detailEs:
          "Identidad visual para imprenta, empaque táctil y diseño editorial",
        metaEn: "Portfolio ↗",
        metaEs: "Portafolio ↗",
      },
      {
        icon: "📞",
        titleEn: "+61 400 123 456",
        titleEs: "+52 55 4001 2345",
        detailEn: "Direct studio line · WhatsApp & Signal ready",
        detailEs: "Línea directa del estudio · WhatsApp y Signal",
        metaEn: "Call / SMS",
        metaEs: "Llamar",
      },
      {
        icon: "✉️",
        titleEn: "elena@studiomirador.co",
        titleEs: "elena@studiomirador.co",
        detailEn: "New commissions, print specs & press inquiries",
        detailEs: "Nuevos proyectos, especificaciones de imprenta y prensa",
        metaEn: "Email",
        metaEs: "Correo",
      },
    ],
    stats: {
      shortCode: "mirador",
      scans30d: "286",
      scans90d: "740",
      peakWindow: "11am–1pm",
      bars: [30, 58, 64, 72, 100, 45, 22],
      citiesEn: "Melbourne (54%) · Sydney (29%) · London (17%)",
      citiesEs: "CDMX (58%) · Monterrey (24%) · Madrid (18%)",
      devices: "iOS 74% · Android 24% · Desktop 2%",
      routingRuleEn:
        "Offline vCard 3.0 payload + Editable portfolio website link",
      routingRuleEs:
        "Contacto vCard 3.0 sin internet + Enlace editable al portafolio",
      highlightLabelEn: "Conference Peak",
      highlightLabelEs: "Pico en Eventos",
      highlightValueEn: "Thursday Design Week · 94 card scans",
      highlightValueEs: "Jueves de Semana del Diseño · 94 escaneos",
    },
  },

  gs1: {
    key: "gs1",
    palette: "grape",
    accentBg: "#e2d4f8",
    studioHrefEn: "/for/gs1",
    studioHrefEs: "/es/gs1",
    studioLabelEn: "← Back to GS1 2027 Studio",
    studioLabelEs: "← Volver al Estudio GS1 2027",
    badgeEn: "Live GS1 Digital Link Example 📦",
    badgeEs: "Ejemplo Real GS1 Digital Link 📦",
    hostBadgeEn: "SOL BOTANICALS · SUNRISE 2027 COMPLIANT",
    hostBadgeEs: "SOL BOTANICALS · ESTÁNDAR GS1 2027",
    titleEn: "Botanical Hair & Body Oil (100 mL)",
    titleEs: "Aceite Botánico Corporal (100 mL)",
    subtitleEn:
      "Example GS1 Digital Link resolver page — one 2D QR code scans at retail POS checkouts and opens batch provenance on phones.",
    subtitleEs:
      "Página de ejemplo GS1 Digital Link: un solo QR 2D pasa en caja registradora y muestra lote e ingredientes en teléfonos.",
    routingBannerEn:
      "🏷️ GS1 URI Syntax Verified · /01/09312345678907/10/BATCH-04?17=271231 (Mod-10 Check Digit: 7)",
    routingBannerEs:
      "🏷️ Sintaxis GS1 Verificada · /01/09312345678907/10/BATCH-04?17=271231 (Dígito Mod-10: 7)",
    frontItems: [
      {
        icon: "✅",
        titleEn: "GTIN-14 (AI 01): 09312345678907",
        titleEs: "GTIN-14 (AI 01): 09312345678907",
        detailEn:
          "Optical POS scanner & phone camera compatible (GS1 Sunrise 2027)",
        detailEs:
          "Compatible con lector óptico de punto de venta y cámara móvil",
        metaEn: "Mod-10 ✓",
        metaEs: "Mod-10 ✓",
      },
      {
        icon: "🧪",
        titleEn: "Batch / Lot (AI 10): BATCH-04 · Expiry (AI 17): 2027-12-31",
        titleEs: "Lote (AI 10): BATCH-04 · Caducidad (AI 17): 2027-12-31",
        detailEn:
          "Cold-pressed jojoba, Tasmanian lavender, vitamin E · Small-batch harvest",
        detailEs: "Jojoba prensada en frío, lavanda orgánica, vitamina E",
        metaEn: "Lab Verified",
        metaEs: "Verificado",
      },
      {
        icon: "♻️",
        titleEn: "Packaging & Recycling Passport",
        titleEs: "Pasaporte de Reciclaje y Origen",
        detailEn:
          "Amber UV glass bottle (curbside recyclable) · Dropper cap separate",
        detailEs:
          "Frasco de vidrio ámbar UV (100% reciclable) · Gotero separable",
        metaEn: "ISO 18004",
        metaEs: "ISO 18004",
      },
    ],
    stats: {
      shortCode: "gs1-sol04",
      scans30d: "3,410",
      scans90d: "9,850",
      peakWindow: "12pm–2pm",
      bars: [54, 62, 70, 68, 85, 100, 78],
      citiesEn: "Melbourne (44%) · Sydney (36%) · Brisbane (20%)",
      citiesEs: "CDMX (49%) · Guadalajara (31%) · Querétaro (20%)",
      devices: "iOS 69% · Android 29% · POS/Desktop 2%",
      routingRuleEn:
        "GS1 Digital Link URI resolver + Batch recall / allergen banner toggle",
      routingRuleEs:
        "Resolutor GS1 Digital Link + Aviso dinámico por lote o ingredientes",
      highlightLabelEn: "Batch Recall Readiness",
      highlightLabelEs: "Control por Lote Activo",
      highlightValueEn: "Instant lot notice without reprinting cartons",
      highlightValueEs: "Actualización de lote sin reimprimir cajas",
    },
  },
};

function parseDemoRoute(
  rawSlug: string,
  url: URL,
): { demoKey: DemoKey; gs1PathInfo?: DemoPageData["gs1PathInfo"] } {
  const segments = rawSlug.split("/").filter(Boolean);
  const first = (segments[0] ?? "menu").toLowerCase();

  let demoKey: DemoKey = "menu";
  if (first === "wedding" || first === "weddings" || first === "bodas") {
    demoKey = "wedding";
  } else if (first === "mixtape" || first === "music" || first === "musica") {
    demoKey = "mixtape";
  } else if (first === "drop" || first === "lockers" || first === "archivos") {
    demoKey = "drop";
  } else if (first === "vcard") {
    demoKey = "vcard";
  } else if (first === "gs1") {
    demoKey = "gs1";
  }

  if (demoKey === "gs1") {
    const gtinIdx = segments.indexOf("01");
    const lotIdx = segments.indexOf("10");
    const gtin = gtinIdx >= 0 ? segments[gtinIdx + 1] : undefined;
    const lot = lotIdx >= 0 ? segments[lotIdx + 1] : undefined;
    const expiry = url.searchParams.get("17") ?? undefined;
    return { demoKey, gs1PathInfo: { gtin, lot, expiry } };
  }

  return { demoKey };
}

export const handler: Handlers<DemoPageData> = {
  GET(req, ctx) {
    const url = new URL(req.url);
    const lang: Locale = url.searchParams.get("lang") === "es" ? "es" : "en";
    const { demoKey, gs1PathInfo } = parseDemoRoute(
      ctx.params.slug || "menu",
      url,
    );
    return ctx.render({ demoKey, lang, gs1PathInfo });
  },
};

const DAY_LABELS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function DemoDestinationPage({ data }: PageProps<DemoPageData>) {
  const isSpanish = data.lang === "es";
  const cfg = DEMO_CONFIGS[data.demoKey] ?? DEMO_CONFIGS.menu;
  const dayLabels = isSpanish ? DAY_LABELS_ES : DAY_LABELS_EN;

  const qrDataUrl = toSvgDataUrl(
    buildQrSvgString({
      data: `https://qrbuddy.app/demo/${cfg.key}${isSpanish ? "?lang=es" : ""}`,
      palette: cfg.palette,
      size: 320,
    }),
  );

  const pageTitle = isSpanish
    ? `${cfg.titleEs} — Ejemplo en Vivo | QRBuddy`
    : `${cfg.titleEn} — Live QR Example | QRBuddy`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={isSpanish ? cfg.subtitleEs : cfg.subtitleEn}
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <div class="min-h-screen flex flex-col items-center justify-start px-4 pb-12 pt-8 sm:pt-12 bg-gradient-to-br from-qr-cream via-qr-sunsetMid to-qr-sunset1 text-[#1e1714] selection:bg-pink-300 selection:text-[#1e1714]">
        <main id="main-content" class="w-full max-w-2xl space-y-6 sm:space-y-8">
          {/* Top Navigation Bar */}
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <a
              href={isSpanish ? cfg.studioHrefEs : cfg.studioHrefEn}
              class="inline-flex items-center gap-1.5 px-3.5 min-h-[38px] bg-[#fffef7] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-chunky hover:-translate-y-0.5 transition-transform"
            >
              <span>{isSpanish ? cfg.studioLabelEs : cfg.studioLabelEn}</span>
            </a>

            <span
              class="inline-flex items-center gap-1.5 px-3 min-h-[36px] border-2 border-[#1e1714] rounded-full text-xs font-black text-[#1e1714] shadow-chunky"
              style={{ backgroundColor: cfg.accentBg }}
            >
              {isSpanish ? cfg.badgeEs : cfg.badgeEn}
            </span>
          </div>

          {/* Demo Switcher Pills */}
          <nav
            aria-label={isSpanish ? "Ejemplos en vivo" : "Live QR examples"}
            class="flex flex-wrap items-center justify-center gap-1.5"
          >
            {(
              [
                { k: "menu", labelEn: "📜 Menu", labelEs: "📜 Menú" },
                { k: "wedding", labelEn: "💌 Wedding", labelEs: "💌 Boda" },
                { k: "mixtape", labelEn: "📼 Mixtape", labelEs: "📼 Mixtape" },
                { k: "drop", labelEn: "🔐 File Drop", labelEs: "🔐 Archivo" },
                { k: "vcard", labelEn: "👤 vCard", labelEs: "👤 Contacto" },
                { k: "gs1", labelEn: "📦 GS1 2027", labelEs: "📦 GS1 2027" },
              ] as const
            ).map((tab) => {
              const active = tab.k === cfg.key;
              const href = `/demo/${tab.k}${isSpanish ? "?lang=es" : ""}`;
              return (
                <a
                  key={tab.k}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  class={`px-3 min-h-[34px] inline-flex items-center rounded-full border-2 border-[#1e1714] text-xs font-black transition-all ${
                    active
                      ? "bg-[#f8de7e] text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
                      : "bg-[#fffef7] text-[#343331] hover:bg-[#fbf1e4]"
                  }`}
                >
                  {isSpanish ? tab.labelEs : tab.labelEn}
                </a>
              );
            })}
          </nav>

          {/* CARD 1: FRONT OF THE CARD (What Scanners Experience) */}
          <section
            aria-label={isSpanish
              ? "Vista de quien escanea el código QR"
              : "What scanners see when opening this QR code"}
            class="bg-[#fffef7] border-4 border-[#1e1714] rounded-3xl p-5 sm:p-7 shadow-chunky space-y-5"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#1e1714]/15 pb-4">
              <div class="space-y-1.5">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbf1e4] border-2 border-[#1e1714] text-[11px] font-black uppercase tracking-wider text-[#1e1714]">
                  <span>📱</span>
                  <span>
                    {isSpanish
                      ? "1. Frente de la Tarjeta · Lo que ve quien escanea"
                      : "1. Front of the Card · What Scanners See"}
                  </span>
                </div>
                <p class="font-mono text-xs font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish ? cfg.hostBadgeEs : cfg.hostBadgeEn}
                </p>
                <h1 class="text-2xl sm:text-3xl font-black text-[#1e1714] tracking-tight leading-tight">
                  {isSpanish ? cfg.titleEs : cfg.titleEn}
                </h1>
                <p class="text-xs sm:text-sm font-bold text-[#57524b]">
                  {isSpanish ? cfg.subtitleEs : cfg.subtitleEn}
                </p>
              </div>

              <div class="shrink-0 flex flex-col items-center bg-[#fbf1e4] border-2 border-[#1e1714] rounded-2xl p-2.5 shadow-[3px_3px_0_#1e1714] self-start sm:self-center">
                <img
                  src={qrDataUrl}
                  alt="Sample QR code"
                  width={88}
                  height={88}
                  class="w-20 h-20 rounded-lg"
                />
                <span class="mt-1 font-mono text-[10px] font-black text-[#1e1714]">
                  /demo/{cfg.key}
                </span>
              </div>
            </div>

            {/* Smart Routing / Mode Banner */}
            <div
              class="rounded-2xl border-2 border-[#1e1714] px-3.5 py-2.5 text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714]"
              style={{ backgroundColor: cfg.accentBg }}
            >
              {isSpanish ? cfg.routingBannerEs : cfg.routingBannerEn}
              {cfg.key === "gs1" && data.gs1PathInfo?.gtin && (
                <span class="block mt-1 font-mono text-[11px]">
                  GTIN: {data.gs1PathInfo.gtin}
                  {data.gs1PathInfo.lot
                    ? ` · LOT: ${data.gs1PathInfo.lot}`
                    : ""}
                  {data.gs1PathInfo.expiry
                    ? ` · EXP: ${data.gs1PathInfo.expiry}`
                    : ""}
                </span>
              )}
            </div>

            {/* Interactive Sample Rows */}
            <div class="space-y-2.5">
              {cfg.frontItems.map((item) => (
                <div
                  key={item.titleEn}
                  class="bg-[#fbf1e4] border-2 border-[#1e1714] rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:bg-[#fffef7] transition-colors"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <span class="text-2xl leading-none shrink-0 mt-0.5">
                      {item.icon}
                    </span>
                    <div class="min-w-0">
                      <h2 class="text-sm sm:text-base font-black text-[#1e1714] leading-snug">
                        {isSpanish ? item.titleEs : item.titleEn}
                      </h2>
                      <p class="text-xs font-bold text-[#57524b] leading-snug">
                        {isSpanish ? item.detailEs : item.detailEn}
                      </p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full bg-[#fffef7] border-2 border-[#1e1714] font-mono text-xs font-black text-[#1e1714] shrink-0 whitespace-nowrap shadow-[2px_2px_0_#1e1714]">
                    {isSpanish ? item.metaEs : item.metaEn}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* CARD 2: BACK OF THE CARD (Owner's Field Report, Scan Stats & Live Routing) */}
          <section
            id="back-of-card"
            aria-label={isSpanish
              ? "Reverso de la tarjeta: Estadísticas y Reporte de Campo"
              : "Back of the Card: Live Scan Stats and Field Report"}
            class="bg-[#fbf1e4] border-4 border-[#1e1714] rounded-3xl p-5 sm:p-7 shadow-chunky space-y-5"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#1e1714]/15 pb-4">
              <div class="space-y-1">
                <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f8de7e] border-2 border-[#1e1714] text-[11px] font-black uppercase tracking-wider text-[#1e1714]">
                  <span>📊</span>
                  <span>
                    {isSpanish
                      ? "2. Reverso del QR · Panel de Estadísticas y Ruta"
                      : "2. Back of the Card · Owner Stats & Live Routing"}
                  </span>
                </div>
                <h2 class="text-xl sm:text-2xl font-black text-[#1e1714] tracking-tight">
                  {isSpanish
                    ? "Reporte de Campo (Sin Rastreadores ni Cookies)"
                    : "Field Report & Smart Routing Panel"}
                </h2>
              </div>

              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-full border-2 border-[#1e1714] bg-[#9ef0c8] text-xs font-black text-[#1e1714]">
                  Active ✓
                </span>
                <span class="px-2.5 py-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] font-mono text-xs font-black text-[#1e1714]">
                  /r?code={cfg.stats.shortCode}
                </span>
              </div>
            </div>

            {/* KPI Row */}
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3">
                <span class="text-[10px] font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish ? "Escaneos (30d)" : "30-Day Scans"}
                </span>
                <p class="mt-1 text-xl sm:text-2xl font-black font-mono text-[#1e1714]">
                  {cfg.stats.scans30d}
                </p>
                <span class="text-[11px] font-bold text-[#57524b]">
                  {isSpanish ? "Contador en vivo" : "Live scan counter"}
                </span>
              </div>

              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3">
                <span class="text-[10px] font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish ? "Ventana 90 Días" : "90-Day Window"}
                </span>
                <p class="mt-1 text-xl sm:text-2xl font-black font-mono text-[#1e1714]">
                  {cfg.stats.scans90d}
                </p>
                <span class="text-[11px] font-bold text-[#57524b]">
                  {isSpanish ? "Con Pasaporte 🛂" : "Passport window 🛂"}
                </span>
              </div>

              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3">
                <span class="text-[10px] font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish ? "Hora Pico" : "Peak Rush Hour"}
                </span>
                <p class="mt-1 text-lg sm:text-xl font-black font-mono text-[#1e1714]">
                  {cfg.stats.peakWindow}
                </p>
                <span class="text-[11px] font-bold text-[#57524b]">
                  {isSpanish ? "Mayor actividad" : "Busiest 2h window"}
                </span>
              </div>

              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3">
                <span class="text-[10px] font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish ? "Exportación" : "Raw Data"}
                </span>
                <p class="mt-1 text-base sm:text-lg font-black font-mono text-[#1e1714]">
                  ↓ CSV
                </p>
                <span class="text-[11px] font-bold text-[#57524b]">
                  {isSpanish ? "1 clic · RFC-4180" : "1-click RFC-4180"}
                </span>
              </div>
            </div>

            {/* 7-Day Activity Bar Chart + Breakdown */}
            <div class="grid sm:grid-cols-2 gap-3.5">
              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                    {isSpanish ? "Actividad Semanal" : "7-Day Scan Activity"}
                  </span>
                  <span class="font-mono text-[11px] font-bold text-[#57524b]">
                    7d · 30d · 90d
                  </span>
                </div>
                <div class="h-24 flex items-end justify-between gap-2 pt-2">
                  {cfg.stats.bars.map((pct, i) => (
                    <div
                      key={i}
                      class="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        class="w-full rounded-t-lg border-2 border-[#1e1714] transition-all"
                        style={{
                          height: `${Math.max(10, Math.round(pct * 0.64))}px`,
                          backgroundColor: pct >= 85 ? "#ff6b9d" : cfg.accentBg,
                        }}
                      />
                      <span class="font-mono text-[10px] font-black text-[#1e1714]">
                        {dayLabels[i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 space-y-2.5 flex flex-col justify-between">
                <div>
                  <span class="text-xs font-black uppercase tracking-wider text-[#1e1714]">
                    {isSpanish
                      ? cfg.stats.highlightLabelEs
                      : cfg.stats.highlightLabelEn}
                  </span>
                  <p class="mt-1 text-sm font-black text-[#1e1714]">
                    {isSpanish
                      ? cfg.stats.highlightValueEs
                      : cfg.stats.highlightValueEn}
                  </p>
                </div>

                <div class="space-y-1 pt-2 border-t border-[#1e1714]/15 text-xs">
                  <p class="font-bold text-[#1e1714]">
                    📍 {isSpanish ? cfg.stats.citiesEs : cfg.stats.citiesEn}
                  </p>
                  <p class="font-bold text-[#57524b]">
                    📱 {cfg.stats.devices}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Destination & Routing Strip */}
            <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="space-y-0.5">
                <span class="text-[11px] font-black uppercase tracking-wider text-[#57524b]">
                  {isSpanish
                    ? "Regla de Enrutamiento Activa (Editable después de imprimir)"
                    : "Active Routing Rule (Editable After Printing)"}
                </span>
                <p class="text-xs sm:text-sm font-black text-[#1e1714]">
                  {isSpanish
                    ? cfg.stats.routingRuleEs
                    : cfg.stats.routingRuleEn}
                </p>
              </div>
              <a
                href={isSpanish ? cfg.studioHrefEs : cfg.studioHrefEn}
                class="inline-flex items-center justify-center px-4 min-h-[40px] rounded-full border-2 border-[#1e1714] bg-[#f8de7e] text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 transition-transform shrink-0 whitespace-nowrap"
              >
                {isSpanish
                  ? "Crear un QR como este →"
                  : "Build a QR like this →"}
              </a>
            </div>
          </section>

          {/* Bottom Passport Callout */}
          <div class="bg-[#1e1714] text-[#fffef7] border-3 border-[#1e1714] rounded-2xl px-5 py-3.5 shadow-chunky flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-black">
            <span>
              {isSpanish
                ? "Códigos estáticos y 5 links editables gratis · Pasaporte 100 links + 90 días de estadísticas"
                : "Static codes & 5 editable links free forever · Passport unlocks 100 links + 90-day stats"}
            </span>
            <PricingLink class="text-[#9ef0c8] font-mono font-black hover:underline cursor-pointer">
              {isSpanish ? "Ver Pasaporte 🛂 →" : "Explore Passport 🛂 →"}
            </PricingLink>
          </div>
        </main>

        <FooterDock lang={data.lang} />
        <PricingModal lang={data.lang} />
        <AboutModal lang={data.lang} />
      </div>
    </>
  );
}
