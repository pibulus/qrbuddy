import { haptics } from "../../utils/haptics.ts";
import { sounds } from "../../utils/sounds.ts";
import { QR_TEMPLATES, type QRTemplateType } from "../../types/qr-templates.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import type { ActiveTab } from "../CreateModal.tsx";

const TEMPLATE_LABELS_ES: Record<QRTemplateType, string> = {
  url: "Enlace",
  text: "Texto",
  wifi: "Wi-Fi",
  vcard: "Contacto",
  sms: "SMS",
  email: "Correo",
  phone: "Llamada",
  social: "Redes",
  media: "Archivo",
};

/**
 * The stage under the QR is three tiers of the same warm paper, told apart
 * by how far they stand off the page. The QR card is the hero (its own
 * recipe in QRCanvas). Below it:
 *
 *  - STAGE_INPUT    the URL bar: 3px sepia border, 3px lip. Border stays
 *                   sepia at rest even when valid; the ✓ does that job.
 *                   Theme accent only on focus.
 *  - STAGE_WELL     a recessed track for mode switches: 2px border, no
 *                   outer shadow, creamy ground with a hairline inset lip.
 *                   Only the active segment inside it lifts 1.5px.
 *  - STAGE_TOOL_BTN panel triggers: 2px border, 2px lip, neutral paper.
 *                   The one whose panel is open latches down (see LATCHED).
 */
export const STAGE_INPUT =
  "bg-[#fffef7] border-3 border-[#1e1714] rounded-2xl shadow-[0_3px_0_#1e1714]";

export const STAGE_WELL =
  "bg-[#f7ecdc] border-2 border-[#1e1714] rounded-xl shadow-[inset_0_2px_0_rgba(30,23,20,0.08)] p-0.5";

export const STAGE_TOOL_BTN =
  "bg-[#fffef7] border-2 border-[#1e1714] rounded-xl shadow-[0_2px_0_#1e1714]";

/** Keycap physics: lift a hair on hover, click into the surface on press. */
export const STAGE_PRESS =
  "transition-[transform,box-shadow,background-color] duration-[70ms] ease-out hover:-translate-y-px hover:shadow-[0_3px_0_#1e1714] active:translate-y-[2px] active:shadow-none";

const LATCHED =
  "translate-y-[2px] shadow-none bg-[var(--qr-theme-tint,#fdf2f8)] hover:translate-y-[2px] hover:shadow-none";

const TILE_BASE =
  `${STAGE_PRESS} border-2 border-[#1e1714] rounded-xl shadow-[0_2px_0_#1e1714] h-[40px] flex items-center justify-center gap-1.5 font-black text-[13px] whitespace-nowrap`;

const TILE =
  `${TILE_BASE} bg-[#fffef7] text-[#1e1714] hover:bg-[var(--qr-theme-tint,#fdf2f8)]`;

export type StagePanel = ActiveTab;

type Glyph =
  | QRTemplateType
  | "bucket"
  | "batch"
  | "history"
  | "palette"
  | "magnifier";

/** Monochrome 16px line glyphs so the row never leans on emoji. */
function StageGlyph({ kind }: { kind: Glyph }) {
  const paths: Record<Glyph, string> = {
    url:
      "M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07",
    text: "M4 6h16M4 12h16M4 18h10",
    wifi:
      "M2 8.5a16 16 0 0 1 20 0M5.5 12.5a11 11 0 0 1 13 0M9 16.5a5 5 0 0 1 6 0M12 20h.01",
    vcard:
      "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4.5 17a4 4 0 0 1 7 0M14 9h5M14 13h5",
    sms:
      "M21 12a8 8 0 0 1-8 8H8l-5 3 1.2-4.6A8 8 0 1 1 21 12zM8 12h.01M12 12h.01M16 12h.01",
    email: "M3 6h18v12H3zM3 7l9 6 9-6",
    phone:
      "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z",
    social:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
    media:
      "M4 5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM14 3v6h6",
    bucket: "M4 7h16l-1.5 13h-13zM4 7l2-4h12l2 4",
    batch: "M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10",
    history: "M12 3a9 9 0 1 1-6.36 2.64M3 3v5h5M12 7v5l3 2",
    palette:
      "M12 3a9 9 0 0 0 0 18c1.4 0 2-.9 2-2 0-.6-.3-1-.3-1.6 0-1 .8-1.4 1.8-1.4H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 12h.01M10 8h.01M14.5 8h.01",
    magnifier: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM21 21l-5.2-5.2",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="shrink-0"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

interface SmartInputToolbarProps {
  selectedTemplate: QRTemplateType;
  onOpenCreate: (tab: ActiveTab) => void;
  createHasUpdates: boolean;
  /** Which panel is open right now, so its trigger can latch down. */
  openPanel?: StagePanel | null;
  isBucket?: boolean;
  isBatchMode?: boolean;
  lang?: Locale;
}

export default function SmartInputToolbar({
  selectedTemplate,
  onOpenCreate,
  createHasUpdates,
  openPanel = null,
  isBucket = false,
  isBatchMode = false,
  lang,
}: SmartInputToolbarProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const templateMeta = QR_TEMPLATES[selectedTemplate];
  const activeGlyph: Glyph = isBatchMode
    ? "batch"
    : isBucket
    ? "bucket"
    : selectedTemplate;
  const activeLabel = isBatchMode
    ? (isSpanish ? "Lote" : "Bulk")
    : isBucket
    ? (isSpanish ? "Buzón" : "Locker")
    : isSpanish
    ? (TEMPLATE_LABELS_ES[selectedTemplate] ?? templateMeta.label)
    : templateMeta.label;
  const press = (fn: () => void) => () => {
    fn();
    haptics.light();
    sounds.click();
  };

  const latch = (panel: StagePanel | StagePanel[]) => {
    const list = Array.isArray(panel) ? panel : [panel];
    return openPanel && list.includes(openPanel) ? LATCHED : "";
  };

  return (
    <div class="grid grid-cols-2 gap-2.5 w-full">
      {/* What the QR holds — current type, opens Content (and Behavior) */}
      <button
        type="button"
        onClick={press(() => onOpenCreate("type"))}
        aria-expanded={openPanel === "type" || openPanel === "options"}
        class={`${TILE} ${latch(["type", "options"])} relative min-w-0 px-3`}
        title={isSpanish
          ? "Cambiar el tipo de QR: enlace, Wi-Fi, contacto, archivo…"
          : "Change the QR type: link, Wi-Fi, contact card, file…"}
        aria-label={isSpanish
          ? `Tipo de QR: ${activeLabel}. Cambiar tipo`
          : `QR type: ${activeLabel}. Change type`}
      >
        <StageGlyph kind={activeGlyph} />
        <span class="truncate">{activeLabel}</span>
        <span aria-hidden="true" class="text-[10px] opacity-60 shrink-0">
          ▾
        </span>
        {createHasUpdates && (
          <span class="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-[var(--qr-theme-accent,#ec4899)] border-2 border-[#1e1714] animate-pulse" />
        )}
      </button>

      {/* How it looks — palette, logo, frame, shapes */}
      <button
        type="button"
        onClick={press(() => onOpenCreate("design"))}
        aria-expanded={openPanel === "design"}
        class={`${TILE} ${latch("design")} min-w-0 px-3`}
        title={isSpanish
          ? "Colores, logo, marco y forma de los módulos"
          : "Colours, logo, print frame and dot shapes"}
      >
        <StageGlyph kind="palette" />
        {isSpanish ? "Diseño" : "Design"}
      </button>
    </div>
  );
}
