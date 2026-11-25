import { useEffect, useRef, useState } from "preact/hooks";
import ModalCloseButton from "./modal/ModalCloseButton.tsx";
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
import { getSupabaseUrl } from "../utils/api.ts";
import { apiRequest } from "../utils/api-request.ts";
import {
  addDynamicToHistory,
  clearHistory,
  exportVaultJson,
  filterHistoryItems,
  getHistory,
  type HistoryItem,
  importVaultJson,
  isEditableHistoryItem,
  isFileHistoryItem,
  removeFromHistory,
  renameHistoryItem,
  type SavedQrDesign,
  setHistoryItemTags,
  summarizeQrPayload,
  updateHistoryItem,
  type VaultFilter,
} from "../utils/history.ts";
import {
  buildEditableLibraryCsv,
  type EditableCsvRow,
  parseEditableCsvUpdates,
} from "../utils/csv-repoint.ts";
import { extractShortCodeFromRedirectUrl } from "../hooks/useDynamicQR.ts";
import { looksLikeUrl, normalizeUrl } from "../utils/url.ts";
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
  const mode = design.customStyle?.renderMode;
  if (mode === "halftone") {
    parts.push("Halftone");
  } else if (mode === "foil") {
    parts.push("Flat Foil");
  }
  const print = design.customStyle?.print;
  if (print === "riso") {
    parts.push("Riso");
  } else if (print === "paper") {
    parts.push(isSpanish ? "Papel" : "Paper");
  }
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
    case "whatsapp":
      return "whatsapp";
    case "event":
      return "event";
    case "location":
      return "location";
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

