import { useEffect, useRef, useState } from "preact/hooks";
import { useModalShell } from "./modal/useModalShell.ts";
import {
  buildPassportPhraseUrl,
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
  clearHistory,
  exportVaultJson,
  filterHistoryItems,
  getHistory,
  type HistoryItem,
  importVaultJson,
  isEditableHistoryItem,
  isFileHistoryItem,
  removeFromHistory,
  type SavedQrDesign,
  summarizeQrPayload,
  type VaultFilter,
} from "../utils/history.ts";
import { exportSyncBundle, importSyncBundle } from "../utils/sync-phrase.ts";
import { getOwnerToken, saveOwnerToken } from "../utils/token-vault.ts";
import { isPlusLibraryEnabled } from "../utils/auth.ts";
import { addToast } from "../islands/ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";
import { sounds } from "../utils/sounds.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import {
  type Glyph,
  STAGE_PRESS,
  StageGlyph,
} from "./smart-input/SmartInputToolbar.tsx";

export interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (item: HistoryItem) => void;
  lang?: Locale;
}

const STYLE_BADGE_MAP: Record<
  string,
  { en: string; es: string; colors: string[] }
> = {
  sunset: {
    en: "Sunset",
    es: "Atardecer",
    colors: ["#F97316", "#FF69B4", "#9370DB"],
  },
  pool: {
    en: "Ocean",
    es: "Océano",
    colors: ["#0EA5E9", "#0891B2", "#0D9488"],
  },
  matcha: {
    en: "Forest",
    es: "Bosque",
    colors: ["#15803D", "#059669", "#0F766E"],
  },
  vapor: {
    en: "Vaporwave",
    es: "Vaporwave",
    colors: ["#6D28D9", "#9333EA", "#DB2777"],
  },
  brutalist: {
    en: "Brutal",
    es: "Brutal",
    colors: ["#1e1714", "#FFE94A"],
  },
  noir: {
    en: "Classic",
    es: "Clásico",
    colors: ["#1E1B4B", "#0F172A"],
  },
  blush: {
    en: "Crimson",
    es: "Carmesí",
    colors: ["#E11D48", "#DB2777", "#9D174D"],
  },
  grape: {
    en: "Cosmic",
    es: "Cósmico",
    colors: ["#4F46E5", "#7C3AED", "#9333EA"],
  },
  candy: {
    en: "Candy",
    es: "Dulce",
    colors: ["#FF2E93", "#7C3AED", "#0891B2"],
  },
  terminal: {
    en: "Matrix",
    es: "Matrix",
    colors: ["#00FF41", "#0A0A0A"],
  },
  custom: {
    en: "Custom",
    es: "Propio",
    colors: ["#EC4899", "#7C3AED"],
  },
};

function describeDesignRecipe(
  design: SavedQrDesign | undefined,
  isSpanish: boolean,
): { label: string; gradient: string } | null {
  if (!design?.style) return null;
  const key = design.style.toLowerCase();
  const preset = STYLE_BADGE_MAP[key];
  const baseName = preset
    ? (isSpanish ? preset.es : preset.en)
    : design.style.charAt(0).toUpperCase() + design.style.slice(1);

  let colors = preset?.colors ?? ["#EC4899", "#9370DB"];
  if (key === "custom" && design.customStyle?.dots) {
    const stops = design.customStyle.dots.gradient?.colorStops?.map((s) =>
      s.color
    );
    if (stops && stops.length >= 2) {
      colors = stops;
    } else if (design.customStyle.dots.color) {
      colors = [
        design.customStyle.dots.color,
        design.customStyle.background?.color ?? "#fffef7",
      ];
    }
  }

  const parts = [baseName];
  if (design.frameConfig?.enabled) {
    parts.push(isSpanish ? "Marco" : "Framed");
  }

  return {
    label: parts.join(" · "),
    gradient: `linear-gradient(135deg, ${colors.join(", ")})`,
  };
}

