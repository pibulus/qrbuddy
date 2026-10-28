import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import { looksLikeUrl } from "../../utils/url.ts";
import { isPlusLibraryEnabled } from "../../utils/auth.ts";
import { fetchLibraryQuota, LibraryQuota } from "../../utils/library.ts";
import { getOrCreatePassport, QRBuddyPassport } from "../../utils/passport.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface EditableLinkSettingsProps {
  editUrl: Signal<string>;
  /** The URL currently in the main input — what the editable QR will wrap. */
  pendingUrl: string;
  isCreating: boolean;
  onCreate: () => void;
  isSequential?: boolean;
  sequentialUrls?: string[];
  randomSequence?: boolean;
  dailySpins?: number | null;
  lang?: Locale;
}

export default function EditableLinkSettings({
  editUrl,
  pendingUrl,
  isCreating,
  onCreate,
  isSequential,
  sequentialUrls,
  randomSequence = false,
  dailySpins = null,
  lang,
}: EditableLinkSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const [libraryEnabled] = useState(() => isPlusLibraryEnabled());
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [quota, setQuota] = useState<LibraryQuota | null>(null);

  useEffect(() => {
    if (!libraryEnabled) return;

    let mounted = true;
    const p = getOrCreatePassport();
    setPassport(p);

    fetchLibraryQuota().then((q) => {
      if (mounted) setQuota(q);
    }).catch(() => {});

    const onPassport = () => {
      if (!mounted) return;
      const updated = getOrCreatePassport();
      setPassport(updated);
      fetchLibraryQuota().then((q) => {
        if (mounted) setQuota(q);
      }).catch(() => {});
    };

    globalThis.addEventListener("qrb-passport-changed", onPassport);
    globalThis.addEventListener("qrb-passport-synced", onPassport);

    return () => {
      mounted = false;
      globalThis.removeEventListener("qrb-passport-changed", onPassport);
      globalThis.removeEventListener("qrb-passport-synced", onPassport);
    };
  }, [libraryEnabled]);

  const hasContent = pendingUrl.trim() !== "";
  const validSeqCount = isSequential && sequentialUrls
    ? sequentialUrls.filter((u) => looksLikeUrl(u)).length
    : 0;
  const hasSequentialRoutes = validSeqCount >= 2;
  // Editable QRs wrap links only — WiFi/vCard/text payloads stay static.
  const hasLink = isSequential
    ? hasSequentialRoutes
    : hasContent && looksLikeUrl(pendingUrl);

  const isOverQuota = libraryEnabled && quota && !quota.can_create;
  const canSubmit = hasLink && !isCreating && !isOverQuota;

  return (
    <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3.5 space-y-2.5 animate-slide-down shadow-[2px_2px_0_#1e1714]">
      {!editUrl.value && (
        <div class="space-y-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-base shrink-0">✨</span>
              <span class="font-black text-xs text-[#1e1714] truncate">
                {isSequential
                  ? (hasSequentialRoutes
                    ? (randomSequence
                      ? (isSpanish
                        ? `Ruleta con ${validSeqCount} links${
                          dailySpins ? ` (${dailySpins}/día)` : ""
                        }`
                        : `Roulette with ${validSeqCount} links${
                          dailySpins ? ` (${dailySpins}/day)` : ""
                        }`)
                      : (isSpanish
                        ? `Envuelve ${validSeqCount} links rotativos`
                        : `Wraps ${validSeqCount} rotating links`))
                    : (isSpanish
                      ? `Agrega ${
                        validSeqCount === 1
                          ? "un link más"
                          : "al menos dos links"
                      } arriba`
                      : `Add ${
                        validSeqCount === 1 ? "one more" : "at least two"
                      } valid links above`))
                  : hasLink
                  ? (isSpanish
                    ? `Apunta a ${pendingUrl}`
                    : `Wraps ${pendingUrl}`)
                  : hasContent
                  ? (isSpanish
                    ? "Necesita un link web (https://…)"
                    : "Editable needs a web link (https://…)")
                  : (isSpanish
                    ? "Agrega un link de destino en Contenido"
                    : "Add a destination link in Content first")}
              </span>
            </div>

            {libraryEnabled && (
              <button
                type="button"
                onClick={() =>
                  globalThis.dispatchEvent(new CustomEvent("qrb-open-library"))}
                class="px-2.5 py-1 text-[11px] font-black rounded-full border border-[#1e1714] bg-amber-100 hover:bg-amber-200 active:scale-95 transition-transform shrink-0"
              >
                {passport?.avatarEmoji || "🦎"} {quota
                  ? `${quota.used_count}/${quota.total_allowed}`
                  : (isSpanish ? "Biblioteca" : "Library")} ↗
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              haptics.medium();
              onCreate();
            }}
            class="qr-pitch-cta min-h-[44px] py-2 text-sm"
          >
            {isCreating
              ? (isSpanish ? "Creando…" : "Creating…")
              : isOverQuota
              ? (isSpanish
                ? `Límite gratis alcanzado (${quota?.used_count}/${quota?.total_allowed})`
                : `Free limit reached (${quota?.used_count}/${quota?.total_allowed})`)
              : isSequential && randomSequence
              ? (isSpanish ? "🎲 Crear QR de ruleta" : "🎲 Create roulette QR")
              : (isSpanish
                ? "✦ Crear link editable"
                : "✦ Create editable link")}
          </button>
        </div>
      )}
      {editUrl.value && (
        <div class="space-y-2 animate-slide-down">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-black text-[#1e1714]">
              ✨ {isSpanish ? "¡QR editable activo!" : "Editable QR active!"}
            </p>
            <a
              href={`mailto:?subject=${
                encodeURIComponent(
                  isSpanish
                    ? "Tu link de edición de QRBuddy"
                    : "Your QRBuddy edit link",
                )
              }&body=${
                encodeURIComponent(
                  isSpanish
                    ? `Guarda este link — es tu llave para editar tu QR cuando quieras.\n\n${editUrl.value}`
                    : `Keep this safe — it's the only way to edit your QR later.\n\n${editUrl.value}`,
                )
              }`}
              class="text-[11px] font-bold text-[#ec4899] underline underline-offset-2 hover:text-[#1e1714]"
              onClick={() => haptics.light()}
            >
              {isSpanish ? "📧 Enviar por correo" : "📧 Email key"}
            </a>
          </div>
          <div class="flex gap-2">
            <input
              type="text"
              value={editUrl.value}
              readOnly
              class="flex-1 min-h-[40px] px-3 py-1.5 bg-[#fffef7] border-2 border-[#1e1714] rounded-xl text-xs font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(editUrl.value);
                  haptics.success();
                  addToast(
                    isSpanish
                      ? "¡Link de edición copiado! 📋"
                      : "Edit link copied! 📋",
                  );
                } catch {
                  haptics.error();
                  addToast(
                    isSpanish
                      ? "No se pudo copiar al portapapeles"
                      : "Couldn't reach the clipboard",
                    3000,
                  );
                }
              }}
              class="min-h-[40px] px-3.5 py-1.5 bg-[#fbbf24] text-[#1e1714] border-2 border-[#1e1714] rounded-xl font-black text-xs shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 transition-transform"
            >
              {isSpanish ? "Copiar" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
