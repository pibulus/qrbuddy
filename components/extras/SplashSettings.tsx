import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";
import { getSupporterPass } from "../../utils/supporter-pass.ts";
import { openPricingModal } from "../../islands/PricingModal.tsx";

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

interface SplashSettingsProps {
  splashConfig: Signal<SplashConfig | null>;
  destinationUrl?: string;
  isRoulette?: boolean;
  defaultAccentColor?: string;
  embedded?: boolean;
  lang?: Locale;
}

export default function SplashSettings(
  {
    splashConfig,
    defaultAccentColor = "#EC4899",
    embedded = false,
    lang,
  }: SplashSettingsProps,
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
      accentColor: defaultAccentColor,
    },
  );
  const [hasPass, setHasPass] = useState(false);

  useEffect(() => {
    setHasPass(Boolean(getSupporterPass()));
  }, []);

  const updateConfig = (updates: Partial<SplashConfig>) => {
    const newConfig = { ...localConfig, ...updates, enabled: true };
    setLocalConfig(newConfig);
    splashConfig.value = newConfig;
  };

  const isUnbranded = Boolean(hasPass || localConfig.unbranded);
  const shellClass = embedded
    ? "space-y-3.5"
    : "space-y-4 bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0_#1e1714] animate-slide-down";

  return (
    <div class={shellClass}>
      <div class="border-b border-[#1e1714]/10 pb-2.5">
        <h3 class="text-sm font-black text-[#1e1714]">
          {isSpanish ? "Portada" : "Cover card"}
        </h3>
      </div>

      {/* One short form; the QR palette supplies the accent. */}
      <div class="space-y-3">
        {/* Brand Badge & Accent Color (flattened — no extra nested box) */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-xs font-black text-[#1e1714] mb-1">
                {isSpanish ? "Insignia de marca" : "Brand badge"}
              </label>
            </div>
            <input
              type="text"
              maxLength={60}
              value={localConfig.brandName || ""}
              onInput={(e) =>
                updateConfig({
                  brandName: (e.target as HTMLInputElement).value,
                })}
              class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none text-xs font-black bg-[#fffef7] text-[#1e1714]"
              placeholder={isSpanish
                ? "ej. Café Brunswick"
                : "e.g. Brunswick Roasters"}
            />
          </div>
        </div>

        {/* Title & Button Text */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[#1e1714] mb-1">
              {isSpanish ? "Título" : "Headline"}
            </label>
            <input
              type="text"
              maxLength={100}
              value={localConfig.title}
              onInput={(e) =>
                updateConfig({ title: (e.target as HTMLInputElement).value })}
              class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none text-sm font-bold bg-[#fffef7] text-[#1e1714]"
              placeholder={isSpanish
                ? "ej. Ruleta diaria"
                : "e.g. Mystery draw"}
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[#1e1714] mb-1">
              {isSpanish ? "Texto del botón" : "Button text"}
            </label>
            <input
              type="text"
              maxLength={50}
              value={localConfig.buttonText}
              onInput={(e) => updateConfig({
                buttonText: (e.target as HTMLInputElement).value,
              })}
              class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none text-sm font-bold bg-[#fffef7] text-[#1e1714]"
              placeholder={isSpanish ? "ej. Abrir premio" : "e.g. Open reward"}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label class="block text-xs font-black text-[#1e1714] mb-1">
            {isSpanish ? "Nota (opcional)" : "Subtitle (optional)"}
          </label>
          <textarea
            maxLength={500}
            value={localConfig.description || ""}
            onInput={(e) =>
              updateConfig({
                description: (e.target as HTMLTextAreaElement).value,
              })}
            class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none text-sm font-medium resize-none bg-[#fffef7] text-[#1e1714]"
            rows={2}
            placeholder={isSpanish
              ? "Detalles del sorteo, menú o instrucciones..."
              : "Show at the counter, daily spin rules, or release notes..."}
          />
        </div>

        {/* Cover Image URL */}
        <div>
          <div class="flex justify-between items-center mb-1">
            <label class="block text-xs font-black text-[#1e1714]">
              {isSpanish
                ? "Logo o imagen (opcional)"
                : "Logo or image (optional)"}
            </label>
            {localConfig.imageUrl && (
              <button
                type="button"
                onClick={() => {
                  updateConfig({ imageUrl: "" });
                  haptics.light();
                }}
                class="text-[10px] font-black text-[#4a3f39] hover:text-[#1e1714] underline whitespace-nowrap"
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
            class="w-full px-3 py-2 border-2 border-[#1e1714] rounded-xl focus:border-[var(--qr-theme-accent,#ec4899)] focus:outline-none text-xs font-mono bg-[#fffef7] text-[#1e1714]"
            placeholder="https://example.com/logo-or-banner.jpg"
          />
        </div>

        {/* White-Label / Paid Customer Branding Row */}
        <div class="pt-0.5">
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
                class="w-full flex items-center justify-between gap-2 rounded-xl border-2 border-[#1e1714] bg-[#fbf1e4] hover:bg-[var(--qr-theme-tint,#fce7f3)] px-3 py-2 text-left text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] transition-all"
              >
                <span class="truncate">
                  {isSpanish
                    ? "✨ Ocultar sello «Hecho con QRBuddy»"
                    : "✨ Hide 'Built with QRBuddy' footer"}
                </span>
                <span class="shrink-0 rounded-full border border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap">
                  {isSpanish ? "Pase Plus" : "Passport"}
                </span>
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