function glyphForItemType(type: HistoryItem["type"]): Glyph {
  switch (type) {
    case "dynamic":
      return "dynamic";
    case "file":
      return "bucket";
    case "media":
      return "media";
    case "wifi":
      return "wifi";
    case "vcard":
      return "vcard";
    case "email":
      return "email";
    case "phone":
      return "phone";
    case "sms":
      return "sms";
    case "social":
      return "social";
    case "text":
      return "text";
    case "url":
    default:
      return "url";
  }
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
  const [ownerTokensByBucket, setOwnerTokensByBucket] = useState<
    Record<string, string>
  >({});
  const [quota, setQuota] = useState<LibraryQuota | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<VaultFilter>("all");
  const [showPhrase, setShowPhrase] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importToken, setImportToken] = useState("");
  const [importing, setImporting] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupInput, setBackupInput] = useState("");
  const [backupPhraseInput, setBackupPhraseInput] = useState("");
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const refreshLocalHistory = async (
    serverCodes: LibraryCodeItem[] = codes,
  ) => {
    const hist = getHistory();
    setLocalHistory(hist);

    const shortCodes = new Set<string>();
    const bucketCodes = new Set<string>();
    for (const item of hist) {
      if (item.metadata?.shortCode) {
        shortCodes.add(String(item.metadata.shortCode));
      }
      if (item.metadata?.bucketCode) {
        bucketCodes.add(String(item.metadata.bucketCode));
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
        const tok = (await getOwnerToken("qr", sc)) ??
          (await getOwnerToken("dynamic", sc));
        if (tok) nextTokens[sc] = tok;
      }
      setOwnerTokensByCode((prev) => ({ ...prev, ...nextTokens }));
    }

    if (bucketCodes.size > 0) {
      const nextBuckets: Record<string, string> = {};
      for (const bc of bucketCodes) {
        const tok = await getOwnerToken("bucket", bc);
        if (tok) nextBuckets[bc] = tok;
      }
      setOwnerTokensByBucket((prev) => ({ ...prev, ...nextBuckets }));
    }
  };

  useEffect(() => {
    void refreshLocalHistory();

    const synced = parsePassportFromUrl();
    if (synced) {
      setPassport(synced);
      addToast(
        isSpanish
          ? "Pasaporte QRBuddy sincronizado"
          : "QRBuddy Passport paired",
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
    if (!isPlusLibraryEnabled()) return;
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

  const handleDownloadVaultJson = () => {
    try {
      const json = exportVaultJson();
      const blob = new Blob([json], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "qrbuddy-vault.json";
      anchor.click();
      URL.revokeObjectURL(url);
      haptics.success();
      addToast(
        isSpanish ? "Archivo JSON descargado" : "Vault JSON archive downloaded",
        2600,
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo exportar el archivo JSON"
          : "Vault JSON export failed",
        3000,
      );
    }
  };

  const handleImportVaultJsonFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";

    try {
      const rawText = await file.text();
      const result = importVaultJson(rawText);

      // Restore any inline ownerTokens attached to imported items
      const updatedItems = getHistory();
      for (const item of updatedItems) {
        const directToken = typeof item.metadata?.ownerToken === "string"
          ? item.metadata.ownerToken
          : "";
        if (!directToken) continue;
        if (
          typeof item.metadata?.shortCode === "string" &&
          item.metadata.shortCode
        ) {
          await saveOwnerToken("qr", item.metadata.shortCode, directToken);
        } else if (
          typeof item.metadata?.bucketCode === "string" &&
          item.metadata.bucketCode
        ) {
          await saveOwnerToken("bucket", item.metadata.bucketCode, directToken);
        }
      }

      await refreshLocalHistory();
      haptics.success();
      sounds.success();
      addToast(
        isSpanish
          ? `${result.imported} códigos nuevos importados · ${result.total} en bóveda`
          : `Imported ${result.imported} new codes · ${result.total} in vault`,
        3200,
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "Archivo de respaldo JSON no válido"
          : "Invalid QRBuddy JSON archive",
        3200,
      );
    }
  };

  const handleCopySyncUrl = async () => {
    if (!passport) return;
    haptics.light();
    const url = buildPassportPhraseUrl(passport);
    try {
      await navigator.clipboard.writeText(url);
      addToast(
        isSpanish
          ? "Enlace de sincronización copiado"
          : "Sync link copied — open on another device to pair",
        3000,
      );
    } catch {
      addToast(
        isSpanish
          ? "No se pudo copiar el enlace automáticamente"
          : "Clipboard copy unavailable",
        3000,
      );
    }
  };

  const handleRerollMoniker = () => {
    if (!passport) return;
    haptics.light();
    sounds.gradientShimmer(Math.floor(Math.random() * 6));
    const updated = rerollPassportIdentity(passport);
    setPassport(updated);
    addToast(
      isSpanish
        ? `Nuevo apodo: ${updated.name}`
        : `Moniker rolled: ${updated.name}`,
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
          ? "Respaldo cifrado copiado al portapapeles"
          : "Encrypted sync backup copied",
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo generar el respaldo cifrado"
          : "Encrypted sync backup failed",
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
          ? ` · ${result.ownerTokensRestored} llaves restauradas`
          : ` · restored ${result.ownerTokensRestored} edit keys`)
        : "";
      addToast(
        result.historySaved
          ? (isSpanish
            ? `Sincronizados ${result.mergedHistoryCount} códigos${manageLinks}`
            : `Synced ${result.mergedHistoryCount} codes${manageLinks}`)
          : (isSpanish
            ? `Almacenamiento local lleno${manageLinks}`
            : `Local storage unavailable${manageLinks}`),
      );
      setBackupInput("");
      setBackupPhraseInput("");
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "Respaldo inválido o frase incorrecta"
          : "Phrase did not match backup bundle",
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
            ? "Código anterior agregado a la bóveda"
            : "Pre-launch code claimed into vault",
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
              ? "Ese código no se pudo reclamar"
              : "Code could not be claimed"),
          4000,
        );
      }
    } catch (err) {
      haptics.error();
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish
            ? "Ese código no se pudo reclamar"
            : "Code could not be claimed"),
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
            ? `${claimed} código${claimed === 1 ? "" : "s"} sincronizado${
              claimed === 1 ? "" : "s"
            }`
            : `Claimed ${claimed} local code${claimed === 1 ? "" : "s"}`,
          4000,
        );
        loadLibraryData();
      } else if (attempted > 0) {
        addToast(
          isSpanish
            ? "Todos los códigos locales ya están sincronizados"
            : "All local codes already synced",
          3000,
        );
      } else {
        addToast(
          isSpanish
            ? "Sin códigos dinámicos locales por reclamar"
            : "No local dynamic codes pending sync",
          3000,
        );
      }
    } catch (err) {
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish ? "Error al sincronizar" : "Sync interrupted"),
        4000,
      );
    } finally {
      setImporting(false);
    }
  };

  const shell = useModalShell({ open: isOpen, onClose });
  if (!shell.mounted) return null;

  const syncUrl = passport ? buildPassportPhraseUrl(passport) : "";
  const syncQrSvg = syncUrl ? renderPassportQrSvg(syncUrl, 4) : "";

  const serverShortCodes = new Set(
    codes.map((c) => c.short_code).filter(Boolean),
  );
  const localByShortCode = new Map<string, HistoryItem>();
  for (const item of localHistory) {
    const sc = item.metadata?.shortCode
      ? String(item.metadata.shortCode)
      : undefined;
    if (sc && !localByShortCode.has(sc)) {
      localByShortCode.set(sc, item);
    }
  }

  const dedupedLocalHistory = localHistory.filter((item) => {
    const sc = item.metadata?.shortCode
      ? String(item.metadata.shortCode)
      : undefined;
    return !(sc && serverShortCodes.has(sc));
  });

  const normalizedSearch = search.trim().toLowerCase();
  const filteredServerCodes = (
    activeFilter === "all" || activeFilter === "editable" ? codes : []
  ).filter((c) => {
    if (!normalizedSearch) return true;
    const matchingLocal = localByShortCode.get(c.short_code);
    const localTags = Array.isArray(matchingLocal?.metadata?.tags)
      ? matchingLocal.metadata.tags.join(" ").toLowerCase()
      : "";
    return (
      (c.title ?? "").toLowerCase().includes(normalizedSearch) ||
      c.destination_url.toLowerCase().includes(normalizedSearch) ||
      c.short_code.toLowerCase().includes(normalizedSearch) ||
      localTags.includes(normalizedSearch)
    );
  });

  const filteredLocalHistory = filterHistoryItems(dedupedLocalHistory, {
    query: search,
    filter: activeFilter,
  });

  const editableCount = codes.length +
    dedupedLocalHistory.filter(isEditableHistoryItem).length;
  const filesCount = dedupedLocalHistory.filter(isFileHistoryItem).length;
  const staticCount =
    dedupedLocalHistory.filter((item) =>
      !isEditableHistoryItem(item) && !isFileHistoryItem(item)
    ).length;
  const allCount = codes.length + dedupedLocalHistory.length;

  const filterPills: Array<{
    key: VaultFilter;
    label: string;
    count: number;
  }> = [
    { key: "all", label: isSpanish ? "Todos" : "All", count: allCount },
    {
      key: "editable",
      label: isSpanish ? "Editables" : "Editable",
      count: editableCount,
    },
    {
      key: "static",
      label: isSpanish ? "Estáticos" : "Static",
      count: staticCount,
    },
    {
      key: "files",
      label: isSpanish ? "Archivos" : "Files",
      count: filesCount,
    },
  ];

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

  const resolveItemShareHref = (item: HistoryItem): string | null => {
    const bucketCode = typeof item.metadata?.bucketCode === "string"
      ? item.metadata.bucketCode
      : undefined;
    if (bucketCode) {
      const tok = ownerTokensByBucket[bucketCode];
      return `/bucket/${encodeURIComponent(bucketCode)}${
        tok ? `?owner_token=${encodeURIComponent(tok)}` : ""
      }`;
    }
    if (isFileHistoryItem(item) && item.content) {
      return item.content;
    }
    return null;
  };

  const resolveServerCodeEditUrl = (c: LibraryCodeItem): string | null => {
    const matchingLocal = localByShortCode.get(c.short_code);
    if (matchingLocal) {
      const fromLocal = resolveItemEditUrl(matchingLocal);
      if (fromLocal) return fromLocal;
    }
    const tok = ownerTokensByCode[c.short_code];
    if (tok) {
      return `/edit?token=${encodeURIComponent(tok)}`;
    }
    return null;
  };

  function exportLibraryCsv() {
    const header = [
      "short_code",
      "title",
      "destination_url",
      "redirect_url",
      "created_at",
      "expires_at",
      "scan_count",
      "max_scans",
      "is_active",
      "routing_mode",
    ].join(",");

    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };

    const body = codes
      .map((code) =>
        [
          code.short_code,
          escape(code.title ?? ""),
          escape(code.destination_url),
          escape(code.redirect_url),
          code.created_at,
          code.expires_at ?? "",
          code.scan_count,
          code.max_scans ?? "",
          code.is_active,
          code.routing_mode ?? "static",
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([`${header}\n${body}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qrbuddy-library.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    haptics.light();
  }

  const hasVisibleItems = filteredServerCodes.length > 0 ||
    filteredLocalHistory.length > 0;

  return (
    <div
      ref={shell.backdropRef}
      class={`fixed inset-0 bg-[#2B1A0E]/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 charm-modal-backdrop animate-fade-in${
        shell.closing
          ? " charm-modal-backdrop--closing charm-modal--closing"
          : ""
      }`}
      onClick={shell.onBackdropClick}
    >
      <div
        ref={shell.dialogRef}
        data-vault-drawer
        data-history-drawer
        class={`bg-[#fbf1e4] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-[#1e1714] p-4 sm:p-6 shadow-chunky max-h-[92dvh] flex flex-col charm-modal-drawer pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 outline-none${
          shell.closing
            ? " charm-modal--closing charm-modal-drawer--closing"
            : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        tabindex={-1}
      >
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          class="hidden"
          onChange={handleImportVaultJsonFile}
        />

        {/* Header */}
        <div class="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#1e1714]/10">
          <div class="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              aria-hidden="true"
              class="w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-[#1e1714] shadow-[0_2px_0_#1e1714] shrink-0"
            >
              <StageGlyph kind="history" size={18} />
            </span>
            <h2
              id="library-title"
              class="font-black text-xl tracking-tight text-[#1e1714] truncate"
            >
              {isSpanish ? "Bóveda QR" : "Saved Vault"}
            </h2>
            <a
              href="/stats"
              class="shrink-0 rounded-full border-2 border-[#1e1714] bg-emerald-300 px-2.5 py-1 text-[11px] font-black text-[#1e1714] shadow-chunky transition active:translate-y-[1px]"
            >
              {isSpanish ? "Datos" : "Stats"}
            </a>
            <a
              href="/batch"
              class="shrink-0 rounded-full border-2 border-[#1e1714] bg-amber-300 px-2.5 py-1 text-[11px] font-black text-[#1e1714] shadow-chunky transition active:translate-y-[1px]"
            >
              {isSpanish ? "Lote" : "Batch"}
            </a>
          </div>
          <button
            type="button"
            data-history-close
            onClick={shell.requestClose}
            aria-label={isSpanish ? "Cerrar bóveda" : "Close vault"}
            class="group shrink-0 w-11 h-11 -mr-1 rounded-full flex items-center justify-center"
          >
            <span
              aria-hidden="true"
              class="w-9 h-9 rounded-full border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center font-black text-base leading-none text-[#1e1714] shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
            >
              ✕
            </span>
          </button>
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto scrollbar-none py-3.5 space-y-3.5">
          {/* Search Bar + Filter Pills */}
          <div class="space-y-2">
            <div class="relative">
              <label class="sr-only" for="library-search-input">
                {isSpanish ? "Buscar códigos guardados" : "Search saved codes"}
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
                  ? "Buscar por nombre, link, código o etiqueta…"
                  : "Search title, link, short code or tag…"}
                class="w-full min-h-[44px] px-4 py-2.5 pl-10 pr-9 rounded-2xl border-2 border-[#1e1714]/20 bg-[#fffef7] text-sm font-bold text-[#1e1714] placeholder:text-[#7c7267] placeholder:font-medium focus:outline-none focus:border-[#1e1714] transition-colors"
              />
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#57524b] pointer-events-none">
                <StageGlyph kind="magnifier" size={16} />
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    loadLibraryData("");
                  }}
                  aria-label={isSpanish ? "Limpiar búsqueda" : "Clear search"}
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-[#57524b] hover:bg-[#f7ecdc]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div
              role="group"
              aria-label={isSpanish ? "Filtrar categoría" : "Filter category"}
              class="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5"
            >
              {filterPills.map((pill) => {
                const active = activeFilter === pill.key;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setActiveFilter(pill.key);
                      haptics.light();
                    }}
                    class={`min-h-[36px] px-3 py-1 rounded-full border-2 text-xs font-black whitespace-nowrap inline-flex items-center gap-1.5 transition-all ${
                      active
                        ? "bg-amber-200 border-[#1e1714] text-[#1e1714] shadow-[0_2px_0_#1e1714]"
                        : "bg-[#fffef7] border-[#1e1714]/20 text-[#1e1714] hover:border-[#1e1714]"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      class={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                        active
                          ? "bg-[#fffef7] border border-[#1e1714]/40"
                          : "bg-[#f7ecdc]"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quota Progress Bar (when server library quota present) */}
          {quota && (
            <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3.5 shadow-sm space-y-2">
              <div class="flex items-center justify-between gap-2 text-xs font-bold">
                <span class="text-[#57524b]">
                  {isSpanish
                    ? "Cupo de códigos dinámicos"
                    : "Editable Allowance"}
                </span>
                {codes.length > 0 && (
                  <button
                    type="button"
                    onClick={exportLibraryCsv}
                    title={isSpanish
                      ? "Descargar códigos dinámicos como CSV"
                      : "Download dynamic codes as CSV"}
                    class="min-h-[32px] rounded-full border-2 border-[#1e1714] bg-[#fffef7] px-2.5 py-1 text-[11px] font-black text-[#1e1714] shadow-xs transition hover:bg-[#f7ecdc] active:scale-95"
                  >
                    {isSpanish ? "Exportar CSV" : "Export CSV"}
                  </button>
                )}
                <span class="text-[#1e1714]">
                  {isSpanish
                    ? `${quota.used_count} / ${quota.total_allowed} activos`
                    : `${quota.used_count} / ${quota.total_allowed} active`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={isSpanish
                  ? "Cupo de códigos dinámicos"
                  : "Editable code allowance"}
                aria-valuenow={quota.used_count}
                aria-valuemin={0}
                aria-valuemax={quota.total_allowed}
                class="w-full h-2.5 bg-[#f7ecdc] rounded-full border border-[#1e1714]/20 overflow-hidden"
              >
                <div
                  class={`h-full transition-all duration-300 ${
                    quota.used_count >= quota.total_allowed
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{
                    width: `${
                      quota.total_allowed > 0
                        ? Math.min(
                          100,
                          (quota.used_count / quota.total_allowed) * 100,
                        )
                        : 0
                    }%`,
                  }}
                />
              </div>
              {quota.legacy_count > 0 && (
                <p class="text-[11px] text-[#57524b] font-medium">
                  {isSpanish
                    ? `Incluye ${quota.legacy_count} QR${
                      quota.legacy_count === 1 ? "" : "s"
                    } anteriores exentos del cupo.`
                    : `Includes ${quota.legacy_count} grandfathered legacy code${
                      quota.legacy_count === 1 ? "" : "s"
                    } exempt from allowance.`}
                </p>
              )}
            </div>
          )}

          {/* Unified Server + Local Vault Code List */}
          {loading && !hasVisibleItems
            ? (
              <div
                class="text-center py-8 text-[#57524b] text-sm font-bold"
                role="status"
              >
                {isSpanish
                  ? "Cargando códigos guardados…"
                  : "Loading saved codes…"}
              </div>
            )
            : !hasVisibleItems
            ? (
              <div class="text-center py-8 bg-[#fffef7] border-2 border-[#1e1714]/20 rounded-2xl p-6 space-y-2">
                <div class="w-11 h-11 mx-auto rounded-2xl border-2 border-[#1e1714] bg-[#f7ecdc] flex items-center justify-center text-[#1e1714]">
                  <StageGlyph kind="history" size={20} />
                </div>
                <p class="font-black text-sm text-[#1e1714]">
                  {allCount === 0
                    ? (isSpanish
                      ? "Bóveda vacía por ahora"
                      : "No saved codes yet")
                    : (isSpanish
                      ? "Sin coincidencias para este filtro"
                      : "No matching codes")}
                </p>
                <p class="text-xs text-[#57524b] max-w-xs mx-auto leading-relaxed">
                  {allCount === 0
                    ? (isSpanish
                      ? "Cada código exportado o enlace dinámico queda guardado localmente con su paleta y diseño."
                      : "Exported QRs, editable links, and file drops save locally with full palette and frame recipes.")
                    : (isSpanish
                      ? "Prueba otro término de búsqueda o cambia la categoría activa."
                      : "Try a different search term or switch the category filter.")}
                </p>
              </div>
            )
            : (
              <div class="space-y-2.5">
                {filteredServerCodes.map((c) => {
                  const matchingLocal = localByShortCode.get(c.short_code);
                  const editHref = resolveServerCodeEditUrl(c);
                  const designBadge = describeDesignRecipe(
                    matchingLocal?.metadata?.design,
                    isSpanish,
                  );
                  const tags = Array.isArray(matchingLocal?.metadata?.tags)
                    ? matchingLocal.metadata.tags.filter(
                      (t): t is string => typeof t === "string",
                    )
                    : [];

                  return (
                    <div
                      key={c.id}
                      class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3.5 shadow-[0_2px_0_#1e1714] flex flex-col gap-2"
                    >
                      <div class="flex items-start justify-between gap-2 flex-wrap">
                        <div class="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            aria-hidden="true"
                            class="w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#f7ecdc] flex items-center justify-center text-[#1e1714] shrink-0"
                          >
                            <StageGlyph kind="dynamic" size={16} />
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-black text-sm text-[#1e1714] truncate">
                                {c.title || matchingLocal?.metadata?.title ||
                                  c.short_code}
                              </span>
                              <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded">
                                {isSpanish ? "Editable" : "Editable"}
                              </span>
                              {designBadge && (
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black bg-[#fffef7] text-[#1e1714] border border-[#1e1714]/35 rounded-md">
                                  <span
                                    aria-hidden="true"
                                    class="w-2 h-2 rounded-full border border-[#1e1714]/40 shrink-0"
                                    style={{ background: designBadge.gradient }}
                                  />
                                  <span>{designBadge.label}</span>
                                </span>
                              )}
                              {c.is_legacy && (
                                <span class="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                  {isSpanish ? "Clásico" : "Legacy"}
                                </span>
                              )}
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  class="px-1.5 py-0.5 text-[10px] font-bold bg-[#f7ecdc] text-[#57524b] rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <p class="text-xs text-[#57524b] font-mono truncate mt-0.5">
                              {c.destination_url}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#1e1714]/10 text-[11px] text-[#57524b]">
                        <span>
                          {c.scan_count} {isSpanish
                            ? (c.scan_count === 1 ? "escaneo" : "escaneos")
                            : (c.scan_count === 1 ? "scan" : "scans")} ·{" "}
                          {new Date(c.created_at).toLocaleDateString(
                            isSpanish ? "es-MX" : undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                        <div class="flex items-center gap-1.5 flex-wrap shrink-0">
                          {onSelect && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelect({
                                  id: matchingLocal?.id ?? c.id,
                                  type: "dynamic",
                                  content: c.redirect_url || c.destination_url,
                                  timestamp: new Date(c.created_at).getTime(),
                                  metadata: {
                                    ...(matchingLocal?.metadata ?? {}),
                                    title: c.title ||
                                      matchingLocal?.metadata?.title ||
                                      c.short_code,
                                    shortCode: c.short_code,
                                    loadToStage: true,
                                  },
                                });
                                haptics.light();
                                shell.requestClose();
                              }}
                              class={`${STAGE_PRESS} min-h-[38px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                            >
                              {isSpanish ? "Cargar QR" : "Load QR"}
                            </button>
                          )}
                          {editHref && (
                            <a
                              href={editHref}
                              class={`${STAGE_PRESS} min-h-[38px] inline-flex items-center px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-amber-200 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                            >
                              {isSpanish
                                ? "Editar y Datos ↗"
                                : "Edit & Stats ↗"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredLocalHistory.map((item) => {
                  const summary = summarizeQrPayload(item.content);
                  const displayType =
                    item.type === "url" && summary.type !== "url"
                      ? summary.type
                      : item.type;
                  const title = item.metadata?.title || summary.title;
                  const subtitle = item.type === "file"
                    ? (isSpanish ? "Buzón de archivos" : "File Locker")
                    : ((item.metadata?.subtitle as string) || summary.subtitle);

                  const isDynamicItem = isEditableHistoryItem(item);
                  const isFileItem = isFileHistoryItem(item);
                  const editHref = isDynamicItem
                    ? resolveItemEditUrl(item)
                    : null;
                  const shareHref = isFileItem
                    ? resolveItemShareHref(item)
                    : null;
                  const designBadge = describeDesignRecipe(
                    item.metadata?.design,
                    isSpanish,
                  );
                  const tags = Array.isArray(item.metadata?.tags)
                    ? item.metadata.tags.filter(
                      (t): t is string => typeof t === "string",
                    )
                    : [];

                  const triggerLoad = () => {
                    if (!onSelect) return;
                    onSelect({
                      ...item,
                      type: displayType,
                      metadata: {
                        ...(item.metadata ?? {}),
                        loadToStage: true,
                      },
                    });
                    haptics.light();
                    shell.requestClose();
                  };

                  return (
                    <div
                      key={item.id}
                      class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3.5 shadow-[0_2px_0_#1e1714] flex flex-col gap-2"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={triggerLoad}
                          disabled={!onSelect}
                          class="flex items-start gap-2.5 min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] rounded-xl disabled:cursor-default"
                        >
                          <span
                            class="w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#f7ecdc] flex items-center justify-center text-[#1e1714] shrink-0"
                            aria-hidden="true"
                          >
                            <StageGlyph
                              kind={glyphForItemType(displayType)}
                              size={16}
                            />
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-black text-sm text-[#1e1714] truncate">
                                {title}
                              </span>
                              {isDynamicItem && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 rounded">
                                  {isSpanish ? "Editable" : "Editable"}
                                </span>
                              )}
                              {isFileItem && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-teal-100 text-teal-900 border border-teal-300 rounded">
                                  {item.type === "file"
                                    ? (isSpanish ? "Buzón" : "Locker")
                                    : (isSpanish ? "Archivo" : "File Drop")}
                                </span>
                              )}
                              {designBadge && (
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black bg-[#fffef7] text-[#1e1714] border border-[#1e1714]/35 rounded-md">
                                  <span
                                    aria-hidden="true"
                                    class="w-2 h-2 rounded-full border border-[#1e1714]/40 shrink-0"
                                    style={{ background: designBadge.gradient }}
                                  />
                                  <span>{designBadge.label}</span>
                                </span>
                              )}
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  class="px-1.5 py-0.5 text-[10px] font-bold bg-[#f7ecdc] text-[#57524b] rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <p class="text-xs text-[#57524b] truncate mt-0.5">
                              {subtitle}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromHistory(item.id)}
                          aria-label={isSpanish
                            ? `Quitar ${title}`
                            : `Remove ${title}`}
                          title={isSpanish ? "Quitar de la bóveda" : "Remove"}
                          class="shrink-0 w-9 h-9 -mr-0.5 -mt-0.5 rounded-full border border-[#1e1714]/20 bg-[#f7ecdc] hover:bg-amber-200 text-[#1e1714] flex items-center justify-center text-xs font-black transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div class="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[#1e1714]/10">
                        <span class="text-[11px] font-medium text-[#57524b]">
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
                              onClick={triggerLoad}
                              class={`${STAGE_PRESS} min-h-[38px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                            >
                              {isSpanish ? "Cargar QR" : "Load QR"}
                            </button>
                          )}
                          {editHref && (
                            <a
                              href={editHref}
                              class={`${STAGE_PRESS} min-h-[38px] inline-flex items-center px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-amber-200 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                            >
                              {isSpanish
                                ? "Editar y Datos ↗"
                                : "Edit & Stats ↗"}
                            </a>
                          )}
                          {shareHref && (
                            <a
                              href={shareHref}
                              class={`${STAGE_PRESS} min-h-[38px] inline-flex items-center px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-teal-200 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                            >
                              {isSpanish ? "Abrir ↗" : "Open ↗"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* Unified Backup & Sync Card (JSON Archive + Encrypted Sync Phrase / SoftStack Passport) */}
          <details class="group bg-[#fffef7] rounded-2xl border-2 border-[#1e1714] shadow-sm">
            <summary class="cursor-pointer list-none min-h-[46px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-black text-[#1e1714] select-none">
              <span class="inline-flex items-center gap-2 min-w-0">
                <StageGlyph kind="key" size={16} />
                <span class="truncate">
                  {isSpanish
                    ? "Respaldo JSON y Sincronización"
                    : "Backup JSON & Device Sync"}
                </span>
              </span>
              <span class="shrink-0 transition-transform group-open:rotate-180 text-[10px]">
                ▾
              </span>
            </summary>

            <div class="p-3.5 pt-2 border-t border-[#1e1714]/10 space-y-3.5">
              {/* 1. Portable Local JSON File Archive */}
              <div class="rounded-xl border-2 border-[#1e1714]/15 bg-[#f7ecdc]/60 p-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-black uppercase tracking-wide text-[#1e1714]">
                    {isSpanish
                      ? "Archivo local portátil (.json)"
                      : "Portable JSON File Archive"}
                  </span>
                </div>
                <p class="text-[11px] text-[#57524b] leading-snug">
                  {isSpanish
                    ? "Guarda o restaura todos los códigos con sus paletas, marcos y metadatos sin cuentas en la nube."
                    : "Save or restore codes with full palettes, frames, and metadata offline without cloud accounts."}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadVaultJson}
                    class={`${STAGE_PRESS} min-h-[42px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-amber-200 text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] inline-flex items-center justify-center gap-1.5`}
                  >
                    <StageGlyph kind="download" size={14} />
                    <span>
                      {isSpanish ? "Descargar JSON" : "Download JSON"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => jsonFileInputRef.current?.click()}
                    class={`${STAGE_PRESS} min-h-[42px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[0_2px_0_#1e1714] inline-flex items-center justify-center gap-1.5`}
                  >
                    <StageGlyph kind="upload" size={14} />
                    <span>
                      {isSpanish ? "Importar JSON" : "Import JSON"}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. SoftStack Passport & Encrypted Sync Bundle */}
              {passport && (
                <div class="space-y-3 pt-1 border-t border-[#1e1714]/10">
                  <div class="flex items-center justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <span class="w-10 h-10 shrink-0 rounded-full border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-xl">
                        {passport.avatarEmoji}
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <span class="font-black text-sm text-[#1e1714] truncate">
                            {passport.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRerollMoniker}
                            title={isSpanish
                              ? "Cambiar apodo del pasaporte"
                              : "Roll new passport moniker"}
                            aria-label={isSpanish
                              ? "Cambiar apodo del pasaporte"
                              : "Roll new passport moniker"}
                            class="shrink-0 min-w-[36px] min-h-[36px] px-2 rounded-full border border-[#1e1714]/25 bg-[#fffef7] hover:bg-amber-100 text-[11px] font-black text-[#1e1714] active:scale-95"
                          >
                            {isSpanish ? "Girar" : "Reroll"}
                          </button>
                        </div>
                        <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f7ecdc] border border-[#1e1714]/20 text-[#57524b]">
                          {quota?.is_active_plus || passport.tier === "plus"
                            ? (isSpanish
                              ? "Pasaporte Plus · 100 códigos"
                              : "Plus Passport · 100 codes")
                            : (isSpanish
                              ? "Pasaporte Libre · Cero cuentas"
                              : "Sovereign Passport · Zero accounts")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySyncUrl}
                      class={`${STAGE_PRESS} px-3 min-h-[40px] text-xs font-black rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-[#1e1714] shadow-[0_2px_0_#1e1714]`}
                    >
                      {isSpanish ? "Copiar enlace" : "Copy Sync Link"}
                    </button>
                  </div>

                  <div class="flex flex-col sm:flex-row items-center gap-3 bg-[#f7ecdc]/40 rounded-xl p-2.5 border border-[#1e1714]/10">
                    <div
                      role="img"
                      aria-label={isSpanish
                        ? "Código QR de emparejamiento de Pasaporte"
                        : "Passport pairing QR code"}
                      class="w-20 h-20 shrink-0 bg-[#fffef7] rounded-lg p-1 border border-[#1e1714]/15 flex items-center justify-center overflow-hidden"
                      // deno-lint-ignore react-no-danger
                      dangerouslySetInnerHTML={{ __html: syncQrSvg }}
                    />
                    <div class="min-w-0 flex-1 text-center sm:text-left space-y-1.5">
                      <p class="font-bold text-xs text-[#1e1714]">
                        {isSpanish
                          ? "Escaneo directo para vincular otro dispositivo"
                          : "Scan from another device for instant pairing"}
                      </p>
                      <button
                        type="button"
                        aria-expanded={showPhrase}
                        onClick={() => setShowPhrase(!showPhrase)}
                        class="min-h-[36px] px-2.5 py-1 text-xs font-black rounded-lg border border-[#1e1714]/25 bg-[#fffef7] hover:bg-amber-100 text-[#1e1714] active:scale-95 transition-transform"
                      >
                        {showPhrase
                          ? (isSpanish ? "Ocultar frase" : "Hide Phrase")
                          : (isSpanish
                            ? "Mostrar frase clave"
                            : "Recovery Phrase")}
                      </button>
                    </div>
                  </div>

                  {showPhrase && (
                    <div class="bg-amber-50 border-2 border-amber-300 rounded-xl p-2.5 text-xs text-[#1e1714] space-y-1">
                      <p class="font-bold text-[10px] uppercase tracking-wider text-amber-900">
                        {isSpanish
                          ? "Frase soberana de recuperación"
                          : "Sovereign Recovery Phrase"}
                      </p>
                      <code class="block font-mono font-bold text-xs bg-[#fffef7] px-2 py-1 rounded border border-amber-200 select-all break-all">
                        {passport.phrase}
                      </code>
                    </div>
                  )}

                  {/* Encrypted Sync Bundle */}
                  <div class="pt-2 border-t border-[#1e1714]/10 space-y-2">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                      <span class="text-[11px] font-black uppercase tracking-wide text-[#1e1714]">
                        {isSpanish
                          ? "Paquete cifrado con llaves de edición"
                          : "Encrypted Bundle (Codes + Edit Keys)"}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyEncryptedBackup}
                        disabled={isExportingBackup}
                        class="min-h-[38px] px-3 py-1.5 rounded-lg border-2 border-[#1e1714] bg-purple-100 hover:bg-purple-200 text-xs font-black text-[#1e1714] active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {isExportingBackup
                          ? (isSpanish ? "Cifrando…" : "Encrypting…")
                          : (isSpanish
                            ? "Copiar paquete cifrado"
                            : "Copy Encrypted Bundle")}
                      </button>
                    </div>
                    <form
                      onSubmit={handleImportEncryptedBackup}
                      class="space-y-1.5"
                    >
                      <label class="sr-only" for="library-backup-json">
                        {isSpanish
                          ? "Pegar paquete cifrado"
                          : "Paste encrypted sync bundle"}
                      </label>
                      <input
                        id="library-backup-json"
                        type="text"
                        value={backupInput}
                        onInput={(e) =>
                          setBackupInput((e.target as HTMLInputElement).value)}
                        placeholder={isSpanish
                          ? "Pegar paquete cifrado de otro dispositivo…"
                          : "Paste encrypted bundle from another device…"}
                        class="w-full min-h-[42px] px-2.5 py-1.5 text-base sm:text-xs font-mono rounded-lg border-2 border-[#1e1714]/15 bg-[#fffef7] text-[#1e1714] focus:border-[#1e1714] focus:outline-none"
                      />
                      {backupInput.trim() !== "" && (
                        <div class="flex flex-col sm:flex-row gap-1.5">
                          <label class="sr-only" for="library-backup-phrase">
                            {isSpanish
                              ? "Frase clave del respaldo"
                              : "Backup recovery phrase"}
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
                              ? "Frase clave (opcional si coincide el pasaporte)…"
                              : "Recovery phrase (optional if same passport)…"}
                            class="flex-1 min-w-0 min-h-[42px] px-2.5 py-1.5 text-base sm:text-xs font-mono rounded-lg border-2 border-[#1e1714]/15 bg-[#fffef7] text-[#1e1714] focus:border-[#1e1714] focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isImportingBackup}
                            class="min-h-[42px] px-3 py-1.5 rounded-lg border-2 border-[#1e1714] bg-amber-200 hover:bg-amber-300 font-black text-xs text-[#1e1714] active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isImportingBackup
                              ? (isSpanish ? "Uniendo…" : "Merging…")
                              : (isSpanish ? "Restaurar" : "Merge Bundle")}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Claim Legacy Tools (only when server library is enabled) */}
          {isPlusLibraryEnabled() && (
            <div class="pt-2 border-t border-[#1e1714]/10 space-y-2">
              {!showImport
                ? (
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImport(true)}
                      class="text-xs font-bold text-[#57524b] hover:text-[#1e1714] underline text-left"
                    >
                      {isSpanish
                        ? "Reclamar código anterior con token ↗"
                        : "Claim legacy code with token ↗"}
                    </button>
                    <button
                      type="button"
                      disabled={importing}
                      onClick={handleImportHistory}
                      class="text-xs font-bold text-[#57524b] hover:text-[#1e1714] underline disabled:opacity-50 text-left sm:text-right"
                    >
                      {importing
                        ? (isSpanish ? "Sincronizando…" : "Syncing…")
                        : (isSpanish
                          ? "Sincronizar dinámicos locales ↺"
                          : "Sync local dynamic codes ↺")}
                    </button>
                  </div>
                )
                : (
                  <form
                    onSubmit={handleClaimLegacy}
                    class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-4 space-y-3"
                  >
                    <div class="flex items-center justify-between">
                      <p class="font-bold text-xs text-[#1e1714]">
                        {isSpanish
                          ? "Reclamar código anterior"
                          : "Claim Pre-Launch Code"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowImport(false)}
                        class="text-xs font-bold text-[#57524b] hover:text-[#1e1714]"
                      >
                        {isSpanish ? "Cancelar" : "Cancel"}
                      </button>
                    </div>
                    <p class="text-[11px] text-[#57524b] leading-relaxed">
                      {isSpanish
                        ? "Pega el token de propietario de un código anterior. Exento del límite de 5 códigos."
                        : "Paste an owner token from an earlier dynamic code. Exempt from the 5-code allowance."}
                    </p>
                    <label class="sr-only" for="library-claim-token-input">
                      {isSpanish ? "Token de propietario" : "QR owner token"}
                    </label>
                    <input
                      id="library-claim-token-input"
                      type="text"
                      value={importToken}
                      onInput={(e) =>
                        setImportToken((e.target as HTMLInputElement).value)}
                      placeholder="ot_..."
                      required
                      class="w-full px-3 py-2 rounded-xl border-2 border-[#1e1714]/15 bg-[#fffef7] text-xs font-mono text-[#1e1714] focus:outline-none focus:border-[#1e1714]"
                    />
                    <button
                      type="submit"
                      disabled={importing || !importToken.trim()}
                      class="w-full py-2 px-3 rounded-xl border-2 border-[#1e1714] bg-amber-300 font-bold text-xs text-[#1e1714] hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {importing
                        ? (isSpanish ? "Reclamando…" : "Claiming…")
                        : (isSpanish ? "Reclamar código →" : "Claim Code →")}
                    </button>
                  </form>
                )}
            </div>
          )}
        </div>

        {/* Footer Action Strip */}
        <div class="pt-3 border-t-2 border-[#1e1714]/10 flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadVaultJson}
              class="min-h-[38px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-amber-100 text-xs font-black text-[#1e1714] inline-flex items-center gap-1.5 transition-colors"
              title={isSpanish
                ? "Descargar archivo portátil qrbuddy-vault.json"
                : "Download portable qrbuddy-vault.json archive"}
            >
              <StageGlyph kind="download" size={14} />
              <span>{isSpanish ? "JSON" : "JSON"}</span>
            </button>
            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              class="min-h-[38px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-amber-100 text-xs font-black text-[#1e1714] inline-flex items-center gap-1.5 transition-colors"
              title={isSpanish
                ? "Importar archivo qrbuddy-vault.json"
                : "Import qrbuddy-vault.json archive"}
            >
              <StageGlyph kind="upload" size={14} />
              <span>{isSpanish ? "Importar" : "Import"}</span>
            </button>
          </div>

          {localHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    isSpanish
                      ? "¿Vaciar todos los códigos guardados localmente? Esta acción no se puede deshacer."
                      : "Clear all locally saved codes? This action cannot be undone.",
                  )
                ) {
                  clearHistory();
                }
              }}
              class="min-h-[38px] px-2.5 py-1 text-xs font-black text-[#c4607a] hover:bg-amber-50 rounded-xl transition-colors"
            >
              {isSpanish ? "Vaciar local" : "Clear local"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
