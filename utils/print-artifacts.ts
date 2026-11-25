import qrcode from "qrcode-generator";
import type { Locale } from "./i18n.ts";
import { resolveQRStyle } from "./qr-design.ts";
import { styledQrSvg } from "./qr-renderer.ts";
import { contrastRatio, getQRThemeTokens } from "./qr-styles.ts";
import { buildQrSvgString, toSvgDataUrl } from "./qr-vector-svg.ts";
import { stripSvgBackgroundRect } from "./svg-export.ts";
import { parseVCard, parseWiFi } from "../types/qr-templates.ts";
import type { QRStyle } from "../types/qr-types.ts";

export interface SignMetadata {
  kind: "wifi" | "vcard" | "event" | "whatsapp" | "location" | "url" | "text";
  badge: string;
  title: string;
  primaryLine: string;
  secondaryLine?: string;
  instruction: string;
  hasSecret?: boolean;
  secretLabel?: string;
  secretValue?: string;
}

export interface PrintArtifactOptions {
  data: string;
  style?: QRStyle | null;
  styleKey?: string;
  logoUrl?: string;
  caption?: string;
  lang?: Locale;
  defaultLayout?: "sign" | "tent";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSignQrSvgUrl(options: PrintArtifactOptions): string {
  const resolved = resolveQRStyle(
    options.styleKey || "sunset",
    options.style ?? undefined,
  );
  const cleanStyle: QRStyle = { ...resolved };
  const payload = options.data || "https://qrbuddy.app";
  let svg: string;
  try {
    svg = styledQrSvg({
      size: 1000,
      data: payload,
      style: cleanStyle,
      logoUrl: options.logoUrl,
    });
  } catch {
    svg = buildQrSvgString({
      data: payload,
      size: 1000,
      palette: options.styleKey || "sunset",
      c1: cleanStyle.dots.color ??
        cleanStyle.dots.gradient?.colorStops[0]?.color,
      c2: cleanStyle.dots.color ??
        cleanStyle.dots.gradient?.colorStops.at(-1)?.color,
      bg: cleanStyle.background.color ??
        cleanStyle.background.gradient?.colorStops[0]?.color,
      dotShape: "rounded",
      renderMode: "classic",
      errorCorrectionLevel: "L",
    });
  }
  if (
    cleanStyle.transparentBg &&
    (cleanStyle.renderMode ?? "classic") === "classic" &&
    (cleanStyle.print ?? "clean") === "clean"
  ) {
    svg = stripSvgBackgroundRect(svg);
  }
  return toSvgDataUrl(svg);
}

export function estimatePrintSpecForPayload(
  data: string,
  options?: { logoUrl?: string; dotShape?: string },
): { moduleCount: number; minMm: number; minInches: number } {
  const payload = (data || "https://qrbuddy.app").trim();
  const hasMark = Boolean(
    options?.logoUrl &&
      /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/i.test(options.logoUrl),
  );
  const ecl =
    hasMark || options?.dotShape === "diamond" || options?.dotShape === "dots"
      ? "H"
      : "Q";
  let moduleCount = 29;
  try {
    const qr = qrcode(0, ecl);
    qr.addData(payload);
    qr.make();
    moduleCount = qr.getModuleCount();
  } catch {
    try {
      const qr = qrcode(0, "L");
      qr.addData(payload);
      qr.make();
      moduleCount = qr.getModuleCount();
    } catch {
      moduleCount = 177;
    }
  }
  const safeModules = Math.max(21, moduleCount);
  const totalModules = safeModules + 8;
  const minMm = Math.max(15, Math.round(totalModules * 0.45));
  const minInches = Math.round((minMm / 25.4) * 10) / 10;
  return { moduleCount: safeModules, minMm, minInches };
}

function formatIcsDateCompact(raw: string, es: boolean): string {
  const trimmed = raw.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(trimmed);
  if (dt) {
    const hhmm = `${dt[4]}:${dt[5]}`;
    return `${dt[3]}/${dt[2]}/${dt[1]} ${es ? "a las" : "at"} ${hhmm}`;
  }
  return trimmed;
}

export function extractSignMetadata(
  payload: string,
  caption?: string,
  lang: Locale = "en",
): SignMetadata {
  const es = lang === "es";
  const raw = (payload || "https://qrbuddy.app").trim();
  const customHeading = caption?.trim() || "";

  const wifi = parseWiFi(raw);
  if (wifi) {
    const open = wifi.encryption === "nopass" || !wifi.password;
    return {
      kind: "wifi",
      badge: "WI-FI",
      title: customHeading || wifi.ssid,
      primaryLine: `${es ? "Red" : "Network"}: ${wifi.ssid}`,
      secondaryLine: open
        ? (es ? "Red abierta (sin contraseña)" : "Open network (no password)")
        : undefined,
      instruction: es
        ? "Apunta con tu cámara para conectarte al instante"
        : "Point your phone camera to join automatically",
      hasSecret: !open,
      secretLabel: es ? "Contraseña" : "Password",
      secretValue: open ? undefined : wifi.password,
    };
  }

  const vcard = parseVCard(raw);
  if (vcard) {
    const fullName = [vcard.firstName, vcard.lastName]
      .filter(Boolean)
      .join(" ") ||
      vcard.organization ||
      (es ? "Tarjeta de contacto" : "Contact card");
    const roleLine = [vcard.jobTitle, vcard.organization]
      .filter(Boolean)
      .join(" · ");
    const channelLine = [vcard.phone, vcard.email].filter(Boolean).join(" · ");
    return {
      kind: "vcard",
      badge: es ? "CONTACTO" : "CONTACT",
      title: customHeading || fullName,
      primaryLine: roleLine || channelLine || fullName,
      secondaryLine: roleLine ? channelLine || undefined : undefined,
      instruction: es
        ? "Escanea para guardar este contacto"
        : "Scan to save straight to contacts",
    };
  }

  if (/BEGIN:VEVENT/i.test(raw)) {
    const summary = raw.match(/^SUMMARY:(.+)$/im)?.[1]
      ?.replace(/\\([,;\\])/g, "$1")
      .trim() ?? (es ? "Evento" : "Event");
    const dtStart = raw.match(/^DTSTART(?:;[^:]*)?:([^\r\n]+)/im)?.[1] ?? "";
    const location = raw.match(/^LOCATION:(.+)$/im)?.[1]
      ?.replace(/\\([,;\\])/g, "$1")
      .trim() ?? "";
    return {
      kind: "event",
      badge: es ? "EVENTO" : "EVENT",
      title: customHeading || summary,
      primaryLine: dtStart
        ? formatIcsDateCompact(dtStart, es)
        : (es ? "Guardar en calendario" : "Add to calendar"),
      secondaryLine: location || undefined,
      instruction: es
        ? "Escanea para agregar al calendario"
        : "Scan to add event to your calendar",
    };
  }

  if (/^https?:\/\/wa\.me\/\d+/i.test(raw)) {
    const digits = raw.match(/^https?:\/\/wa\.me\/(\d+)/i)?.[1] ?? "";
    let textPreview = "";
    try {
      const parsed = new URL(raw);
      textPreview = parsed.searchParams.get("text")?.trim() ?? "";
    } catch {
      textPreview = "";
    }
    return {
      kind: "whatsapp",
      badge: "WHATSAPP",
      title: customHeading ||
        (es ? "Escríbenos por WhatsApp" : "Chat on WhatsApp"),
      primaryLine: digits ? `+${digits}` : "WhatsApp",
      secondaryLine: textPreview ? `"${textPreview.slice(0, 64)}"` : undefined,
      instruction: es
        ? "Escanea para abrir el chat al instante"
        : "Scan to open a pre-filled WhatsApp chat",
    };
  }

  if (
    /^geo:[-+\d.,]+/i.test(raw) ||
    /^https?:\/\/(?:www\.)?(?:maps\.google\.|google\.[^/]+\/maps|maps\.apple\.com)/i
      .test(raw)
  ) {
    let placeLabel = raw;
    if (/^geo:/i.test(raw)) {
      placeLabel = raw.replace(/^geo:/i, "").split("?")[0];
    } else {
      try {
        const parsed = new URL(raw);
        placeLabel = parsed.searchParams.get("q") ||
          parsed.searchParams.get("query") ||
          parsed.pathname.replace(/^\/maps\/?/, "") ||
          parsed.hostname;
      } catch {
        placeLabel = raw;
      }
    }
    return {
      kind: "location",
      badge: es ? "UBICACIÓN" : "MAP PIN",
      title: customHeading || (es ? "Cómo llegar" : "Directions"),
      primaryLine: placeLabel.slice(0, 72),
      instruction: es
        ? "Escanea para abrir en tu app de mapas"
        : "Scan to open location in maps",
    };
  }

  if (/^https?:\/\//i.test(raw)) {
    let hostPath = raw;
    try {
      const u = new URL(raw);
      const cleanPath = u.pathname === "/" ? "" : u.pathname;
      hostPath = `${u.hostname.replace(/^www\./, "")}${cleanPath}`;
    } catch {
      hostPath = raw;
    }
    return {
      kind: "url",
      badge: customHeading ? customHeading.toUpperCase().slice(0, 14) : "SCAN",
      title: customHeading || hostPath.split("/")[0] || "QRBuddy",
      primaryLine: hostPath.slice(0, 64),
      instruction: es
        ? "Apunta con la cámara de tu teléfono"
        : "Point your phone camera at the code",
    };
  }

  return {
    kind: "text",
    badge: es ? "NOTA" : "NOTE",
    title: customHeading || (es ? "Nota rápida" : "Quick note"),
    primaryLine: raw.split(/\r?\n/)[0].slice(0, 64),
    instruction: es
      ? "Escanea para leer el contenido completo"
      : "Scan to read full note",
  };
}

function renderCardMarkup(
  meta: SignMetadata,
  svgUrl: string,
  accent: string,
  es: boolean,
  variant: "sign" | "tent",
): string {
  const isWifi = meta.kind === "wifi";
  const secretHtml = meta.hasSecret && meta.secretValue
    ? `<div class="cred-row secret-row">
        <span class="cred-key">${escapeHtml(meta.secretLabel ?? "")}</span>
        <code class="cred-val">${escapeHtml(meta.secretValue)}</code>
      </div>`
    : "";

  const networkOrDetailHtml = meta.primaryLine
    ? `<div class="cred-row">
        ${
      isWifi ? `<span class="cred-key">${es ? "Red" : "Network"}</span>` : ""
    }
        <span class="cred-val">${
      escapeHtml(
        isWifi
          ? meta.primaryLine.replace(/^(?:Red|Network):\s*/i, "")
          : meta.primaryLine,
      )
    }</span>
      </div>`
    : "";

  const secondaryHtml = meta.secondaryLine
    ? `<p class="subline">${escapeHtml(meta.secondaryLine)}</p>`
    : "";

  const badgeInk = (() => {
    try {
      return contrastRatio(accent, "#fffef7") >= 4.5 ? "#fffef7" : "#1e1714";
    } catch {
      return "#fffef7";
    }
  })();

  return `
    <article class="card ${variant === "tent" ? "card-tent" : "card-sign"}">
      <div class="accent-strip" style="background:${escapeHtml(accent)}"></div>
      <div class="card-inner">
        <span class="badge" style="background:${
    escapeHtml(accent)
  };color:${badgeInk}">${escapeHtml(meta.badge)}</span>
        <h1 class="sign-title">${escapeHtml(meta.title)}</h1>
        <div class="qr-frame">
          <img src="${svgUrl}" alt="QR code" />
        </div>
        <div class="details">
          ${networkOrDetailHtml}
          ${secretHtml}
          ${secondaryHtml}
        </div>
        <p class="instruction">${escapeHtml(meta.instruction)}</p>
      </div>
      <span class="crop-mark crop-tl" aria-hidden="true"></span>
      <span class="crop-mark crop-tr" aria-hidden="true"></span>
      <span class="crop-mark crop-bl" aria-hidden="true"></span>
      <span class="crop-mark crop-br" aria-hidden="true"></span>
    </article>`;
}

/**
 * Standalone printable Counter Sign (A6 plaque) & Foldable Table Tent (2-sided A4/Letter)
 * generated straight from any active QR code with crisp Soft Neo Toybrut typography.
 */
export function buildCounterCardPrintHtml(
  options: PrintArtifactOptions,
): string {
  const es = options.lang === "es";
  const styleKey = options.styleKey || "sunset";
  const tokens = getQRThemeTokens(styleKey, options.style);
  const svgUrl = buildSignQrSvgUrl(options);
  const meta = extractSignMetadata(options.data, options.caption, options.lang);
  const initialLayout = options.defaultLayout === "tent" ? "tent" : "sign";

  const signCard = renderCardMarkup(meta, svgUrl, tokens.accent, es, "sign");
  const tentCard = renderCardMarkup(meta, svgUrl, tokens.accent, es, "tent");

  const docTitle = `${meta.title} · ${
    es ? "Letrero para imprimir" : "Printable Sign"
  }`;

  const initialPageRule = initialLayout === "tent"
    ? "@page { size: A4 portrait; margin: 8mm; }"
    : "@page { size: 105mm 148mm; margin: 0; }";

  return `<!doctype html>
<html lang="${es ? "es" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  <style id="page-size-rule">${initialPageRule}</style>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fbf1e4;
      color: #1e1714;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #fffef7;
      border-bottom: 3px solid #1e1714;
      padding: 10px 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .toolbar-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .btn {
      min-height: 36px;
      padding: 6px 14px;
      border-radius: 999px;
      border: 2px solid #1e1714;
      background: #fffef7;
      color: #1e1714;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
    }
    .btn.active {
      background: #ffbe0b;
      box-shadow: 0 2px 0 #1e1714;
    }
    .btn-primary {
      background: #ffbe0b;
      box-shadow: 0 2px 0 #1e1714;
    }
    .toggle-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1.5px solid rgba(30,23,20,0.28);
      background: #fbf1e4;
    }
    .stage {
      padding: 20px 12px 36px;
      display: flex;
      justify-content: center;
    }
    .card {
      background: #fffef7;
      border: 3px solid #1e1714;
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 4px 0 #1e1714;
    }
    .card-sign {
      width: 105mm;
      max-width: 100%;
    }
    .accent-strip {
      height: 7mm;
      border-bottom: 2.5px solid #1e1714;
    }
    .card-inner {
      padding: 7mm 7mm 6mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 3.5mm;
    }
    .badge {
      display: inline-block;
      padding: 1.2mm 3.5mm;
      border-radius: 999px;
      border: 2px solid #1e1714;
      color: #fffef7;
      font-size: 9pt;
      font-weight: 900;
      letter-spacing: 0.08em;
    }
    .sign-title {
      margin: 0;
      font-size: 17pt;
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: -0.02em;
      word-break: break-word;
    }
    .qr-frame {
      width: 66mm;
      height: 66mm;
      padding: 2.5mm;
      border-radius: 14px;
      border: 2.5px solid #1e1714;
      background: #fffef7;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-frame img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }
    .details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 2mm;
    }
    .cred-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex-wrap: wrap;
      background: #fbf1e4;
      border: 1.8px solid #1e1714;
      border-radius: 10px;
      padding: 2mm 3mm;
      font-size: 10pt;
      font-weight: 800;
    }
    .cred-key {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #574c44;
      font-weight: 900;
    }
    .cred-val {
      font-weight: 900;
      word-break: break-all;
    }
    code.cred-val {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #fffef7;
      padding: 1px 6px;
      border-radius: 6px;
      border: 1px solid rgba(30,23,20,0.25);
    }
    .subline {
      margin: 0;
      font-size: 9pt;
      font-weight: 700;
      color: #574c44;
      word-break: break-word;
    }
    .instruction {
      margin: 0;
      font-size: 9pt;
      font-weight: 700;
      color: #4a3f39;
    }

    /* Foldable 2-sided table tent */
    .tent-sheet {
      width: 120mm;
      display: none;
      flex-direction: column;
      align-items: center;
    }
    .tent-half {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    .tent-half-top {
      transform: rotate(180deg);
    }
    .card-tent {
      width: 112mm;
      box-shadow: none;
    }
    .card-tent .card-inner {
      padding: 5mm 6mm;
      gap: 2.5mm;
    }
    .card-tent .sign-title {
      font-size: 14pt;
    }
    .card-tent .qr-frame {
      width: 52mm;
      height: 52mm;
    }
    .fold-line {
      width: 100%;
      margin: 4mm 0;
      border-top: 1.5px dashed #574c44;
      text-align: center;
      line-height: 0;
    }
    .fold-line span {
      background: #fbf1e4;
      padding: 0 8px;
      font-size: 8pt;
      font-weight: 900;
      letter-spacing: 0.1em;
      color: #574c44;
    }

    body[data-layout="tent"] .sign-only { display: none; }
    body[data-layout="tent"] .tent-sheet { display: flex; }
    body[data-hide-secret="true"] .secret-row { display: none !important; }
    .crop-mark {
      display: none;
      position: absolute;
      width: 3.5mm;
      height: 3.5mm;
      pointer-events: none;
    }
    body[data-crop-marks="true"] .card { position: relative; overflow: visible; }
    body[data-crop-marks="true"] .crop-mark { display: block; }
    .crop-tl { top: -2.5mm; left: -2.5mm; border-top: 0.35mm solid #1e1714; border-left: 0.35mm solid #1e1714; }
    .crop-tr { top: -2.5mm; right: -2.5mm; border-top: 0.35mm solid #1e1714; border-right: 0.35mm solid #1e1714; }
    .crop-bl { bottom: -2.5mm; left: -2.5mm; border-bottom: 0.35mm solid #1e1714; border-left: 0.35mm solid #1e1714; }
    .crop-br { bottom: -2.5mm; right: -2.5mm; border-bottom: 0.35mm solid #1e1714; border-right: 0.35mm solid #1e1714; }

    @media print {
      html, body { background: #fffef7 !important; height: auto; }
      .no-print { display: none !important; }
      .stage { padding: 0; margin: 0; }
      .card { box-shadow: none; break-inside: avoid; page-break-inside: avoid; }
      body[data-layout="sign"] .stage {
        width: 105mm;
        height: 147mm;
        padding: 4mm;
        align-items: center;
      }
      body[data-layout="sign"] .sign-only {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      body[data-layout="sign"] .card-sign {
        width: 97mm;
        max-height: 138mm;
      }
      body[data-layout="sign"] .card-inner {
        padding: 4.5mm 5mm;
        gap: 2.5mm;
      }
      body[data-layout="sign"] .qr-frame {
        width: 54mm;
        height: 54mm;
        padding: 2mm;
      }
      body[data-layout="sign"] .sign-title {
        font-size: 15pt;
      }
      .fold-line span { background: #fffef7; }
    }
  </style>
</head>
<body data-layout="${initialLayout}">
  <header class="toolbar no-print">
    <div class="toolbar-group">
      <button type="button" id="btn-sign" class="btn ${
    initialLayout === "sign" ? "active" : ""
  }" onclick="setLayout('sign')">
        🪧 ${es ? "Letrero A6" : "Counter Sign (A6)"}
      </button>
      <button type="button" id="btn-tent" class="btn ${
    initialLayout === "tent" ? "active" : ""
  }" onclick="setLayout('tent')">
        ⛺ ${
    es ? "Caballete plegable (2 caras)" : "Foldable Table Tent (2-sided)"
  }
      </button>
      ${
    meta.hasSecret
      ? `<label class="toggle-label">
          <input type="checkbox" checked onchange="document.body.dataset.hideSecret = this.checked ? 'false' : 'true'" />
          <span>${es ? "Mostrar contraseña" : "Show password on sign"}</span>
        </label>`
      : ""
  }
      <label class="toggle-label">
        <input type="checkbox" onchange="document.body.dataset.cropMarks = this.checked ? 'true' : 'false'" />
        <span>✂ ${es ? "Marcas de corte" : "Crop marks"}</span>
      </label>
    </div>
    <button type="button" class="btn btn-primary" onclick="window.print()">
      🖨 ${es ? "Imprimir / Guardar PDF" : "Print / Save PDF"}
    </button>
  </header>

  <main class="stage">
    <div class="sign-only">
      ${signCard}
    </div>
    <section class="tent-sheet" aria-label="${
    es ? "Caballete imprimible" : "Printable table tent"
  }">
      <div class="tent-half tent-half-top">${tentCard}</div>
      <div class="fold-line"><span>✂ ${
    es ? "DOBLAR AQUÍ" : "FOLD HERE"
  }</span></div>
      <div class="tent-half">${tentCard}</div>
    </section>
  </main>

  <script>
    function setLayout(mode) {
      document.body.dataset.layout = mode;
      var rule = document.getElementById('page-size-rule');
      if (rule) {
        rule.textContent = mode === 'tent'
          ? '@page { size: A4 portrait; margin: 8mm; }'
          : '@page { size: 105mm 148mm; margin: 0; }';
      }
      document.getElementById('btn-sign').classList.toggle('active', mode === 'sign');
      document.getElementById('btn-tent').classList.toggle('active', mode === 'tent');
    }
  </script>
</body>
</html>`;
}

/**
 * Generates a 1-page physical millimeter Print Proof Sheet (`15 / 20 / 25 / 35 / 50 mm`)
 * with an actual-size 50 mm calibration bar so packaging designers & print shops can test
 * real camera focus on physical stock before committing to a bulk press run.
 */
export function buildPrintProofSheetHtml(
  options: PrintArtifactOptions,
): string {
  const es = options.lang === "es";
  const styleKey = options.styleKey || "sunset";
  const resolved = resolveQRStyle(styleKey, options.style ?? undefined);
  const svgUrl = buildSignQrSvgUrl(options);
  const spec = estimatePrintSpecForPayload(options.data, {
    logoUrl: options.logoUrl,
    dotShape: resolved.dots?.shape,
  });
  const totalModules = spec.moduleCount + 8;

  const sizesMm = [15, 20, 25, 35, 50] as const;
  const specimensHtml = sizesMm
    .map((mm) => {
      const pitchMm = (mm / totalModules).toFixed(2);
      const recommended = mm >= spec.minMm;
      const statusText = recommended
        ? (es ? "✓ Óptimo" : "✓ Recommended")
        : (es ? "⚠ Probar cámara" : "⚠ Test focus");
      const statusClass = recommended ? "ok" : "warn";
      return `
      <figure class="specimen">
        <div class="specimen-box" style="width:${mm}mm;height:${mm}mm;">
          <img src="${svgUrl}" alt="${mm}mm QR test" style="width:${mm}mm;height:${mm}mm;" />
        </div>
        <figcaption>
          <strong>${mm} × ${mm} mm</strong>
          <span>${pitchMm} mm/${es ? "mód" : "mod"}</span>
          <span class="verdict ${statusClass}">${statusText}</span>
        </figcaption>
      </figure>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${es ? "es" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${
    es
      ? "Hoja de prueba de impresión · QRBuddy"
      : "Print Size Proof Sheet · QRBuddy"
  }</title>
  <style>
    @page { size: auto; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fffef7;
      color: #1e1714;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      background: #fbf1e4;
      border-bottom: 3px solid #1e1714;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-print {
      min-height: 36px;
      padding: 6px 16px;
      border-radius: 999px;
      border: 2px solid #1e1714;
      background: #ffbe0b;
      box-shadow: 0 2px 0 #1e1714;
      font-weight: 900;
      font-size: 13px;
      cursor: pointer;
    }
    .sheet {
      max-width: 186mm;
      margin: 14px auto;
      padding: 6mm;
      border: 2px solid #1e1714;
      border-radius: 14px;
      background: #fffef7;
    }
    .sheet-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      padding-bottom: 4mm;
      border-bottom: 2px solid #1e1714;
    }
    .sheet-head h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: 900;
    }
    .sheet-head p {
      margin: 2px 0 0;
      font-size: 9pt;
      color: #574c44;
      font-weight: 600;
    }
    .ruler-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .ruler {
      width: 50mm;
      height: 6mm;
      border: 2px solid #1e1714;
      background: repeating-linear-gradient(
        to right,
        #1e1714 0,
        #1e1714 1mm,
        #fffef7 1mm,
        #fffef7 10mm
      );
    }
    .ruler-caption {
      font-size: 7.5pt;
      font-weight: 800;
      color: #4a3f39;
    }
    .grid {
      margin-top: 7mm;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 7mm 5mm;
    }
    .specimen {
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2mm;
    }
    .specimen-box {
      outline: 1px dashed rgba(30,23,20,0.35);
      outline-offset: 1mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .specimen-box img {
      display: block;
      object-fit: contain;
    }
    figcaption {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1px;
    }
    figcaption strong {
      font-size: 9.5pt;
      font-weight: 900;
    }
    figcaption span {
      font-size: 8pt;
      color: #574c44;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 700;
    }
    .verdict {
      font-family: inherit !important;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid #1e1714;
      font-size: 7.5pt !important;
      font-weight: 900 !important;
      margin-top: 2px;
    }
    .verdict.ok {
      background: #dcfce7;
      color: #1e1714;
    }
    .verdict.warn {
      background: #fef3c7;
      color: #1e1714;
    }
    .foot {
      margin-top: 8mm;
      padding-top: 3mm;
      border-top: 1.5px solid rgba(30,23,20,0.2);
      font-size: 8.5pt;
      color: #4a3f39;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    @media print {
      .no-print { display: none !important; }
      .sheet { border: 0; margin: 0; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <header class="toolbar no-print">
    <span style="font-size:13px;font-weight:900;">
      📏 ${
    es
      ? "Imprime al 100% (Tamaño real) · Mide la barra de 50 mm con una regla"
      : "Print at 100% (Actual Size) · Verify the 50 mm bar with a ruler"
  }
    </span>
    <button type="button" class="btn-print" onclick="window.print()">
      🖨 ${es ? "Imprimir hoja de prueba" : "Print proof sheet"}
    </button>
  </header>

  <main class="sheet">
    <div class="sheet-head">
      <div>
        <h1>${
    es ? "Prueba física de tamaño QR" : "QR Physical Size Proof Sheet"
  }</h1>
        <p>${
    es
      ? `Matriz ${spec.moduleCount}×${spec.moduleCount} · Mínimo recomendado ${spec.minMm} mm (${spec.minInches}″)`
      : `${spec.moduleCount}×${spec.moduleCount} grid · Recommended floor ${spec.minMm} mm (${spec.minInches}″)`
  }</p>
      </div>
      <div class="ruler-wrap">
        <div class="ruler" aria-label="50 mm calibration bar"></div>
        <span class="ruler-caption">50 mm (5.0 cm) ${
    es ? "referencia" : "calibration"
  }</span>
      </div>
    </div>

    <section class="grid" aria-label="${
    es ? "Muestras en milímetros" : "Millimeter test specimens"
  }">
      ${specimensHtml}
    </section>

    <footer class="foot">
      <span>${
    es
      ? "Escanea cada tamaño con tu teléfono a la distancia de uso real."
      : "Test each print with your phone camera from real reading distance."
  }</span>
      <span>qrbuddy.app</span>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Opens a standalone HTML print artifact inside the synchronous click stack;
 * falls back to clean file download if the browser blocks pop-ups.
 */
export function openPrintArtifactWindow(
  html: string,
  fallbackFilename: string,
): "opened" | "downloaded" {
  try {
    const win = globalThis.open?.("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus?.();
      return "opened";
    }
  } catch {
    // Fall back to download below
  }
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fallbackFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  return "downloaded";
}
