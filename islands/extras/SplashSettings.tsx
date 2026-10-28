import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { getSupporterPass } from "../../utils/supporter-pass.ts";
import { openPricingModal } from "../PricingModal.tsx";

export interface SplashConfig {
  enabled: boolean;
  title: string;
  buttonText: string;
  imageUrl?: string;
  description?: string;
  brandName?: string;
  accentColor?: string;
  unbranded?: boolean;
}

const ACCENT_SWATCHES = [
  { hex: "#FF69B4", label: "Pink" },
  { hex: "#F59E0B", label: "Amber" },
  { hex: "#10B981", label: "Mint" },
  { hex: "#8B5CF6", label: "Violet" },
  { hex: "#3B82F6", label: "Cobalt" },
  { hex: "#EC4899", label: "Rose" },
];

interface SplashSettingsProps {
  splashConfig: Signal<SplashConfig | null>;
  destinationUrl?: string;
  isRoulette?: boolean;
  lang?: Locale;
}

interface Preset {
  label: string;
  labelEs: string;
  icon: string;
  title: string;
  titleEs: string;
  buttonText: string;
  buttonTextEs: string;
  description: string;
  descriptionEs: string;
  brandName?: string;
  brandNameEs?: string;
  accentColor?: string;
  imageUrl?: string;
}

const PRESETS: Preset[] = [
  {
    label: "Roulette Promo",
    labelEs: "Ruleta Promo",
    icon: "🎲",
    title: "Mystery Draw 🎲",
    titleEs: "Sorteo Misterioso 🎲",
    buttonText: "Open Reward 🎁",
    buttonTextEs: "Abrir Premio 🎁",
    description:
      "Daily pocket-tool & reward roulette. Tap below to open today's draw.",
    descriptionEs:
      "Ruleta diaria de premios y sorpresas. Toca abajo para abrir el giro de hoy.",
    brandName: "DAILY DROP",
    brandNameEs: "SORTEO DIARIO",
    accentColor: "#F59E0B",
  },
  {
    label: "Menu & Food",
    labelEs: "Menú y Comida",
    icon: "🌮",
    title: "Tonight's Specials",
    titleEs: "Especiales de Hoy",
    buttonText: "View Full Menu & Drinks 🌯",
    buttonTextEs: "Ver Menú y Bebidas 🌯",
    description:
      "Seasonal tacos, warm sides, and cold craft drinks fresh from the kitchen.",
    descriptionEs:
      "Tacos de temporada, guarniciones calientes y bebidas artesanales bien frías.",
    brandName: "HOUSE KITCHEN",
    brandNameEs: "COCINA DE CASA",
    accentColor: "#FF69B4",
    imageUrl:
      "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Music & Beats",
    labelEs: "Música y Beats",
    icon: "🎧",
    title: "New Track Incoming! 🎧",
    titleEs: "¡Nuevo Track Recién Salido! 🎧",
    buttonText: "Listen to the Master 🔊",
    buttonTextEs: "Escuchar el Master 🔊",
    description:
      "Exclusive unreleased master before streaming release. Headphones recommended.",
    descriptionEs:
      "Master exclusivo antes de salir en plataformas. Mejor con audífonos.",
    brandName: "STUDIO CUT",
    brandNameEs: "CORTE DE ESTUDIO",
    accentColor: "#8B5CF6",
    imageUrl:
      "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80",
  },
  {
    label: "Art & Studio",
    labelEs: "Arte y Estudio",
    icon: "🎨",
    title: "Studio Drop ✨",
    titleEs: "Edición de Estudio ✨",
    buttonText: "Explore the Gallery 🖼️",
    buttonTextEs: "Explorar la Galería 🖼️",
    description:
      "Independent craft, designs, and software experiments made with love and caffeine.",
    descriptionEs:
      "Diseño independiente, arte y experimentos hechos con cariño y buen café.",
    brandName: "ATELIER",
    brandNameEs: "TALLER",
    accentColor: "#10B981",
    imageUrl:
      "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80",
  },
];

