import { useEffect, useState } from "preact/hooks";
import { useModalShell } from "./modal/useModalShell.ts";
import {
  buildPassportSyncUrl,
  getOrCreatePassport,
  parsePassportFromUrl,
  QRBuddyPassport,
  renderPassportQrSvg,
  rerollPassportIdentity,
} from "../utils/passport.ts";
import {
  claimLegacyCode,
  fetchLibrary,
  importLocalHistoryCodes,
  LibraryCodeItem,
  LibraryQuota,
} from "../utils/library.ts";
import {
  getHistory,
  type HistoryItem,
  removeFromHistory,
} from "../utils/history.ts";
import { exportSyncBundle, importSyncBundle } from "../utils/sync-phrase.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (item: HistoryItem) => void;
  lang?: Locale;
}

export default function LibraryDrawer(
  { isOpen, onClose, onSelect, lang }: LibraryDrawerProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<LibraryCodeItem[]>([]);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [ownerTokensByCode, setOwnerTokensByCode] = useState<
    Record<string, string>
  >({});
  const [quota, setQuota] = useState<LibraryQuota | null>(null);
  const [search, setSearch] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importToken, setImportToken] = useState("");
  const [importing, setImporting] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupInput, setBackupInput] = useState("");
  const [backupPhraseInput, setBackupPhraseInput] = useState("");

  const refreshLocalHistory = async (
    serverCodes: LibraryCodeItem[] = codes,
  ) => {
    const hist = getHistory();
    setLocalHistory(hist);

    const shortCodes = new Set<string>();
    for (const item of hist) {
      if (item.metadata?.shortCode) {
        shortCodes.add(String(item.metadata.shortCode));
      }
    }
    for (const c of serverCodes) {
      if (c.short_code) {
        shortCodes.add(c.short_code);
      }
    }

    if (shortCodes.size > 0) {
      const nextTokens: Record<string, string> = {};
      for (const sc of shortCodes) {
        const tok = await getOwnerToken("dynamic", sc);
        if (tok) nextTokens[sc] = tok;
      }
      setOwnerTokensByCode((prev) => ({ ...prev, ...nextTokens }));
    }
  };

  // Initialize passport, local history & check URL hash on open
  useEffect(() => {
    void refreshLocalHistory();

    // Check if URL contains passport sync credentials
    const synced = parsePassportFromUrl();
    if (synced) {
      setPassport(synced);
      addToast(
        isSpanish
          ? "✨ ¡Sincronizado con tu Pasaporte QRBuddy!"
          : "✨ Synced with your QRBuddy Passport!",
        3500,
      );
    } else {
      const p = getOrCreatePassport();
      setPassport(p);
    }

    const onPassportChanged = () => {
      const p = getOrCreatePassport();
      setPassport(p);
      loadLibraryData();
    };
    const onHistoryUpdated = () => {
      void refreshLocalHistory();
    };

    globalThis.addEventListener("qrb-passport-changed", onPassportChanged);
    globalThis.addEventListener("qrb-passport-synced", onPassportChanged);
    globalThis.addEventListener("history-updated", onHistoryUpdated);

    return () => {
      globalThis.removeEventListener("qrb-passport-changed", onPassportChanged);
      globalThis.removeEventListener("qrb-passport-synced", onPassportChanged);
      globalThis.removeEventListener("history-updated", onHistoryUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const p = getOrCreatePassport();
    setPassport(p);
    void refreshLocalHistory();
    loadLibraryData();
  }, [isOpen]);

  const loadLibraryData = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetchLibrary(query);
      if (res.success) {
        setCodes(res.codes);
        setQuota(res.quota);
        void refreshLocalHistory(res.codes);
      }
    } catch (err) {
      console.warn("Failed to load library:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySyncUrl = async () => {
    if (!passport) return;
    haptics.light();
    const url = buildPassportSyncUrl(passport);
    try {
      await navigator.clipboard.writeText(url);
      addToast(
        isSpanish
          ? "📋 ¡Link de sincronización copiado! Ábrelo en otro dispositivo para vincularlo"
          : "📋 Sync link copied! Open on any device to pair",
        3000,
      );
    } catch {
      addToast(
        isSpanish
          ? "No se pudo copiar el link automáticamente"
          : "Could not copy link automatically",
        3000,
      );
    }
  };

  const handleRerollMoniker = () => {
    if (!passport) return;
    haptics.light();
    const updated = rerollPassportIdentity(passport);
    setPassport(updated);
    addToast(
      isSpanish
        ? `🎲 ¡Nuevo apodo: ${updated.avatarEmoji} ${updated.name}!`
        : `🎲 Re-rolled to ${updated.avatarEmoji} ${updated.name}!`,
      3000,
    );
  };

  const handleCopyEncryptedBackup = async () => {
    if (!passport) return;
    setIsExportingBackup(true);
    try {
      const bundle = await exportSyncBundle(passport.phrase);
      await navigator.clipboard.writeText(bundle);
      haptics.success();
      addToast(
        isSpanish
          ? "¡Respaldo cifrado copiado! 📋"
          : "Encrypted sync backup copied! 📋",
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo generar el respaldo"
          : "Couldn't generate sync backup",
      );
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleImportEncryptedBackup = async (e: Event) => {
    e.preventDefault();
    if (!backupInput.trim() || !passport) return;

    setIsImportingBackup(true);
    try {
      const phraseToUse = backupPhraseInput.trim() || passport.phrase;
      const result = await importSyncBundle(backupInput.trim(), phraseToUse);
      await refreshLocalHistory();
      setPassport(getOrCreatePassport());
      haptics.success();
      const manageLinks = result.ownerTokensRestored
        ? (isSpanish
          ? " · se restauraron " + result.ownerTokensRestored + " llaves"
          : " · restored " + result.ownerTokensRestored + " manage links")
        : "";
      addToast(
        result.historySaved
          ? (isSpanish
            ? "¡Se sincronizaron " + result.mergedHistoryCount +
              " elementos" + manageLinks + "! ☁️✨"
            : "Synced " + result.mergedHistoryCount + " items" + manageLinks +
              " from other device! ☁️✨")
          : (isSpanish
            ? "No se pudo guardar el historial en este dispositivo" +
              manageLinks
            : "Couldn't save synced history on this device" + manageLinks),
      );
      setBackupInput("");
      setBackupPhraseInput("");
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "Respaldo inválido o frase incorrecta"
          : "Invalid sync backup or wrong phrase",
      );
    } finally {
      setIsImportingBackup(false);
    }
  };

  const handleClaimLegacy = async (e: Event) => {
    e.preventDefault();
    if (!importToken.trim()) return;

    setImporting(true);
    haptics.light();

    try {
      const res = await claimLegacyCode(importToken.trim());
      if (res.success) {
        haptics.success();
        addToast(
          isSpanish
            ? "✨ ¡QR anterior guardado en tu biblioteca!"
            : "✨ Pre-launch QR code claimed into your library!",
          4000,
        );
        setImportToken("");
        setShowImport(false);
        loadLibraryData();
      } else {
        haptics.error();
        addToast(
          res.message ||
            (isSpanish
              ? "No se pudo reclamar el QR"
              : "Failed to claim QR code"),
          4000,
        );
      }
    } catch (err) {
      haptics.error();
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish ? "No se pudo reclamar el QR" : "Failed to claim code"),
        4000,
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImportHistory = async () => {
    setImporting(true);
    haptics.light();
    try {
      const { claimed, attempted } = await importLocalHistoryCodes();
      if (claimed > 0) {
        haptics.success();
        addToast(
          isSpanish
            ? `✨ ¡Se importaron ${claimed} QR${
              claimed === 1 ? "" : "s"
            } a tu biblioteca!`
            : `✨ Claimed ${claimed} grandfathered code${
              claimed === 1 ? "" : "s"
            } into your library!`,
          4000,
        );
        loadLibraryData();
      } else if (attempted > 0) {
        addToast(
          isSpanish
            ? "Todos tus QRs locales ya están en tu biblioteca"
            : "All local codes are already in your library",
          3000,
        );
      } else {
        addToast(
          isSpanish
            ? "No encontramos QRs dinámicos locales para importar"
            : "No local dynamic codes found to import",
          3000,
        );
      }
    } catch (err) {
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish ? "Error al sincronizar" : "Sync failed"),
        4000,
      );
    } finally {
      setImporting(false);
    }
  };

  const shell = useModalShell({ open: isOpen, onClose });
  if (!shell.mounted) return null;

  const syncUrl = passport ? buildPassportSyncUrl(passport) : "";
  const syncQrSvg = syncUrl ? renderPassportQrSvg(syncUrl, 4) : "";

  const serverShortCodes = new Set(
    codes.map((c) => c.short_code).filter(Boolean),
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLocalHistory = localHistory.filter((item) => {
    const sc = item.metadata?.shortCode
      ? String(item.metadata.shortCode)
      : undefined;
    if (sc && serverShortCodes.has(sc)) return false;
    if (!normalizedSearch) return true;
    const title = String(item.metadata?.title ?? "").toLowerCase();
    const content = item.content.toLowerCase();
    const codeStr = (sc ?? "").toLowerCase();
    return (
      title.includes(normalizedSearch) ||
      content.includes(normalizedSearch) ||
      codeStr.includes(normalizedSearch)
    );
  });

  const resolveItemEditUrl = (item: HistoryItem): string | null => {
    if (typeof item.metadata?.editUrl === "string" && item.metadata.editUrl) {
      return item.metadata.editUrl;
    }
    const directToken = typeof item.metadata?.ownerToken === "string"
      ? item.metadata.ownerToken
      : undefined;
    const shortCode = typeof item.metadata?.shortCode === "string"
      ? item.metadata.shortCode
      : undefined;
    const vaultToken = shortCode ? ownerTokensByCode[shortCode] : undefined;
    const token = directToken || vaultToken;
    if (token) {
      return `/edit?token=${encodeURIComponent(token)}`;
    }
    return null;
  };

  const resolveServerCodeEditUrl = (c: LibraryCodeItem): string => {
    const matchingLocal = localHistory.find(
      (item) => item.metadata?.shortCode === c.short_code,
    );
    if (matchingLocal) {
      const fromLocal = resolveItemEditUrl(matchingLocal);
      if (fromLocal) return fromLocal;
    }
    const tok = ownerTokensByCode[c.short_code];
    if (tok) {
      return `/edit?token=${encodeURIComponent(tok)}`;
    }
    return `/edit?code=${encodeURIComponent(c.short_code)}`;
  };

  const getHistoryIcon = (type: HistoryItem["type"]) => {
    switch (type) {
      case "dynamic":
        return "⚡";
      case "file":
        return "📂";
      case "wifi":
        return "📶";
      case "text":
        return "📝";
      case "url":
      default:
        return "🔗";
    }
  };

  const hasAnyItems = codes.length > 0 || filteredLocalHistory.length > 0;

  return (
    <div
      ref={shell.backdropRef}
      class="fixed inset-0 bg-[#2B1A0E]/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={shell.onBackdropClick}
    >
      <div
        ref={shell.dialogRef}
        class="bg-[#FAF7F2] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-black p-4 sm:p-6 shadow-chunky max-h-[92dvh] flex flex-col animate-slide-up sm:animate-pop-in pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        tabindex={-1}
      >
        {/* Header */}
        <div class="flex items-center justify-between pb-3 border-b-2 border-black/10">
          <div class="flex items-center gap-2">
            <span
              class="text-2xl"
              role="img"
              aria-label={isSpanish ? "Biblioteca" : "Library"}
            >
              📚
            </span>
            <h2
              id="library-title"
              class="font-black text-xl tracking-tight text-neutral-900"
            >
              {isSpanish ? "Tu Biblioteca" : "Your Library"}
            </h2>
          </div>
          <button
            type="button"
            onClick={shell.requestClose}
            aria-label={isSpanish ? "Cerrar biblioteca" : "Close library"}
            class="group shrink-0 w-11 h-11 -mr-1 rounded-full flex items-center justify-center"
          >
            <span
              aria-hidden="true"
              class="w-9 h-9 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-base leading-none shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
            >
              ✕
            </span>
          </button>
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto scrollbar-none py-4 space-y-4">
          {/* Sovereign Passport Card */}
          {passport && (
            <div class="rounded-2xl border-2 border-black bg-gradient-to-br from-[#FFFDF9] via-[#FFF9F2] to-[#FFF0E5] p-3.5 shadow-sm space-y-3">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <span class="w-11 h-11 shrink-0 rounded-full border-2 border-black bg-white flex items-center justify-center text-2xl shadow-xs">
                    {passport.avatarEmoji}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <h3 class="font-black text-base text-neutral-900 leading-tight truncate">
                        {passport.name}
                      </h3>
                      <button
                        type="button"
                        onClick={handleRerollMoniker}
                        title={isSpanish
                          ? "Tirar otro apodo"
                          : "Roll a new moniker"}
                        aria-label={isSpanish
                          ? "Tirar otro apodo"
                          : "Roll a new moniker"}
                        class="shrink-0 min-w-[36px] min-h-[36px] w-9 h-9 text-xs rounded-full border border-black/20 bg-white hover:bg-amber-100 flex items-center justify-center active:scale-95"
                      >
                        🎲
                      </button>
                    </div>
                    <div class="mt-0.5">
                      {quota?.is_active_plus || passport.tier === "plus"
                        ? (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-300 to-pink-300 border border-black">
                            {isSpanish
                              ? "✨ Pasaporte Activo · 100 QRs"
                              : "✨ Plus Active · 100 codes"}
                          </span>
                        )
                        : (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-black/30 text-neutral-700">
                            {isSpanish
                              ? `🌸 Pasaporte Activo · ${
                                quota
                                  ? `${quota.used_count} de ${quota.total_allowed} usados`
                                  : "5 QRs"
                              }`
                              : `🌸 Free Passport · ${
                                quota
                                  ? `${quota.used_count} of ${quota.total_allowed} used`
                                  : "5 codes"
                              }`}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopySyncUrl}
                  class="px-3 min-h-[44px] text-xs font-black rounded-full border-2 border-black bg-amber-200 hover:bg-amber-300 active:scale-95 transition-transform shadow-chunky"
                >
                  {isSpanish
                    ? "📋 Copiar link de sincronización"
                    : "📋 Copy Sync Link"}
                </button>
              </div>

              {/* Compact collapsible Cross-Device Pairing & Encrypted Backup */}
              <details class="group bg-white rounded-xl border-2 border-black/15">
                <summary class="cursor-pointer list-none min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-xs font-black text-neutral-800 select-none">
                  <span class="min-w-0">
                    {isSpanish
                      ? "📲 Vincular otro dispositivo o respaldo cifrado"
                      : "📲 Pair another device or backup"}
                  </span>
                  <span class="shrink-0 transition-transform group-open:rotate-180 text-[10px]">
                    ▾
                  </span>
                </summary>
                <div class="p-3 pt-1 border-t border-black/10 space-y-3">
                  <div class="flex flex-col sm:flex-row items-center gap-3">
                    <div
                      class="w-24 h-24 flex-shrink-0 bg-white rounded-lg p-1 border border-black/10 flex items-center justify-center overflow-hidden"
                      // deno-lint-ignore react-no-danger
                      dangerouslySetInnerHTML={{ __html: syncQrSvg }}
                    />
                    <div class="min-w-0 flex-1 text-center sm:text-left space-y-2">
                      <p class="font-bold text-xs text-neutral-800">
                        {isSpanish
                          ? "📱 Escanea con otro celular para sincronizar tu biblioteca"
                          : "📱 Scan with another device to sync library"}
                      </p>
                      <p class="text-[11px] text-neutral-500 leading-tight">
                        {isSpanish
                          ? "Sincronización al instante. Cero cuentas, cero contraseñas."
                          : "Instant cross-device pairing. Zero accounts, zero passwords."}
                      </p>
                      <div class="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={handleCopySyncUrl}
                          class="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border border-black bg-amber-200 hover:bg-amber-300 active:scale-95 transition-transform"
                        >
                          {isSpanish ? "📋 Copiar link" : "📋 Copy Link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPhrase(!showPhrase)}
                          class="min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border border-black/20 bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-transform"
                        >
                          🔑 {showPhrase
                            ? (isSpanish ? "Ocultar frase" : "Hide Phrase")
                            : (isSpanish
                              ? "Frase de respaldo"
                              : "Backup Phrase")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4-Word Sovereign Backup Phrase */}
                  {showPhrase && (
                    <div class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-2.5 text-xs text-neutral-700 space-y-1">
                      <p class="font-bold text-[10px] uppercase tracking-wider text-amber-800">
                        {isSpanish
                          ? "Frase de recuperación"
                          : "Sovereign Recovery Phrase"}
                      </p>
                      <code class="block font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-amber-200 select-all break-all">
                        {passport.phrase}
                      </code>
                    </div>
                  )}

                  {/* Encrypted History & Keys Backup */}
                  <div class="pt-2 border-t border-black/10 space-y-2">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <span class="text-[11px] font-black uppercase tracking-wide text-neutral-700">
                        {isSpanish
                          ? "🔐 Respaldo cifrado de historial y llaves"
                          : "🔐 Encrypted History & Keys Backup"}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyEncryptedBackup}
                        disabled={isExportingBackup}
                        class="min-h-[36px] px-2.5 py-1 rounded-lg border-2 border-black bg-purple-100 hover:bg-purple-200 text-xs font-black text-neutral-900 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {isExportingBackup
                          ? (isSpanish ? "Cifrando..." : "Encrypting...")
                          : (isSpanish
                            ? "📋 Copiar respaldo cifrado"
                            : "📋 Copy Encrypted Backup")}
                      </button>
                    </div>
                    <form
                      onSubmit={handleImportEncryptedBackup}
                      class="space-y-1.5"
                    >
                      <label class="sr-only" for="library-backup-json">
                        {isSpanish
                          ? "Pega el respaldo cifrado de otro dispositivo"
                          : "Paste encrypted backup from another device"}
                      </label>
                      <input
                        id="library-backup-json"
                        type="text"
                        value={backupInput}
                        onInput={(e) =>
                          setBackupInput((e.target as HTMLInputElement).value)}
                        placeholder={isSpanish
                          ? "Pega el respaldo cifrado de otro dispositivo..."
                          : "Paste encrypted backup JSON from other device..."}
                        class="w-full min-h-[40px] px-2.5 py-1.5 text-xs font-mono rounded-lg border-2 border-black/15 bg-white focus:border-black focus:outline-none"
                      />
                      {backupInput.trim() !== "" && (
                        <div class="flex flex-col sm:flex-row gap-1.5">
                          <label class="sr-only" for="library-backup-phrase">
                            {isSpanish
                              ? "Frase de 4 palabras (opcional si ya vinculaste)"
                              : "4-word phrase (optional if already paired)"}
                          </label>
                          <input
                            id="library-backup-phrase"
                            type="text"
                            value={backupPhraseInput}
                            onInput={(e) =>
                              setBackupPhraseInput(
                                (e.target as HTMLInputElement).value,
                              )}
                            placeholder={isSpanish
                              ? "Frase de 4 palabras (opcional si es la misma)..."
                              : "4-word phrase (optional if same passport)..."}
                            class="flex-1 min-w-0 min-h-[40px] px-2.5 py-1.5 text-xs font-mono rounded-lg border-2 border-black/15 bg-white focus:border-black focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isImportingBackup}
                            class="min-h-[40px] px-3 py-1.5 rounded-lg border-2 border-black bg-amber-200 hover:bg-amber-300 font-black text-xs text-black active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isImportingBackup
                              ? (isSpanish ? "Uniendo..." : "Merging...")
                              : (isSpanish
                                ? "📥 Restaurar y unir"
                                : "📥 Merge Backup")}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* Quota Progress Bar */}
          {quota && (
            <div class="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-neutral-700">
                  {isSpanish ? "Tus QRs guardados" : "Code Allowance"}
                </span>
                <span class="text-neutral-900">
                  {isSpanish
                    ? `${quota.used_count} / ${quota.total_allowed} usados`
                    : `${quota.used_count} / ${quota.total_allowed} used`}
                </span>
              </div>
              <div class="w-full h-3 bg-neutral-100 rounded-full border border-black/20 overflow-hidden">
                <div
                  class={`h-full transition-all duration-300 ${
                    quota.used_count >= quota.total_allowed
                      ? "bg-rose-400"
                      : "bg-emerald-400"
                  }`}
                  style={{
                    width: `${
                      Math.min(
                        100,
                        (quota.used_count / quota.total_allowed) * 100,
                      )
                    }%`,
                  }}
                />
              </div>
              {quota.legacy_count > 0 && (
                <p class="text-[11px] text-neutral-500 font-medium">
                  {isSpanish
                    ? `Incluye ${quota.legacy_count} QR${
                      quota.legacy_count === 1 ? "" : "s"
                    } anteriores (no cuentan en tu límite).`
                    : `Includes ${quota.legacy_count} grandfathered legacy code${
                      quota.legacy_count === 1 ? "" : "s"
                    } (exempt from allowance).`}
                </p>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div class="relative">
            <label class="sr-only" for="library-search-input">
              {isSpanish
                ? "Buscar en tus QRs guardados"
                : "Search your library"}
            </label>
            <input
              id="library-search-input"
              type="text"
              value={search}
              onInput={(e) => {
                const q = (e.target as HTMLInputElement).value;
                setSearch(q);
                loadLibraryData(q);
              }}
              placeholder={isSpanish
                ? "Buscar en tus QRs guardados..."
                : "Search your library..."}
              class="w-full px-4 py-2.5 pl-10 rounded-xl border-2 border-black/15 bg-white text-sm font-medium focus:outline-none focus:border-black transition-colors"
            />
            <span class="absolute left-3.5 top-3 text-neutral-400 text-sm">
              🔍
            </span>
          </div>

          {/* Unified Server + Local History Code List */}
          {loading && !hasAnyItems
            ? (
              <div class="text-center py-8 text-neutral-400 text-sm font-medium">
                {isSpanish
                  ? "Cargando tus QRs guardados..."
                  : "Loading your QR codes..."}
              </div>
            )
            : !hasAnyItems
            ? (
              <div class="text-center py-8 bg-white border-2 border-dashed border-black/20 rounded-2xl p-6 space-y-2">
                <p class="text-2xl">🌱</p>
                <p class="font-bold text-sm text-neutral-800">
                  {isSpanish
                    ? "Tus QRs guardados aparecerán aquí"
                    : "No saved QR codes yet"}
                </p>
                <p class="text-xs text-neutral-500 max-w-xs mx-auto">
                  {isSpanish
                    ? "Crea un QR en el generador para guardarlo aquí y editar su destino o recargarlo cuando quieras."
                    : "Create a QR code in the generator to keep it here, reload it onto the canvas, or update editable links anytime."}
                </p>
              </div>
            )
            : (
              <div class="space-y-3">
                {codes.map((c) => {
                  const editHref = resolveServerCodeEditUrl(c);
                  return (
                    <div
                      key={c.id}
                      class="bg-white border-2 border-black rounded-2xl p-4 shadow-sm hover:border-black/70 transition-colors flex flex-col gap-2"
                    >
                      <div class="flex items-start justify-between gap-2 flex-wrap">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-black text-sm text-neutral-900 truncate">
                              {c.title || c.short_code}
                            </span>
                            <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded">
                              {isSpanish ? "⚡ Dinámico" : "⚡ Dynamic"}
                            </span>
                            {c.is_legacy && (
                              <span class="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                {isSpanish ? "Clásico" : "Legacy"}
                              </span>
                            )}
                          </div>
                          <p class="text-xs text-neutral-500 font-mono truncate mt-0.5">
                            {c.destination_url}
                          </p>
                        </div>
                        <div class="flex items-center gap-1.5 flex-wrap shrink-0">
                          {onSelect && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelect({
                                  id: c.id,
                                  type: "url",
                                  content: c.redirect_url || c.destination_url,
                                  timestamp: new Date(c.created_at).getTime(),
                                  metadata: {
                                    title: c.title || c.short_code,
                                  },
                                });
                                onClose();
                              }}
                              class="min-h-[36px] px-2.5 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-neutral-100 text-xs font-bold active:scale-95 transition-transform"
                            >
                              {isSpanish ? "Cargar QR" : "Load QR"}
                            </button>
                          )}
                          <a
                            href={editHref}
                            class="min-h-[36px] inline-flex items-center px-3 py-1.5 rounded-xl border-2 border-black bg-amber-200 text-xs font-bold hover:bg-amber-300 active:scale-95 transition-transform"
                          >
                            {isSpanish ? "Editar y Stats ↗" : "Edit & Stats ↗"}
                          </a>
                        </div>
                      </div>
                      <div class="flex items-center justify-between pt-2 border-t border-black/5 text-[11px] text-neutral-400">
                        <span>
                          {c.scan_count} {isSpanish
                            ? (c.scan_count === 1 ? "escaneo" : "escaneos")
                            : (c.scan_count === 1 ? "scan" : "scans")}
                        </span>
                        <span>
                          {isSpanish ? "Creado " : "Created "}
                          {new Date(c.created_at).toLocaleDateString(
                            isSpanish ? "es-MX" : undefined,
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredLocalHistory.map((item) => {
                  const isDynamicItem = item.type === "dynamic" ||
                    Boolean(item.metadata?.shortCode) ||
                    Boolean(item.metadata?.editUrl) ||
                    Boolean(item.metadata?.ownerToken);
                  const editHref = isDynamicItem
                    ? resolveItemEditUrl(item)
                    : null;
                  const isFileItem = item.type === "file";

                  return (
                    <div
                      key={item.id}
                      class="bg-white border-2 border-black rounded-2xl p-3.5 shadow-sm hover:border-black/70 transition-colors flex flex-col gap-2"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            class="w-9 h-9 rounded-xl border border-black bg-amber-50 flex items-center justify-center text-lg shrink-0"
                            aria-hidden="true"
                          >
                            {getHistoryIcon(item.type)}
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-black text-sm text-neutral-900 truncate">
                                {item.metadata?.title || item.content}
                              </span>
                              {isDynamicItem && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded">
                                  {isSpanish ? "⚡ Dinámico" : "⚡ Dynamic"}
                                </span>
                              )}
                              {isFileItem && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-teal-100 text-teal-900 border border-teal-300 rounded">
                                  {isSpanish ? "📂 Archivo" : "📂 File Drop"}
                                </span>
                              )}
                            </div>
                            <p class="text-xs text-neutral-500 font-mono truncate mt-0.5">
                              {item.content}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromHistory(item.id)}
                          aria-label={isSpanish
                            ? "Quitar de la biblioteca"
                            : "Remove from library"}
                          title={isSpanish
                            ? "Quitar de la biblioteca"
                            : "Remove from library"}
                          class="shrink-0 w-8 h-8 rounded-full border border-black/20 bg-neutral-100 hover:bg-rose-100 text-neutral-700 flex items-center justify-center text-xs font-bold transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div class="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-black/5">
                        <span class="text-[11px] text-neutral-400">
                          {new Date(item.timestamp).toLocaleDateString(
                            isSpanish ? "es-MX" : undefined,
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          {onSelect && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelect({
                                  ...item,
                                  type: item.type === "text" ||
                                      item.type === "wifi"
                                    ? item.type
                                    : "url",
                                  metadata: {
                                    title: item.metadata?.title,
                                  },
                                });
                                onClose();
                              }}
                              class="min-h-[36px] px-2.5 py-1 rounded-xl border-2 border-black bg-white hover:bg-neutral-100 text-xs font-bold text-black active:scale-95 transition-transform"
                            >
                              {isSpanish ? "Cargar QR" : "Load QR"}
                            </button>
                          )}
                          {editHref && (
                            <a
                              href={editHref}
                              class="min-h-[36px] inline-flex items-center px-3 py-1 rounded-xl border-2 border-black bg-amber-200 hover:bg-amber-300 text-xs font-bold text-black active:scale-95 transition-transform"
                            >
                              {isSpanish
                                ? "Editar y Stats ↗"
                                : "Edit & Stats ↗"}
                            </a>
                          )}
                          {isFileItem && (
                            <a
                              href={item.content}
                              class="min-h-[36px] inline-flex items-center px-3 py-1 rounded-xl border-2 border-black bg-teal-200 hover:bg-teal-300 text-xs font-bold text-black active:scale-95 transition-transform"
                            >
                              {isSpanish ? "Abrir ↗" : "Open Share ↗"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Claim Legacy / Time Machine Tools */}
          <div class="pt-2 border-t border-black/10 space-y-2">
            {!showImport
              ? (
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImport(true)}
                    class="text-xs font-bold text-neutral-600 hover:text-black underline text-left"
                  >
                    {isSpanish
                      ? "Reclamar un QR anterior con su llave ↗"
                      : "Claim old QR code with token ↗"}
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleImportHistory}
                    class="text-xs font-bold text-neutral-600 hover:text-black underline disabled:opacity-50 text-left sm:text-right"
                  >
                    {importing
                      ? (isSpanish ? "Importando..." : "Importing...")
                      : (isSpanish
                        ? "Sincronizar desde el historial ↺"
                        : "Sync from browser history ↺")}
                  </button>
                </div>
              )
              : (
                <form
                  onSubmit={handleClaimLegacy}
                  class="bg-white border-2 border-black rounded-2xl p-4 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <p class="font-bold text-xs text-neutral-900">
                      {isSpanish
                        ? "Reclamar QR anterior"
                        : "Claim Pre-Launch Code"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowImport(false)}
                      class="text-xs font-bold text-neutral-500 hover:text-black"
                    >
                      {isSpanish ? "Cancelar" : "Cancel"}
                    </button>
                  </div>
                  <p class="text-[11px] text-neutral-500 leading-relaxed">
                    {isSpanish
                      ? "Pega el token de propietario de un QR que hayas creado antes. Reclamarlo no gasta tus 5 lugares gratis."
                      : "Paste the owner token from a code you created before this release. Claiming it does not consume your 5-code allowance."}
                  </p>
                  <label class="sr-only" for="library-claim-token-input">
                    {isSpanish
                      ? "Token de propietario del QR"
                      : "QR owner token"}
                  </label>
                  <input
                    id="library-claim-token-input"
                    type="text"
                    value={importToken}
                    onInput={(e) =>
                      setImportToken((e.target as HTMLInputElement).value)}
                    placeholder="ot_..."
                    required
                    class="w-full px-3 py-2 rounded-xl border-2 border-black/15 bg-white text-xs font-mono focus:outline-none focus:border-black"
                  />
                  <button
                    type="submit"
                    disabled={importing || !importToken.trim()}
                    class="w-full py-2 px-3 rounded-xl border-2 border-black bg-amber-300 font-bold text-xs hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {importing
                      ? (isSpanish ? "Reclamando..." : "Claiming...")
                      : (isSpanish ? "Reclamar QR →" : "Claim Code →")}
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