function formatShortDate(value: number | string, isSpanish: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isSpanish ? "es-MX" : "en-AU", {
    day: "numeric",
    month: "short",
  });
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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftDestUrl, setDraftDestUrl] = useState("");
  const [rowSaving, setRowSaving] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importToken, setImportToken] = useState("");
  const [importing, setImporting] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [backupInput, setBackupInput] = useState("");
  const [backupPhraseInput, setBackupPhraseInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [csvSyncing, setCsvSyncing] = useState<
    { done: number; total: number } | null
  >(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isOpen) {
      setConfirmClear(false);
      setExpandedRowKey(null);
      return;
    }
    const p = getOrCreatePassport();
    setPassport(p);
    void refreshLocalHistory();
    loadLibraryData();
  }, [isOpen]);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3500);
    return () => clearTimeout(timer);
  }, [confirmClear]);

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
        isSpanish ? "Archivo JSON descargado" : "JSON archive downloaded",
        2600,
      );
    } catch {
      haptics.error();
      addToast(
        isSpanish
          ? "No se pudo exportar el archivo JSON"
          : "JSON export failed",
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
          ? `${result.imported} códigos nuevos importados · ${result.total} guardados`
          : `Imported ${result.imported} new codes · ${result.total} saved`,
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
            ? "Código anterior agregado a guardados"
            : "Pre-launch code claimed",
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

  const allTagsSet = new Set<string>();
  for (const item of localHistory) {
    const tags = item.metadata?.tags;
    if (Array.isArray(tags)) {
      for (const t of tags) {
        if (typeof t === "string" && t.trim()) {
          allTagsSet.add(t.trim().toLowerCase());
        }
      }
    }
  }
  const allTags = Array.from(allTagsSet).sort();
  const effectiveTag = activeTag && allTags.includes(activeTag)
    ? activeTag
    : null;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredServerCodes = (
    activeFilter === "all" || activeFilter === "editable" ? codes : []
  ).filter((c) => {
    const matchingLocal = localByShortCode.get(c.short_code);
    const localTagsList = Array.isArray(matchingLocal?.metadata?.tags)
      ? matchingLocal.metadata.tags.map((t) => String(t).toLowerCase())
      : [];
    if (effectiveTag && !localTagsList.includes(effectiveTag)) {
      return false;
    }
    if (!normalizedSearch) return true;
    return (
      (c.title ?? "").toLowerCase().includes(normalizedSearch) ||
      c.destination_url.toLowerCase().includes(normalizedSearch) ||
      c.short_code.toLowerCase().includes(normalizedSearch) ||
      localTagsList.join(" ").includes(normalizedSearch)
    );
  });

  const filteredLocalHistory = filterHistoryItems(dedupedLocalHistory, {
    query: search,
    filter: activeFilter,
  }).filter((item) => {
    if (!effectiveTag) return true;
    const tags = Array.isArray(item.metadata?.tags)
      ? item.metadata.tags.map((t) => String(t).toLowerCase())
      : [];
    return tags.includes(effectiveTag);
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

  const withEditLang = (url: string): string =>
    isSpanish && !/[?&]lang=/.test(url)
      ? `${url}${url.includes("?") ? "&" : "?"}lang=es`
      : url;

  const resolveItemEditUrl = (item: HistoryItem): string | null => {
    if (typeof item.metadata?.editUrl === "string" && item.metadata.editUrl) {
      return withEditLang(item.metadata.editUrl);
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
      return withEditLang(`/edit?token=${encodeURIComponent(token)}`);
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
      return withEditLang(`/edit?token=${encodeURIComponent(tok)}`);
    }
    return null;
  };

  const extractTokenFromEditHref = (href: string | null): string | null => {
    if (!href) return null;
    try {
      const parsed = new URL(href, "https://qrbuddy.app");
      return parsed.searchParams.get("token")?.trim() || null;
    } catch {
      return null;
    }
  };

  const toggleRowQuickEdit = (
    key: string,
    initialLabel: string,
    initialTags: string[],
    initialDestUrl: string,
  ) => {
    if (expandedRowKey === key) {
      setExpandedRowKey(null);
      return;
    }
    setExpandedRowKey(key);
    setDraftLabel(initialLabel);
    setDraftTags(initialTags.map((t) => `#${t}`).join(" "));
    setDraftDestUrl(initialDestUrl);
    haptics.light();
  };

  const copyShortLink = async (href: string) => {
    try {
      await navigator.clipboard.writeText(href);
      haptics.copy();
      addToast(isSpanish ? "Link copiado" : "Link copied", 2200);
    } catch {
      haptics.error();
    }
  };

  const handleQuickSaveRow = async (opts: {
    idOrShortCode: string;
    shortCode?: string;
    redirectUrl?: string;
    currentLabel?: string;
    currentDestUrl?: string;
    ownerToken?: string | null;
    isDynamic: boolean;
  }) => {
    if (rowSaving) return;
    setRowSaving(true);
    try {
      const cleanLabel = draftLabel.trim();
      const cleanDest = draftDestUrl.trim();
      const labelChanged = cleanLabel !== (opts.currentLabel ?? "").trim();
      const destChanged = Boolean(cleanDest) &&
        cleanDest !== (opts.currentDestUrl ?? "").trim();
      let updatedRemoteDest = "";

      if (
        opts.isDynamic &&
        opts.ownerToken &&
        (destChanged || labelChanged)
      ) {
        let normalizedDest: string | undefined;
        if (destChanged) {
          if (!looksLikeUrl(cleanDest)) {
            addToast(
              isSpanish
                ? "El destino necesita un link válido (https://…)"
                : "Destination needs a valid URL (https://…)",
              3000,
            );
            haptics.error();
            return;
          }
          normalizedDest = normalizeUrl(cleanDest);
        }
        await apiRequest(
          `${getSupabaseUrl()}/functions/v1/update-dynamic-qr`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner_token: opts.ownerToken,
              ...(normalizedDest ? { destination_url: normalizedDest } : {}),
              ...(labelChanged ? { title: cleanLabel || null } : {}),
            }),
          },
          isSpanish ? "No se pudo actualizar el código" : "Could not update QR",
        );
        if (normalizedDest) updatedRemoteDest = normalizedDest;
        if (opts.shortCode) {
          setCodes((prev) =>
            prev.map((c) =>
              c.short_code === opts.shortCode
                ? {
                  ...c,
                  ...(normalizedDest
                    ? { destination_url: normalizedDest }
                    : {}),
                  ...(labelChanged ? { title: cleanLabel || null } : {}),
                }
                : c
            )
          );
        }
      }

      const targetKey = opts.shortCode || opts.idOrShortCode;
      let savedLocal = renameHistoryItem(targetKey, cleanLabel);
      if (!savedLocal && opts.shortCode) {
        addDynamicToHistory({
          url: updatedRemoteDest || opts.currentDestUrl || "",
          redirectUrl: opts.redirectUrl,
          shortCode: opts.shortCode,
          label: cleanLabel || undefined,
          ownerScope: "qr",
        });
        savedLocal = true;
      }
      setHistoryItemTags(targetKey, draftTags);
      if (updatedRemoteDest) {
        updateHistoryItem(
          (item) =>
            item.id === targetKey ||
            (Boolean(opts.shortCode) &&
              item.metadata?.shortCode === opts.shortCode),
          (item) => ({
            ...item,
            metadata: {
              ...item.metadata,
              url: updatedRemoteDest,
              destinationUrl: updatedRemoteDest,
              title: cleanLabel || updatedRemoteDest,
              ...(cleanLabel ? { label: cleanLabel } : {}),
            },
          }),
        );
      }

      await refreshLocalHistory();
      setExpandedRowKey(null);
      haptics.success();
      addToast(
        updatedRemoteDest
          ? (isSpanish
            ? "Destino y detalles guardados ✓"
            : "Destination & details saved ✓")
          : (isSpanish ? "Detalles guardados ✓" : "Saved changes ✓"),
        2500,
      );
    } catch (err) {
      haptics.error();
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish ? "No se pudo guardar" : "Could not save"),
        3500,
      );
    } finally {
      setRowSaving(false);
    }
  };

  const editableCsvRows: EditableCsvRow[] = [];
  const seenCsvCodes = new Set<string>();
  for (const c of codes) {
    if (!c.short_code || seenCsvCodes.has(c.short_code)) continue;
    seenCsvCodes.add(c.short_code);
    const matchingLocal = localByShortCode.get(c.short_code);
    const title = (typeof matchingLocal?.metadata?.label === "string" &&
      matchingLocal.metadata.label.trim()) ||
      (c.title && c.title !== c.destination_url ? c.title.trim() : "") ||
      "";
    const tags = Array.isArray(matchingLocal?.metadata?.tags)
      ? matchingLocal.metadata.tags.filter((t): t is string =>
        typeof t === "string"
      )
      : [];
    const ownerTok = ownerTokensByCode[c.short_code] ||
      extractTokenFromEditHref(resolveServerCodeEditUrl(c)) ||
      undefined;
    editableCsvRows.push({
      shortCode: c.short_code,
      title,
      destinationUrl: c.destination_url,
      tags,
      redirectUrl: c.redirect_url ||
        `${
          typeof globalThis.location !== "undefined"
            ? globalThis.location.origin
            : "https://qrbuddy.app"
        }/r?code=${c.short_code}`,
      scanCount: c.scan_count ?? 0,
      isActive: c.is_active !== false,
      ownerToken: ownerTok,
    });
  }
  for (const item of dedupedLocalHistory) {
    if (!isEditableHistoryItem(item)) continue;
    const sc = (typeof item.metadata?.shortCode === "string" &&
      item.metadata.shortCode.trim()) ||
      extractShortCodeFromRedirectUrl(item.content) ||
      "";
    if (!sc || seenCsvCodes.has(sc)) continue;
    seenCsvCodes.add(sc);
    const destUrl = typeof item.metadata?.destinationUrl === "string"
      ? item.metadata.destinationUrl
      : (typeof item.metadata?.url === "string" ? item.metadata.url : "");
    if (!destUrl) continue;
    const label = (typeof item.metadata?.label === "string" &&
      item.metadata.label.trim()) ||
      (typeof item.metadata?.title === "string" &&
          item.metadata.title.trim() !== destUrl.trim() &&
          item.metadata.title.trim() !== item.content.trim()
        ? item.metadata.title.trim()
        : "");
    const tags = Array.isArray(item.metadata?.tags)
      ? item.metadata.tags.filter((t): t is string => typeof t === "string")
      : [];
    const ownerTok = ownerTokensByCode[sc] ||
      (typeof item.metadata?.ownerToken === "string"
        ? item.metadata.ownerToken
        : undefined) ||
      extractTokenFromEditHref(resolveItemEditUrl(item)) ||
      undefined;
    const scanCount = typeof item.metadata?.scanCount === "number"
      ? item.metadata.scanCount
      : 0;
    editableCsvRows.push({
      shortCode: sc,
      title: label,
      destinationUrl: destUrl,
      tags,
      redirectUrl: item.content,
      scanCount,
      isActive: true,
      ownerToken: ownerTok,
    });
  }

  function exportLibraryCsv() {
    if (editableCsvRows.length === 0) return;
    const csv = buildEditableLibraryCsv(editableCsvRows);
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "qrbuddy-editable-codes.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    haptics.light();
    addToast(
      isSpanish
        ? `Exportados ${editableCsvRows.length} códigos a CSV`
        : `Exported ${editableCsvRows.length} editable QRs to CSV`,
      2500,
    );
  }

  const handleImportEditableCsv = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const map = new Map(editableCsvRows.map((row) => [row.shortCode, row]));
      const parsed = parseEditableCsvUpdates(text, map);

      if (parsed.updates.length === 0) {
        haptics.error();
        addToast(
          parsed.errors[0] ||
            (isSpanish
              ? "No hay cambios nuevos que aplicar en ese CSV"
              : "No changes found in that CSV"),
          3500,
        );
        return;
      }

      setCsvSyncing({ done: 0, total: parsed.updates.length });
      let updatedCount = 0;
      let missingKeys = 0;

      for (let i = 0; i < parsed.updates.length; i++) {
        const u = parsed.updates[i];
        setCsvSyncing({ done: i, total: parsed.updates.length });

        const needsRemote = u.destinationChanged || u.titleChanged;
        if (needsRemote) {
          if (!u.ownerToken) {
            missingKeys++;
            continue;
          }
          await apiRequest(
            `${getSupabaseUrl()}/functions/v1/update-dynamic-qr`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                owner_token: u.ownerToken,
                ...(u.destinationChanged && u.nextDestinationUrl
                  ? { destination_url: u.nextDestinationUrl }
                  : {}),
                ...(u.titleChanged ? { title: u.nextTitle || null } : {}),
              }),
            },
            `Failed updating ${u.shortCode}`,
          );
          setCodes((prev) =>
            prev.map((c) =>
              c.short_code === u.shortCode
                ? {
                  ...c,
                  ...(u.destinationChanged && u.nextDestinationUrl
                    ? { destination_url: u.nextDestinationUrl }
                    : {}),
                  ...(u.titleChanged ? { title: u.nextTitle || null } : {}),
                }
                : c
            )
          );
        }

        if (u.titleChanged && u.nextTitle !== undefined) {
          const renamed = renameHistoryItem(u.shortCode, u.nextTitle);
          if (!renamed && u.nextTitle) {
            const existingRow = map.get(u.shortCode);
            if (existingRow) {
              addDynamicToHistory({
                url: u.nextDestinationUrl ?? existingRow.destinationUrl,
                redirectUrl: existingRow.redirectUrl,
                shortCode: u.shortCode,
                label: u.nextTitle,
                tags: u.tagsChanged ? u.nextTags : existingRow.tags,
                ownerScope: "qr",
              });
            }
          }
        }
        if (u.tagsChanged && u.nextTags !== undefined) {
          setHistoryItemTags(u.shortCode, u.nextTags);
        }
        if (u.destinationChanged && u.nextDestinationUrl) {
          const nextDest = u.nextDestinationUrl;
          updateHistoryItem(
            (item) =>
              item.metadata?.shortCode === u.shortCode ||
              item.content.includes(`code=${u.shortCode}`),
            (item) => {
              const keptLabel = typeof item.metadata?.label === "string"
                ? item.metadata.label.trim()
                : "";
              return {
                ...item,
                metadata: {
                  ...item.metadata,
                  url: nextDest,
                  destinationUrl: nextDest,
                  title: keptLabel || nextDest,
                  ...(keptLabel ? { label: keptLabel } : {}),
                },
              };
            },
          );
        }
        updatedCount++;
      }

      await refreshLocalHistory();
      haptics.success();
      const extraErr = missingKeys > 0
        ? (isSpanish
          ? ` (${missingKeys} sin llave local)`
          : ` (${missingKeys} missing local key)`)
        : "";
      addToast(
        isSpanish
          ? `${updatedCount} QR actualizados desde CSV ✓${extraErr}`
          : `Updated ${updatedCount} QR code${
            updatedCount === 1 ? "" : "s"
          } from CSV ✓${extraErr}`,
        4000,
      );
    } catch (err) {
      haptics.error();
      addToast(
        err instanceof Error
          ? err.message
          : (isSpanish
            ? "No se pudo aplicar el CSV"
            : "Failed to apply CSV updates"),
        4000,
      );
    } finally {
      setCsvSyncing(null);
      input.value = "";
    }
  };

  const renderQuickEditPanel = (opts: {
    rowKey: string;
    idOrShortCode: string;
    shortCode?: string;
    redirectUrl?: string;
    currentLabel?: string;
    currentDestUrl?: string;
    ownerToken?: string | null;
    isDynamic: boolean;
  }) => {
    if (expandedRowKey !== opts.rowKey) return null;
    const fullShortUrl = opts.redirectUrl ||
      (opts.shortCode
        ? `${
          typeof globalThis.location !== "undefined"
            ? globalThis.location.origin
            : "https://qrbuddy.app"
        }/r?code=${opts.shortCode}`
        : "");
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleQuickSaveRow(opts);
        }}
        data-quick-edit-panel
        class="mt-1 pt-2.5 border-t-2 border-[#1e1714]/12 space-y-2"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-[#57524b] mb-1">
              {isSpanish ? "Nombre / Etiqueta" : "Name / Label"}
            </label>
            <input
              type="text"
              maxLength={64}
              value={draftLabel}
              onInput={(e) =>
                setDraftLabel((e.target as HTMLInputElement).value)}
              placeholder={isSpanish
                ? "ej. Menú Comida, Mesa 4"
                : "e.g. Lunch Menu, Table 4"}
              class="qr-input min-h-[38px] !py-1.5 text-xs"
            />
          </div>
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-[#57524b] mb-1">
              {isSpanish ? "Etiquetas (#)" : "Tags (#)"}
            </label>
            <input
              type="text"
              value={draftTags}
              onInput={(e) =>
                setDraftTags((e.target as HTMLInputElement).value)}
              placeholder={isSpanish ? "#menus, #local1" : "#menus, #brunswick"}
              class="qr-input min-h-[38px] !py-1.5 text-xs"
            />
          </div>
        </div>

        {opts.isDynamic && opts.ownerToken && (
          <div>
            <label class="block text-[10px] font-black uppercase tracking-wider text-[#57524b] mb-1">
              {isSpanish
                ? "URL de destino (en vivo)"
                : "Destination URL (live)"}
            </label>
            <input
              type="url"
              value={draftDestUrl}
              onInput={(e) =>
                setDraftDestUrl((e.target as HTMLInputElement).value)}
              placeholder="https://..."
              class="qr-input min-h-[38px] !py-1.5 text-xs font-mono"
            />
          </div>
        )}

        <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {fullShortUrl
            ? (
              <button
                type="button"
                onClick={() => void copyShortLink(fullShortUrl)}
                class={`${STAGE_PRESS} min-h-[32px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714]/40 hover:border-[#1e1714] bg-[#fffef7] text-[11px] font-black text-[#1e1714]`}
              >
                {isSpanish
                  ? `Copiar /r?code=${opts.shortCode}`
                  : `Copy /r?code=${opts.shortCode}`}
              </button>
            )
            : <span />}
          <div class="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setExpandedRowKey(null)}
              class="min-h-[32px] px-2.5 py-1 text-xs font-bold text-[#57524b] hover:text-[#1e1714]"
            >
              {isSpanish ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={rowSaving}
              class={`${STAGE_PRESS} min-h-[32px] px-3 py-1 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] disabled:opacity-50`}
            >
              {rowSaving
                ? (isSpanish ? "Guardando…" : "Saving…")
                : (isSpanish ? "Guardar" : "Save")}
            </button>
          </div>
        </div>
      </form>
    );
  };

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
        class={`bg-[#fbf1e4] w-full max-w-lg sm:max-w-2xl lg:max-w-3xl rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-[#1e1714] p-4 sm:p-6 shadow-chunky max-h-[92dvh] flex flex-col charm-modal-drawer pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 outline-none${
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
        <input
          ref={csvFileInputRef}
          type="file"
          accept=".csv,text/csv"
          class="hidden"
          onChange={handleImportEditableCsv}
        />

        {/* Header */}
        <div class="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#1e1714]/12">
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              class="w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] flex items-center justify-center text-[#1e1714] shadow-[0_2px_0_#1e1714] shrink-0"
            >
              <StageGlyph kind="history" size={18} />
            </span>
            <h2
              id="library-title"
              class="font-black text-xl tracking-tight text-[#1e1714] truncate"
            >
              {isSpanish ? "Guardados" : "Saved"}
            </h2>
            {allCount > 0 && (
              <span class="px-2 py-0.5 rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-[11px] font-black text-[#1e1714] leading-none">
                {allCount}
              </span>
            )}
          </div>
          <ModalCloseButton
            data-history-close
            onClick={shell.requestClose}
            aria-label={isSpanish ? "Cerrar guardados" : "Close saved"}
            class="shrink-0 -mr-1"
          />
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto scrollbar-none py-3.5 space-y-3">
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
                class="qr-input min-h-[44px] !py-2 !pl-10 !pr-9"
              />
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1e1714] pointer-events-none">
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
                  class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-[#1e1714] hover:bg-[#efe9dc]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills (proportional cols so zero mobile ellipsis) */}
            <div
              role="group"
              aria-label={isSpanish ? "Filtrar categoría" : "Filter category"}
              class="grid grid-cols-[0.82fr_1.34fr_0.96fr_0.88fr] sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-[#efe9dc] border-2 border-[#1e1714]"
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
                    class={`min-h-[34px] px-1 sm:px-2.5 py-1 rounded-xl text-[10.5px] sm:text-xs font-black whitespace-nowrap inline-flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 transition-all ${
                      active
                        ? "bg-[#ffbe0b] border-2 border-[#1e1714] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                        : "border-2 border-transparent text-[#4a3f39] hover:text-[#1e1714] hover:bg-[#fffef7]/70"
                    }`}
                  >
                    <span class="truncate">{pill.label}</span>
                    <span
                      class={`px-1 sm:px-1.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] leading-none font-black shrink-0 ${
                        active
                          ? "bg-[#fffef7] border border-[#1e1714]/50 text-[#1e1714]"
                          : "bg-[#fbf1e4] border border-[#1e1714]/20 text-[#57524b]"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Venue / Client #tag filter strip */}
            {allTags.length > 0 && (
              <div
                role="group"
                aria-label={isSpanish
                  ? "Filtrar por etiqueta"
                  : "Filter by tag"}
                class="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5"
              >
                <button
                  type="button"
                  aria-pressed={effectiveTag === null}
                  onClick={() => {
                    setActiveTag(null);
                    haptics.light();
                  }}
                  class={`min-h-[30px] px-2.5 py-0.5 rounded-full border-2 text-[11px] font-black whitespace-nowrap transition-all ${
                    effectiveTag === null
                      ? "border-[#1e1714] bg-[#1e1714] text-[#fffef7]"
                      : "border-[#1e1714]/25 bg-[#fffef7] text-[#4a3f39] hover:border-[#1e1714]"
                  }`}
                >
                  {isSpanish ? "Todas" : "All tags"}
                </button>
                {allTags.map((tag) => {
                  const selected = effectiveTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setActiveTag(selected ? null : tag);
                        haptics.light();
                      }}
                      class={`min-h-[30px] px-2.5 py-0.5 rounded-full border-2 text-[11px] font-black whitespace-nowrap transition-all ${
                        selected
                          ? "border-[#1e1714] bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                          : "border-[#1e1714]/20 bg-[#fffef7] text-[#4a3f39] hover:border-[#1e1714]"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CSV Round-Trip Bulk Repoint Bar */}
            {editableCsvRows.length > 0 &&
              (activeFilter === "all" || activeFilter === "editable") && (
              <div class="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                <span class="text-[11px] font-bold text-[#57524b]">
                  {isSpanish
                    ? `Edición masiva (${editableCsvRows.length} editables)`
                    : `Bulk CSV edit (${editableCsvRows.length} editable)`}
                </span>
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={exportLibraryCsv}
                    class={`${STAGE_PRESS} min-h-[30px] inline-flex items-center gap-1 rounded-full border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] px-2.5 py-0.5 text-[11px] font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                  >
                    <span>↓</span>
                    <span>{isSpanish ? "Exportar CSV" : "Export CSV"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(csvSyncing)}
                    onClick={() => csvFileInputRef.current?.click()}
                    class={`${STAGE_PRESS} min-h-[30px] inline-flex items-center gap-1 rounded-full border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] px-2.5 py-0.5 text-[11px] font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] disabled:opacity-50`}
                  >
                    <span>↑</span>
                    <span>
                      {csvSyncing
                        ? `${csvSyncing.done}/${csvSyncing.total}…`
                        : (isSpanish ? "Actualizar vía CSV" : "Update CSV")}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quota Progress Bar (when server library quota present) */}
          {quota && (
            <div class="qr-menu-pod p-3.5 space-y-2">
              <div class="flex items-center justify-between gap-2 text-xs font-bold">
                <span class="qr-section-eyebrow">
                  <span class="qr-section-pip bg-[#ffbe0b]" />
                  {isSpanish
                    ? "Cupo de códigos dinámicos"
                    : "Editable Allowance"}
                </span>
                <span class="font-black text-[#1e1714]">
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
                class="w-full h-2.5 bg-[#efe9dc] rounded-full border-2 border-[#1e1714] overflow-hidden"
              >
                <div
                  class={`h-full transition-all duration-300 ${
                    quota.used_count >= quota.total_allowed
                      ? "bg-[#ffbe0b]"
                      : "bg-[#248a64]"
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
                <p class="text-[11px] text-[#57524b] font-bold">
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
              <div class="qr-menu-pod text-center py-7 p-5 space-y-2">
                <div class="w-10 h-10 mx-auto rounded-2xl border-2 border-[#1e1714] bg-[#f7ecdc] flex items-center justify-center text-[#1e1714] shadow-[0_1.5px_0_#1e1714]">
                  <StageGlyph kind="history" size={18} />
                </div>
                <p class="font-black text-sm text-[#1e1714]">
                  {allCount === 0
                    ? (isSpanish
                      ? "Sin códigos guardados"
                      : "No saved codes yet")
                    : (isSpanish ? "Sin coincidencias" : "No matching codes")}
                </p>
                <p class="text-xs font-medium text-[#57524b] max-w-xs mx-auto leading-relaxed">
                  {allCount === 0
                    ? (isSpanish
                      ? "Los QR exportados, links editables y envíos se guardan aquí con su diseño."
                      : "Exported QRs, editable links, and file drops save locally with their design.")
                    : (isSpanish
                      ? "Prueba otra búsqueda o cambia el filtro."
                      : "Try another search term or switch the filter.")}
                </p>
              </div>
            )
            : (
              <div class="space-y-2">
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
                  const shortDate = formatShortDate(c.created_at, isSpanish);
                  const scanMeta = `${c.scan_count} ${
                    isSpanish
                      ? (c.scan_count === 1 ? "escaneo" : "escaneos")
                      : (c.scan_count === 1 ? "scan" : "scans")
                  }`;
                  const metaLine = [c.destination_url, scanMeta, shortDate]
                    .filter(Boolean)
                    .join(" · ");

                  const triggerServerLoad = () => {
                    if (!onSelect) return;
                    onSelect({
                      id: matchingLocal?.id ?? c.id,
                      type: "dynamic",
                      content: c.redirect_url || c.destination_url,
                      timestamp: new Date(c.created_at).getTime(),
                      metadata: {
                        ...(matchingLocal?.metadata ?? {}),
                        title: c.title || matchingLocal?.metadata?.title ||
                          c.short_code,
                        shortCode: c.short_code,
                        loadToStage: true,
                      },
                    });
                    haptics.light();
                    shell.requestClose();
                  };

                  const rowKey = `srv:${c.id}`;
                  const resolvedLabel =
                    (typeof matchingLocal?.metadata?.label === "string" &&
                      matchingLocal.metadata.label.trim()) ||
                    (c.title && c.title !== c.destination_url ? c.title : "") ||
                    (typeof matchingLocal?.metadata?.title === "string" &&
                        matchingLocal.metadata.title !== c.destination_url
                      ? matchingLocal.metadata.title
                      : "");
                  const rowToken = ownerTokensByCode[c.short_code] ||
                    extractTokenFromEditHref(editHref);
                  const isRowExpanded = expandedRowKey === rowKey;

                  return (
                    <div
                      key={c.id}
                      class="qr-menu-pod px-3 py-2.5 space-y-2"
                    >
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={triggerServerLoad}
                          disabled={!onSelect}
                          class="flex items-center gap-2.5 min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] rounded-xl disabled:cursor-default"
                        >
                          <span
                            aria-hidden="true"
                            class="w-9 h-9 rounded-xl border-2 border-[#1e1714] bg-[#ede9fe] flex items-center justify-center text-[#1e1714] shrink-0"
                          >
                            <StageGlyph kind="dynamic" size={16} />
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-black text-sm text-[#1e1714] truncate">
                                {resolvedLabel || c.title || c.short_code}
                              </span>
                              <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-[#ede9fe] text-[#1e1714] border border-[#1e1714]/45 rounded-md">
                                {isSpanish ? "Editable" : "Editable"}
                              </span>
                              {designBadge && (
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black bg-[#fffef7] text-[#1e1714] border border-[#1e1714]/40 rounded-md">
                                  <span
                                    aria-hidden="true"
                                    class="w-2 h-2 rounded-full border border-[#1e1714]/50 shrink-0"
                                    style={{ background: designBadge.gradient }}
                                  />
                                  <span>{designBadge.label}</span>
                                </span>
                              )}
                              {c.is_legacy && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black bg-[#fef3c7] text-[#1e1714] border border-[#1e1714]/45 rounded-md">
                                  {isSpanish ? "Clásico" : "Legacy"}
                                </span>
                              )}
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  class="px-1.5 py-0.5 text-[10px] font-bold bg-[#f7ecdc] text-[#57524b] border border-[#1e1714]/20 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <p class="text-xs font-medium text-[#57524b] truncate mt-0.5">
                              {metaLine}
                            </p>
                          </div>
                        </button>

                        <div class="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            aria-expanded={isRowExpanded}
                            aria-label={isSpanish
                              ? `Edición rápida de ${c.short_code}`
                              : `Quick edit ${c.short_code}`}
                            title={isSpanish ? "Edición rápida" : "Quick edit"}
                            onClick={() =>
                              toggleRowQuickEdit(
                                rowKey,
                                resolvedLabel,
                                tags,
                                c.destination_url,
                              )}
                            class={`${STAGE_PRESS} min-h-[34px] min-w-[34px] px-2 py-1 rounded-xl border-2 border-[#1e1714] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] ${
                              isRowExpanded
                                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)]"
                                : "bg-[#fffef7] hover:bg-[#f7ecdc]"
                            }`}
                          >
                            ✎
                          </button>
                          {onSelect && (
                            <button
                              type="button"
                              onClick={triggerServerLoad}
                              class={`${STAGE_PRESS} min-h-[34px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                            >
                              {isSpanish ? "Cargar" : "Load"}
                            </button>
                          )}
                          {editHref && (
                            <a
                              href={editHref}
                              class={`${STAGE_PRESS} min-h-[34px] inline-flex items-center px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                            >
                              {isSpanish ? "Stats ↗" : "Edit & Stats ↗"}
                            </a>
                          )}
                        </div>
                      </div>

                      {renderQuickEditPanel({
                        rowKey,
                        idOrShortCode: matchingLocal?.id ?? c.short_code,
                        shortCode: c.short_code,
                        redirectUrl: c.redirect_url,
                        currentLabel: resolvedLabel,
                        currentDestUrl: c.destination_url,
                        ownerToken: rowToken,
                        isDynamic: true,
                      })}
                    </div>
                  );
                })}

                {filteredLocalHistory.map((item) => {
                  const summary = summarizeQrPayload(item.content);
                  const displayType =
                    item.type === "url" && summary.type !== "url"
                      ? summary.type
                      : item.type;
                  const explicitLabel = typeof item.metadata?.label === "string"
                    ? item.metadata.label.trim()
                    : "";
                  const title = explicitLabel || item.metadata?.title ||
                    summary.title;
                  const shortCode = typeof item.metadata?.shortCode === "string"
                    ? item.metadata.shortCode.trim()
                    : "";
                  const destUrl =
                    typeof item.metadata?.destinationUrl === "string"
                      ? item.metadata.destinationUrl
                      : (typeof item.metadata?.url === "string"
                        ? item.metadata.url
                        : item.content);
                  const rawSubtitle = item.type === "file"
                    ? (isSpanish ? "Buzón de archivos" : "File Locker")
                    : ((item.metadata?.subtitle as string) ||
                      (destUrl && destUrl !== title ? destUrl : "") ||
                      summary.subtitle);
                  const typedSubtitle = displayType === "wifi" && rawSubtitle &&
                      !/wi-?fi/i.test(rawSubtitle) &&
                      rawSubtitle !== "Open network"
                    ? `${rawSubtitle} Wi-Fi`
                    : rawSubtitle;
                  const shortDate = formatShortDate(item.timestamp, isSpanish);
                  const scanCount = typeof item.metadata?.scanCount === "number"
                    ? `${item.metadata.scanCount} ${
                      isSpanish
                        ? (item.metadata.scanCount === 1
                          ? "escaneo"
                          : "escaneos")
                        : (item.metadata.scanCount === 1 ? "scan" : "scans")
                    }`
                    : "";
                  const metaLine = [typedSubtitle, scanCount, shortDate]
                    .filter(Boolean)
                    .join(" · ");

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

                  const rowKey = `loc:${item.id}`;
                  const rowToken =
                    (shortCode ? ownerTokensByCode[shortCode] : undefined) ||
                    (typeof item.metadata?.ownerToken === "string"
                      ? item.metadata.ownerToken
                      : undefined) ||
                    extractTokenFromEditHref(editHref);
                  const isRowExpanded = expandedRowKey === rowKey;
                  const seedLabel = explicitLabel ||
                    (typeof item.metadata?.title === "string" &&
                        item.metadata.title !== destUrl &&
                        item.metadata.title !== item.content
                      ? item.metadata.title
                      : "");

                  return (
                    <div
                      key={item.id}
                      class="qr-menu-pod px-3 py-2.5 space-y-2"
                    >
                      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={triggerLoad}
                          disabled={!onSelect}
                          class="flex items-center gap-2.5 min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] rounded-xl disabled:cursor-default"
                        >
                          <span
                            class={`w-9 h-9 rounded-xl border-2 border-[#1e1714] flex items-center justify-center text-[#1e1714] shrink-0 ${
                              isDynamicItem
                                ? "bg-[#ede9fe]"
                                : isFileItem
                                ? "bg-[#dcfce7]"
                                : "bg-[#f7ecdc]"
                            }`}
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
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-[#ede9fe] text-[#1e1714] border border-[#1e1714]/45 rounded-md">
                                  {shortCode ||
                                    (isSpanish ? "Editable" : "Editable")}
                                </span>
                              )}
                              {isFileItem && (
                                <span class="px-1.5 py-0.5 text-[10px] font-black uppercase bg-[#dcfce7] text-[#1e1714] border border-[#1e1714]/45 rounded-md">
                                  {item.type === "file"
                                    ? (isSpanish ? "Buzón" : "Locker")
                                    : (isSpanish ? "Archivo" : "File Drop")}
                                </span>
                              )}
                              {designBadge && (
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black bg-[#fffef7] text-[#1e1714] border border-[#1e1714]/40 rounded-md">
                                  <span
                                    aria-hidden="true"
                                    class="w-2 h-2 rounded-full border border-[#1e1714]/50 shrink-0"
                                    style={{ background: designBadge.gradient }}
                                  />
                                  <span>{designBadge.label}</span>
                                </span>
                              )}
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  class="px-1.5 py-0.5 text-[10px] font-bold bg-[#f7ecdc] text-[#57524b] border border-[#1e1714]/20 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <p class="text-xs font-medium text-[#57524b] truncate mt-0.5">
                              {metaLine}
                            </p>
                          </div>
                        </button>

                        <div class="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            aria-expanded={isRowExpanded}
                            aria-label={isSpanish
                              ? `Edición rápida de ${title}`
                              : `Quick edit ${title}`}
                            title={isSpanish ? "Edición rápida" : "Quick edit"}
                            onClick={() =>
                              toggleRowQuickEdit(
                                rowKey,
                                seedLabel,
                                tags,
                                destUrl,
                              )}
                            class={`${STAGE_PRESS} min-h-[34px] min-w-[34px] px-2 py-1 rounded-xl border-2 border-[#1e1714] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] ${
                              isRowExpanded
                                ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)]"
                                : "bg-[#fffef7] hover:bg-[#f7ecdc]"
                            }`}
                          >
                            ✎
                          </button>
                          {onSelect && (
                            <button
                              type="button"
                              onClick={triggerLoad}
                              class={`${STAGE_PRESS} min-h-[34px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                            >
                              {isSpanish ? "Cargar" : "Load"}
                            </button>
                          )}
                          {editHref && (
                            <a
                              href={editHref}
                              class={`${STAGE_PRESS} min-h-[34px] inline-flex items-center px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                            >
                              {isSpanish ? "Editar ↗" : "Edit & Stats ↗"}
                            </a>
                          )}
                          {shareHref && (
                            <a
                              href={shareHref}
                              class={`${STAGE_PRESS} min-h-[34px] inline-flex items-center px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                            >
                              {isSpanish ? "Abrir ↗" : "Open ↗"}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromHistory(item.id)}
                            aria-label={isSpanish
                              ? `Quitar ${title}`
                              : `Remove ${title}`}
                            title={isSpanish ? "Quitar" : "Remove"}
                            class="shrink-0 w-8 h-8 rounded-full border-2 border-[#1e1714]/40 hover:border-[#1e1714] bg-[#f7ecdc] hover:bg-[#ffbe0b] text-[#1e1714] flex items-center justify-center text-xs font-black transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {renderQuickEditPanel({
                        rowKey,
                        idOrShortCode: item.id,
                        shortCode: shortCode || undefined,
                        redirectUrl: isDynamicItem ? item.content : undefined,
                        currentLabel: seedLabel,
                        currentDestUrl: destUrl,
                        ownerToken: rowToken,
                        isDynamic: isDynamicItem,
                      })}
                    </div>
                  );
                })}
              </div>
            )}

          {/* Collapsible Backup & Device Sync: Passport Pairing first, Offline archives tucked cleanly */}
          <details class="group qr-menu-pod">
            <summary class="cursor-pointer list-none min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-2 text-xs font-black text-[#1e1714] select-none">
              <span class="inline-flex items-center gap-2 min-w-0">
                <span class="w-7 h-7 rounded-lg border-2 border-[#1e1714] bg-[#f7ecdc] flex items-center justify-center text-[#1e1714] shrink-0">
                  <StageGlyph kind="key" size={14} />
                </span>
                <span class="truncate">
                  {isSpanish
                    ? "Sincronizar dispositivos y respaldo"
                    : "Device Sync & Backup"}
                </span>
              </span>
              <span class="w-6 h-6 rounded-full border border-[#1e1714]/35 bg-[#fbf1e4] inline-flex items-center justify-center shrink-0 transition-transform group-open:rotate-180 text-[10px]">
                ▾
              </span>
            </summary>

            <div class="p-3.5 pt-3 border-t-2 border-[#1e1714]/10 space-y-3">
              {/* 1. Primary Story: 4-Word Passport Pairing */}
              {passport && (
                <div class="space-y-2">
                  <div>
                    <span class="qr-section-eyebrow">
                      <span class="qr-section-pip bg-[#ede9fe]" />
                      {isSpanish ? "Pasaporte local" : "Passport Pairing"}
                    </span>
                    <p class="text-[11px] font-medium text-[#57524b] mt-0.5">
                      {isSpanish
                        ? "Abre tus Guardados en otra laptop o iPad del equipo sin crear cuenta."
                        : "Open your Saved shelf on another laptop or team iPad — zero accounts."}
                    </p>
                  </div>
                  <div class="flex items-center justify-between gap-2 flex-wrap bg-[#fbf1e4] border-2 border-[#1e1714] rounded-xl p-2.5">
                    <div class="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        class="w-8 h-8 shrink-0 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] flex items-center justify-center text-[#1e1714]"
                      >
                        <StageGlyph kind="key" size={14} />
                      </span>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                          <span class="font-black text-xs text-[#1e1714] truncate">
                            {passport.name}
                          </span>
                          <button
                            type="button"
                            onClick={handleRerollMoniker}
                            class="shrink-0 px-2 py-0.5 rounded-full border border-[#1e1714]/50 bg-[#fffef7] hover:bg-[#ffbe0b] text-[10px] font-black text-[#1e1714] active:scale-95 transition-colors"
                          >
                            {isSpanish ? "Girar" : "Reroll"}
                          </button>
                        </div>
                        <span class="block text-[10px] font-bold text-[#57524b]">
                          {quota?.is_active_plus || passport.tier === "plus"
                            ? (isSpanish
                              ? "Pasaporte Plus · 100 códigos"
                              : "Plus Passport · 100 codes")
                            : (isSpanish
                              ? "Pasaporte local · Llave de 4 palabras"
                              : "Local Passport · 4-word key")}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopySyncUrl}
                        class={`${STAGE_PRESS} px-2.5 min-h-[34px] text-xs font-black rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]`}
                      >
                        {isSpanish ? "Copiar enlace" : "Copy Link"}
                      </button>
                      <button
                        type="button"
                        aria-expanded={showPhrase}
                        onClick={() => setShowPhrase(!showPhrase)}
                        class={`min-h-[34px] px-2.5 text-xs font-black rounded-xl border-2 border-[#1e1714] transition-all active:scale-95 ${
                          showPhrase
                            ? "bg-[#ffbe0b] text-[#1e1714]"
                            : "bg-[#fffef7] hover:bg-[#f7ecdc] text-[#1e1714]"
                        }`}
                      >
                        {showPhrase
                          ? (isSpanish ? "Ocultar" : "Hide")
                          : (isSpanish ? "Frase" : "Phrase")}
                      </button>
                    </div>
                  </div>

                  {showPhrase && (
                    <div class="flex items-center gap-2.5 bg-[#fef3c7] border-2 border-[#1e1714] rounded-xl p-2.5 text-xs text-[#1e1714]">
                      {syncQrSvg && (
                        <div
                          role="img"
                          aria-label={isSpanish
                            ? "Código QR de emparejamiento de Pasaporte"
                            : "Passport pairing QR code"}
                          class="w-16 h-16 shrink-0 bg-[#fffef7] rounded-lg p-1 border-2 border-[#1e1714] flex items-center justify-center overflow-hidden"
                          // deno-lint-ignore react-no-danger
                          dangerouslySetInnerHTML={{ __html: syncQrSvg }}
                        />
                      )}
                      <code class="flex-1 min-w-0 font-mono font-bold text-xs bg-[#fffef7] px-2.5 py-1.5 rounded-lg border-2 border-[#1e1714]/40 select-all break-all">
                        {passport.phrase}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Quiet Secondary Offline File & Bundle Backup */}
              <details class="pt-2 border-t-2 border-[#1e1714]/10">
                <summary class="cursor-pointer list-none min-h-[34px] flex items-center justify-between text-[11px] font-black text-[#57524b] hover:text-[#1e1714] select-none">
                  <span>
                    {isSpanish
                      ? "Respaldo sin conexión (.json / paquete cifrado)"
                      : "Offline file & encrypted bundle backup"}
                  </span>
                  <span class="text-[10px]">▾</span>
                </summary>

                <div class="pt-2.5 space-y-3">
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadVaultJson}
                      class={`${STAGE_PRESS} min-h-[38px] px-2.5 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] inline-flex items-center justify-center gap-1.5`}
                    >
                      <StageGlyph kind="download" size={14} />
                      <span>
                        {isSpanish ? "Exportar .json" : "Export .json"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => jsonFileInputRef.current?.click()}
                      class={`${STAGE_PRESS} min-h-[38px] px-2.5 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#f7ecdc] text-xs font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] inline-flex items-center justify-center gap-1.5`}
                    >
                      <StageGlyph kind="upload" size={14} />
                      <span>
                        {isSpanish ? "Importar .json" : "Import .json"}
                      </span>
                    </button>
                  </div>

                  {passport && (
                    <div class="space-y-1.5 pt-2 border-t border-[#1e1714]/10">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[11px] font-black text-[#57524b]">
                          {isSpanish ? "Paquete cifrado" : "Encrypted bundle"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyEncryptedBackup}
                          disabled={isExportingBackup}
                          class={`${STAGE_PRESS} min-h-[32px] px-2.5 py-1 rounded-xl border-2 border-[#1e1714] bg-[#fffef7] hover:bg-[#ffbe0b] text-[11px] font-black text-[#1e1714] shadow-[0_1.5px_0_#1e1714] disabled:opacity-50`}
                        >
                          {isExportingBackup
                            ? (isSpanish ? "Cifrando…" : "Encrypting…")
                            : (isSpanish ? "Copiar paquete" : "Copy Bundle")}
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
                            setBackupInput(
                              (e.target as HTMLInputElement).value,
                            )}
                          placeholder={isSpanish
                            ? "Pegar paquete cifrado…"
                            : "Paste encrypted bundle…"}
                          class="qr-input min-h-[38px] px-3 py-1.5 text-base sm:text-xs font-mono"
                        />
                        {backupInput.trim() !== "" && (
                          <div class="flex flex-col sm:flex-row gap-1.5">
                            <label
                              class="sr-only"
                              for="library-backup-phrase"
                            >
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
                                ? "Frase clave (opcional)…"
                                : "Recovery phrase (optional)…"}
                              class="qr-input flex-1 min-w-0 min-h-[38px] px-3 py-1.5 text-base sm:text-xs font-mono"
                            />
                            <button
                              type="submit"
                              disabled={isImportingBackup}
                              class="min-h-[38px] px-3.5 py-1.5 rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] hover:bg-[#ffd04a] font-black text-xs text-[#1e1714] shadow-[0_1.5px_0_#1e1714] active:scale-95 transition-all disabled:opacity-50"
                            >
                              {isImportingBackup
                                ? (isSpanish ? "Uniendo…" : "Merging…")
                                : (isSpanish ? "Restaurar" : "Merge")}
                            </button>
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </details>

          {/* Claim Legacy Tools (only when server library is enabled) */}
          {isPlusLibraryEnabled() && (
            <div class="pt-2 border-t-2 border-[#1e1714]/10 space-y-2">
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
                    class="qr-menu-pod p-4 space-y-3"
                  >
                    <div class="flex items-center justify-between">
                      <p class="qr-section-eyebrow">
                        <span class="qr-section-pip bg-[#ffbe0b]" />
                        {isSpanish
                          ? "Reclamar código anterior"
                          : "Claim Pre-Launch Code"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowImport(false)}
                        class="text-xs font-black text-[#57524b] hover:text-[#1e1714]"
                      >
                        {isSpanish ? "Cancelar" : "Cancel"}
                      </button>
                    </div>
                    <p class="text-[11px] font-medium text-[#57524b] leading-relaxed">
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
                      class="qr-input font-mono text-xs"
                    />
                    <button
                      type="submit"
                      disabled={importing || !importToken.trim()}
                      class="qr-pitch-cta w-full py-2.5 px-3 rounded-xl font-black text-xs disabled:opacity-50"
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

        {/* Footer Action Strip (only when local items exist; 2-tap inline confirm) */}
        {localHistory.length > 0 && (
          <div class="pt-2.5 border-t-2 border-[#1e1714]/12 flex items-center justify-end gap-2">
            {confirmClear
              ? (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    class="min-h-[34px] px-2.5 py-1 text-xs font-bold text-[#57524b] hover:text-[#1e1714] rounded-xl transition-colors"
                  >
                    {isSpanish ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearHistory();
                      setConfirmClear(false);
                      haptics.light();
                    }}
                    class="min-h-[34px] px-3 py-1 text-xs font-black text-[#1e1714] bg-[#ffbe0b] border-2 border-[#1e1714] rounded-xl shadow-[0_1.5px_0_#1e1714] active:translate-y-px active:shadow-none transition-all"
                  >
                    {isSpanish
                      ? "Toca otra vez para vaciar"
                      : "Tap again to clear"}
                  </button>
                </>
              )
              : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(true);
                    haptics.light();
                  }}
                  class="min-h-[34px] px-2.5 py-1 text-xs font-black text-[#c4607a] hover:bg-[#fffef7] rounded-xl transition-colors"
                >
                  {isSpanish ? "Vaciar local" : "Clear local"}
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
