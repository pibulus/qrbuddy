import { useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { useKeypad } from "../../hooks/useKeypad.ts";
import type { CreateBucketOptions } from "../../hooks/useBucketCreator.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface LockerSettingsProps {
  isActive: boolean;
  bucketUrl: string;
  isCreating: boolean;
  onClose: () => void;
  onDisable: () => void;
  onConfirm: (options: CreateBucketOptions) => Promise<boolean>;
  lang?: Locale;
}

export default function LockerSettings({
  isActive,
  bucketUrl,
  isCreating,
  onClose,
  onDisable,
  onConfirm,
  lang,
}: LockerSettingsProps) {
  const isSpanish = getClientLocale(lang) === "es";
  const [lockerMode, setLockerMode] = useState<"open" | "single" | "pingpong">(
    "open",
  );
  const [lockerRequirePin, setLockerRequirePin] = useState(false);
  const [lockerError, setLockerError] = useState<string | null>(null);

  const {
    digits: lockerPinDigits,
    handlePress: handleKeypadPress,
    reset: resetLockerPin,
    value: lockerPinValue,
  } = useKeypad(4);

  const handleConfirm = async () => {
    if (isCreating) return;

    setLockerError(null);

    if (lockerRequirePin && lockerPinValue.length !== 4) {
      setLockerError(
        isSpanish
          ? "Ingresa un PIN de 4 dígitos para proteger el buzón."
          : "Enter a 4-digit PIN to lock the locker.",
      );
      haptics.error();
      return;
    }

    const success = await onConfirm({
      bucketType: "file",
      isReusable: lockerMode === "open" || lockerMode === "pingpong",
      deleteOnDownload: lockerMode === "pingpong",
      password: lockerRequirePin ? lockerPinValue : undefined,
    });

    if (!success) {
      setLockerError(
        isSpanish
          ? "No se pudo crear el buzón. Intenta de nuevo en un momento."
          : "Couldn't create locker. Try again in a moment.",
      );
    }
  };

  const handleDisable = () => {
    onDisable();
    setLockerMode("open");
    setLockerRequirePin(false);
    resetLockerPin();
    setLockerError(null);
  };

  return (
    <div class="qr-menu-pod p-3.5 space-y-3.5 animate-slide-down">
      {isActive
        ? (
          <div class="space-y-3.5">
            <div>
              <h3 class="qr-section-eyebrow">
                <span class="qr-section-pip" aria-hidden="true" />
                <span>
                  {isSpanish
                    ? "Buzón listo para compartir"
                    : "Locker ready to share"}
                </span>
              </h3>
              <p class="text-xs font-medium text-[#5c4f47] mt-1">
                {isSpanish
                  ? "Imprime o envía este QR para que suban fotos o archivos."
                  : "Print or share this QR so guests can drop files in."}
              </p>
            </div>
            <div class="bg-[#fbf1e4] border-2 border-[#1e1714]/20 rounded-xl p-3 text-xs font-mono font-bold break-all text-[#1e1714]">
              {bucketUrl ||
                (isSpanish ? "Generando URL..." : "Generating URL...")}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="min-h-[42px] px-4 py-2 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] hover:bg-[#fbf1e4] transition-all"
                onClick={onClose}
              >
                {isSpanish ? "Listo" : "Done"}
              </button>
              <button
                type="button"
                class="min-h-[42px] px-4 py-2 rounded-xl border-2 border-amber-500 text-xs font-black text-amber-950 bg-amber-50 hover:bg-amber-100 transition-colors"
                onClick={handleDisable}
              >
                {isSpanish ? "Olvidar este buzón" : "Forget this locker"}
              </button>
            </div>
            <p class="text-[11px] font-medium text-[#6e6058]">
              {isSpanish
                ? "Olvidarlo sólo lo quita de este dispositivo; el link sigue funcionando."
                : "Forgetting clears it from this device; the link keeps working for anyone with it."}
            </p>
          </div>
        )
        : (
          <div class="space-y-3.5">
            <div>
              <h3 class="qr-section-eyebrow">
                <span class="qr-section-pip" aria-hidden="true" />
                <span>
                  {isSpanish ? "Buzón compartido" : "Shared drop folder"}
                </span>
              </h3>
              <p class="text-xs font-medium text-[#5c4f47] mt-1">
                {isSpanish
                  ? "Elige qué pasa después de cada descarga."
                  : "Choose how files behave after someone downloads."}
              </p>
            </div>

            <div class="space-y-1.5">
              <span class="qr-field-label">
                {isSpanish ? "Retención" : "Retention Mode"}
              </span>
              <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]">
                {[
                  {
                    id: "open" as const,
                    en: "Keep files",
                    es: "Conservar",
                  },
                  {
                    id: "pingpong" as const,
                    en: "Relay",
                    es: "Relevo",
                  },
                  {
                    id: "single" as const,
                    en: "1-time burn",
                    es: "1 descarga",
                  },
                ].map((opt) => {
                  const active = lockerMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setLockerMode(opt.id);
                        haptics.light();
                      }}
                      class={`min-h-[42px] px-2 py-1 text-xs font-black leading-tight rounded-lg border-2 transition-all ${
                        active
                          ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                          : "border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/60"
                      }`}
                    >
                      {isSpanish ? opt.es : opt.en}
                    </button>
                  );
                })}
              </div>
              <p class="text-[11px] font-semibold text-[#5c4f47]">
                {lockerMode === "open" &&
                  (isSpanish
                    ? "Los archivos permanecen en el buzón para que cualquiera los descargue."
                    : "Files stay in the locker so everyone with the QR can view & download.")}
                {lockerMode === "pingpong" &&
                  (isSpanish
                    ? "Al descargar se vacía el archivo y el buzón queda listo para el siguiente."
                    : "Downloading clears the file and leaves the locker open for the next drop.")}
                {lockerMode === "single" &&
                  (isSpanish
                    ? "Todo el buzón se autodestruye tras una sola descarga."
                    : "The entire locker self-destructs after a single download.")}
              </p>
            </div>

            <div class="space-y-2.5">
              <div class="flex items-center justify-between gap-3 px-3 py-2 bg-[#fbf1e4] rounded-xl border-2 border-[#1e1714]/20">
                <div>
                  <p class="text-xs font-black text-[#1e1714]">
                    🔒{" "}
                    {isSpanish
                      ? "Pedir PIN de 4 dígitos"
                      : "Require 4-digit PIN"}
                  </p>
                  <p class="text-[11px] font-medium text-[#6e6058]">
                    {isSpanish
                      ? "Protege subidas y descargas con código."
                      : "Locks uploads and downloads behind a code."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={lockerRequirePin}
                  onClick={() => {
                    const next = !lockerRequirePin;
                    setLockerRequirePin(next);
                    if (!next) resetLockerPin();
                    haptics.light();
                  }}
                  class={`min-w-[58px] min-h-[34px] px-3 rounded-full border-2 text-xs font-black transition-all ${
                    lockerRequirePin
                      ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                      : "border-[#1e1714]/25 bg-[#fffef7] text-[#4a3f39]"
                  }`}
                >
                  {lockerRequirePin
                    ? (isSpanish ? "Sí" : "On")
                    : (isSpanish ? "No" : "Off")}
                </button>
              </div>

              {lockerRequirePin && (
                <div class="space-y-2.5 animate-slide-down">
                  <div class="flex justify-center gap-2.5">
                    {lockerPinDigits.map((digit, index) => (
                      <div
                        key={`locker-pin-${index}`}
                        class="w-10 h-11 bg-[#fffef7] border-2 border-[#1e1714] rounded-xl flex items-center justify-center text-xl font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                      >
                        {digit ? "•" : ""}
                      </div>
                    ))}
                  </div>
                  <div class="grid grid-cols-3 gap-1.5">
                    {[
                      "1",
                      "2",
                      "3",
                      "4",
                      "5",
                      "6",
                      "7",
                      "8",
                      "9",
                      "clear",
                      "0",
                      "back",
                    ].map((key) => (
                      <button
                        key={`locker-pad-${key}`}
                        type="button"
                        class={`min-h-[40px] rounded-xl text-xs font-black border-2 transition-all active:translate-y-[1px] ${
                          key === "clear" || key === "back"
                            ? "border-[#1e1714]/25 bg-[#fbf1e4] text-[#4a3f39] hover:border-[#1e1714]"
                            : "border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_1.5px_0_#1e1714] hover:bg-[var(--qr-theme-tint,#fce7f3)]"
                        }`}
                        onClick={() => handleKeypadPress(String(key))}
                      >
                        {key === "clear"
                          ? (isSpanish ? "Borrar" : "Clear")
                          : key === "back"
                          ? "⌫"
                          : key}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {lockerError && (
              <p
                role="alert"
                class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs font-bold text-amber-950"
              >
                {lockerError}
              </p>
            )}

            <button
              type="button"
              class="qr-pitch-cta disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={isCreating}
            >
              <span>
                {isCreating
                  ? (isSpanish ? "Creando buzón…" : "Creating file locker…")
                  : (isSpanish
                    ? "📥 Crear buzón de archivos"
                    : "📥 Create file locker")}
              </span>
            </button>
          </div>
        )}
    </div>
  );
}