export default function SplashSettings(
  { splashConfig, destinationUrl, isRoulette = false, lang }:
    SplashSettingsProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [localConfig, setLocalConfig] = useState<SplashConfig>(
    splashConfig.value || {
      enabled: true,
      title: isSpanish ? "¡Hola!" : "Welcome!",
      buttonText: isSpanish ? "Continuar" : "Continue",
      description: "",
      imageUrl: "",
      brandName: "",
      accentColor: "#FF69B4",
    },
  );
  const [hasPass, setHasPass] = useState(false);

  useEffect(() => {
    setHasPass(Boolean(getSupporterPass()));
  }, []);

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [imageError, setImageError] = useState(false);

  const updateConfig = (updates: Partial<SplashConfig>) => {
    if (updates.imageUrl !== undefined) {
      setImageError(false);
    }
    const newConfig = { ...localConfig, ...updates, enabled: true };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
  };

  const applyPreset = (preset: Preset) => {
    setImageError(false);
    const newConfig: SplashConfig = {
      enabled: true,
      title: isSpanish ? preset.titleEs : preset.title,
      buttonText: isSpanish ? preset.buttonTextEs : preset.buttonText,
      description: isSpanish ? preset.descriptionEs : preset.description,
      brandName: isSpanish
        ? (preset.brandNameEs ?? preset.brandName ?? "")
        : (preset.brandName ?? ""),
      accentColor: preset.accentColor || "#FF69B4",
      imageUrl: preset.imageUrl,
    };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
    haptics.success();
  };

  const cleanDestDomain = destinationUrl
    ? (() => {
      try {
        return new URL(destinationUrl).hostname;
      } catch {
        return destinationUrl;
      }
    })()
    : null;

  const activeAccent = localConfig.accentColor || "#FF69B4";
  const isUnbranded = Boolean(hasPass || localConfig.unbranded);

  return (
    <div class="space-y-4 bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0_#1e1714] animate-slide-down">
      {/* Header & Tab switch */}
      <div class="flex items-center justify-between border-b-2 border-[#1e1714]/10 pb-3">
        <div>
          <h3 class="text-sm font-black text-[#1e1714] uppercase tracking-wide flex items-center gap-1.5">
            <span>✨</span>
            <span>
              {isSpanish ? "Portada y Marca" : "Cover & Brand Card"}
            </span>
          </h3>
          <p class="text-xs text-[#6e6058] font-bold mt-0.5">
            {isSpanish
              ? "Personaliza el título, insignia de marca, color e imagen."
              : "Custom headline, brand badge, accent color, and cover image."}
          </p>
        </div>

        {/* Edit / Preview pill toggle */}
        <div class="flex bg-[#fbf1e4] p-1 rounded-xl border-2 border-[#1e1714] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("edit");
              haptics.light();
            }}
            class={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-black transition-all ${
              activeTab === "edit"
                ? "bg-[#fffef7] text-[#1e1714] border border-[#1e1714]"
                : "text-[#6e6058] hover:text-[#1e1714]"
            }`}
          >
            {isSpanish ? "✏️ Editar" : "✏️ Edit"}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("preview");
              haptics.light();
            }}
            class={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-black transition-all ${
              activeTab === "preview"
                ? "bg-[#1e1714] text-[#fffef7]"
                : "text-[#6e6058] hover:text-[#1e1714]"
            }`}
          >
            {isSpanish ? "👁️ Vista" : "👁️ Preview"}
          </button>
        </div>
      </div>

      {/* Preset Starters (hidden in Roulette mode where Roulette defaults are already loaded) */}
      {!isRoulette && (
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-[#ec4899]">
              {isSpanish ? "Plantillas Rápidas" : "Quick Starters"}
            </span>
            <span class="text-[11px] text-[#6e6058] font-bold">
              {isSpanish ? "1 toque" : "1-tap fill"}
            </span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                class="flex items-center gap-1 px-2 py-2 min-h-[42px] rounded-xl border-2 border-[#1e1714] bg-[#fbf1e4] hover:bg-amber-100 hover:-translate-y-0.5 active:translate-y-0 font-black text-[11px] sm:text-xs text-[#1e1714] transition-all text-left shadow-[2px_2px_0_#1e1714]"
                title={isSpanish ? preset.titleEs : preset.title}
              >
                <span class="text-sm shrink-0">
                  {preset.icon}
                </span>
                <span class="truncate">
                  {isSpanish ? preset.labelEs : preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: Form or Preview */}
      {activeTab === "edit" && (
        <div class="space-y-3.5 pt-1">
          {/* Brand Badge & Accent Color */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#fbf1e4] border-2 border-[#1e1714]/20 rounded-xl p-3">
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-[11px] font-black uppercase tracking-wide text-[#1e1714]">
                  {isSpanish ? "Insignia de marca" : "Brand / Host badge"}
                </label>
                <span class="text-[10px] font-bold text-[#6e6058]">
                  {(localConfig.brandName || "").length}/60
                </span>
              </div>
              <input
                type="text"
                maxLength={60}
                value={localConfig.brandName || ""}
                onInput={(e) =>
                  updateConfig({
                    brandName: (e.target as HTMLInputElement).value,
                  })}
                class="w-full px-3 py-1.5 border-2 border-[#1e1714] rounded-xl focus:border-[#ec4899] focus:outline-none text-xs font-black uppercase tracking-wider bg-[#fffef7] text-[#1e1714]"
                placeholder={isSpanish
                  ? "ej. CAFÉ BRUNSWICK"
                  : "e.g. BRUNSWICK ROASTERS"}
              />
            </div>

            <div>
              <label class="block text-[11px] font-black uppercase tracking-wide text-[#1e1714] mb-1">
                {isSpanish ? "Color de marca" : "Brand accent color"}
              </label>
              <div class="flex items-center gap-1.5 flex-wrap">
                {ACCENT_SWATCHES.map((swatch) => {
                  const selected =
                    activeAccent.toLowerCase() === swatch.hex.toLowerCase();
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => {
                        updateConfig({ accentColor: swatch.hex });
                        haptics.light();
                      }}
                      aria-label={swatch.label}
                      class={`w-7 h-7 rounded-full border-2 border-[#1e1714] transition-transform ${
                        selected
                          ? "scale-110 ring-2 ring-[#1e1714] ring-offset-1"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    />
                  );
                })}
                <label
                  class="w-7 h-7 rounded-full border-2 border-dashed border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-[11px] font-black cursor-pointer hover:bg-amber-50"
                  title={isSpanish ? "Color personalizado" : "Custom hex color"}
                >
                  +
                  <input
                    type="color"
                    value={activeAccent}
                    onInput={(e) =>
                      updateConfig({
                        accentColor: (e.target as HTMLInputElement).value,
                      })}
                    class="sr-only"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Title & Button Text */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-xs font-black uppercase tracking-wide text-[#1e1714]">
                  {isSpanish ? "Título *" : "Headline *"}
                </label>
                <span class="text-[10px] font-bold text-[#6e6058]">
                  {localConfig.title.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={localConfig.title}
                onInput={(e) =>
                  updateConfig({ title: (e.target as HTMLInputElement).value })}
                class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[#ec4899] focus:outline-none text-sm font-bold bg-[#fffef7] text-[#1e1714]"
                placeholder={isSpanish
                  ? "ej. Ruleta Diaria"
                  : "e.g. Mystery Draw"}
              />
            </div>

            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="block text-xs font-black uppercase tracking-wide text-[#1e1714]">
                  {isSpanish ? "Botón *" : "Button Text *"}
                </label>
                <span class="text-[10px] font-bold text-[#6e6058]">
                  {localConfig.buttonText.length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={localConfig.buttonText}
                onInput={(e) =>
                  updateConfig({
                    buttonText: (e.target as HTMLInputElement).value,
                  })}
                class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[#ec4899] focus:outline-none text-sm font-bold bg-[#fffef7] text-[#1e1714]"
                placeholder={isSpanish
                  ? "ej. Abrir premio"
                  : "e.g. Open reward"}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-[#1e1714]">
                {isSpanish
                  ? "Nota o reglas (opcional)"
                  : "Subtitle / Rules (Optional)"}
              </label>
              <span class="text-[10px] font-bold text-[#6e6058]">
                {(localConfig.description || "").length}/500
              </span>
            </div>
            <textarea
              maxLength={500}
              value={localConfig.description || ""}
              onInput={(e) =>
                updateConfig({
                  description: (e.target as HTMLTextAreaElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[#ec4899] focus:outline-none text-sm font-medium resize-none bg-[#fffef7] text-[#1e1714]"
              rows={2}
              placeholder={isSpanish
                ? "Detalles del sorteo, menú o instrucciones..."
                : "Show at the counter, daily spin rules, or release notes..."}
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black uppercase tracking-wide text-[#1e1714]">
                {isSpanish
                  ? "Logo o imagen (URL opcional)"
                  : "Logo / Image URL (Optional)"}
              </label>
              {localConfig.imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    updateConfig({ imageUrl: "" });
                    haptics.light();
                  }}
                  class="text-[10px] font-black text-[#4a3f39] hover:text-[#1e1714] underline"
                >
                  {isSpanish ? "✕ Quitar" : "✕ Clear"}
                </button>
              )}
            </div>
            <input
              type="url"
              value={localConfig.imageUrl || ""}
              onInput={(e) =>
                updateConfig({
                  imageUrl: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[#ec4899] focus:outline-none text-xs font-mono bg-[#fffef7] text-[#1e1714]"
              placeholder="https://example.com/logo-or-banner.jpg"
            />
          </div>

          {/* White-Label / Paid Customer Branding Row */}
          <div class="pt-1">
            {isUnbranded
              ? (
                <div class="flex items-center justify-between gap-2 rounded-xl border-2 border-[#1e1714] bg-emerald-100 px-3 py-2 text-xs font-black text-[#1e1714]">
                  <span>
                    {isSpanish
                      ? "✓ Marca blanca activa · Sin sello de QRBuddy"
                      : "✓ White-label active · QRBuddy footer hidden"}
                  </span>
                </div>
              )
              : (
                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    openPricingModal();
                  }}
                  class="w-full flex items-center justify-between gap-2 rounded-xl border-2 border-[#1e1714] bg-[#fbf1e4] hover:bg-amber-100 px-3 py-2 text-left text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] transition-all"
                >
                  <span>
                    {isSpanish
                      ? "✨ Ocultar sello «Hecho con QRBuddy» (Marca blanca)"
                      : "✨ Hide 'Built with QRBuddy' footer (White-label)"}
                  </span>
                  <span class="shrink-0 rounded-full border border-[#1e1714] bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase">
                    {isSpanish ? "Pase Plus" : "Supporter Pass"}
                  </span>
                </button>
              )}
          </div>
        </div>
      )}

      {/* Live Preview Card */}
      {activeTab === "preview" && (
        <div class="py-2 animate-pop-in">
          <div class="rounded-2xl border-3 border-[#1e1714] bg-[#fffef7] p-5 shadow-[4px_4px_0px_0px_#1e1714] text-center max-w-sm mx-auto space-y-3 relative overflow-hidden">
            {/* Brand pill */}
            {localConfig.brandName?.trim() && (
              <div>
                <span
                  class="inline-flex items-center justify-center px-3 py-1 rounded-full border-2 border-[#1e1714] bg-[#fbf1e4] text-[10px] font-black uppercase tracking-wider text-[#1e1714]"
                  style={{ boxShadow: `2px 2px 0px 0px ${activeAccent}` }}
                >
                  {localConfig.brandName.trim()}
                </span>
              </div>
            )}

            {/* Cover image */}
            {localConfig.imageUrl && !imageError && (
              <div class="rounded-xl border-2 border-[#1e1714] overflow-hidden bg-pink-50 max-h-44 shadow-sm">
                <img
                  src={localConfig.imageUrl}
                  alt={isSpanish ? "Imagen de portada" : "Cover image"}
                  class="w-full h-36 object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            )}

            {/* Title */}
            <h4 class="text-xl font-black text-[#1e1714] tracking-tight leading-tight pt-1 break-words">
              {localConfig.title || (isSpanish ? "¡Hola!" : "Welcome!")}
            </h4>

            {/* Description */}
            {localConfig.description && (
              <p class="text-xs text-[#4a3f39] font-semibold leading-relaxed whitespace-pre-wrap max-h-28 overflow-y-auto px-1 break-words">
                {localConfig.description}
              </p>
            )}

            {/* Button */}
            <div class="pt-2">
              <div
                class="w-full min-h-[46px] rounded-xl border-3 border-[#1e1714] bg-[#1e1714] text-[#fffef7] font-extrabold text-sm py-2.5 px-4 flex items-center justify-center gap-1.5 cursor-default"
                style={{ boxShadow: `3px 3px 0px 0px ${activeAccent}` }}
              >
                <span>
                  {localConfig.buttonText ||
                    (isSpanish ? "Continuar" : "Continue")}
                </span>
                <span>→</span>
              </div>
              {cleanDestDomain && (
                <p class="text-[10px] text-[#6e6058] font-semibold mt-1.5 truncate">
                  {isSpanish ? "Abre:" : "Opens:"} {cleanDestDomain}
                </p>
              )}
            </div>

            {/* Footer enamel badge */}
            {!isUnbranded && (
              <div class="pt-3 border-t border-[#1e1714]/10 flex items-center justify-center">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-[#1e1714] bg-pink-100 text-[10px] font-black text-[#1e1714] shadow-[1.5px_1.5px_0px_0px_#1e1714]">
                  <span>⚡</span>
                  <span>
                    {isSpanish
                      ? (
                        <>
                          Hecho con <strong>QRBuddy</strong> · Gratis siempre
                        </>
                      )
                      : (
                        <>
                          Built with <strong>QRBuddy</strong> · Free forever
                        </>
                      )}
                  </span>
                </div>
              </div>
            )}
          </div>

          <p class="text-center text-[11px] text-[#6e6058] font-bold mt-3">
            {isSpanish
              ? "✨ Vista previa de la tarjeta al escanear el código."
              : "✨ Preview of the card shown on each scan."}
          </p>
        </div>
      )}
    </div>
  );
}
