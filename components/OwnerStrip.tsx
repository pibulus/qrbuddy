/**
 * OwnerStrip — "It's yours." Renders on /f/{code} only when this device's
 * token vault holds the share's owner token; the public never sees it, and
 * without a token it makes no owner request at all.
 *
 * Stats (today / this week / all time) as a trading card, rename inline,
 * re-vibe with the palette pills, add, reorder, or remove items, stamp a
 * sticker. The address never changes, so stickers already out there keep
 * working.
 */
import { useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { getApiUrl } from "../utils/api.ts";
import { apiRequest, apiRequestFormData } from "../utils/api-request.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";
import { getOrCreatePassport } from "../utils/passport.ts";
import { getSupporterPass } from "../utils/supporter-pass.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import { haptics } from "../utils/haptics.ts";
import { prepImages, prettyName } from "../utils/image-prep.ts";
import {
  buildCards,
  buildShareStatsCsv,
  cardKpis,
  cardLines,
  type LedgerRow,
  type LifetimeStats,
  nextStatsRange,
  reorderItems,
  type StatsRange,
  type WeatherBaseline,
} from "../utils/share-stats.ts";
import type { QR_STYLES } from "../utils/qr-styles.ts";
import { updateHistoryItem } from "../utils/history.ts";
import {
  openPricingModal,
  pricingModalOpen,
} from "../islands/PricingModal.tsx";
import { addToast } from "../islands/ToastManager.tsx";
import PalettePills from "./create-modal/PalettePills.tsx";
import QRCanvas from "../islands/QRCanvas.tsx";
import {
  buildRouletteShareUrl,
  parseRouletteParams,
} from "../utils/roulette-lock.ts";

export interface ShareItem {
  id: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

interface OwnerStripProps {
  fileId: string;
  shareUrl: string;
  title: string;
  files: ShareItem[];
  theme: string;
  isLimited: boolean;
  kind: "slideshow" | "playlist" | "file";
  lang?: Locale;
  unbranded?: boolean;
  onUnbranded?: () => void;
  onTitle: (title: string) => void;
  onFiles: (files: ShareItem[]) => void;
  onTheme: (theme: string) => void;
}

interface OwnerMeta {
  isOwner?: boolean;
  unbranded?: boolean;
  stats?: LifetimeStats & { unbranded?: boolean };
  ledger?: LedgerRow[];
  weather?: WeatherBaseline;
  createdAt?: string;
}

const PILL =
  "min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-black px-3 text-xs font-black shadow-chunky transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100";

const RANGES: { id: StatsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "all", label: "All time" },
];

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  if (values.length < 2) return null;
  return (
    <div class="flex items-end gap-[2px] h-6" aria-hidden="true">
      {values.slice(-28).map((v, i) => (
        <span
          key={i}
          class="flex-1 rounded-sm bg-black/70"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function checkHasPassport(): boolean {
  if (typeof localStorage === "undefined") return false;
  return getSupporterPass() !== null || getOrCreatePassport().tier !== "free";
}

function formatDwellSeconds(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function OwnerStrip(
  {
    fileId,
    shareUrl,
    title,
    files,
    theme,
    isLimited,
    kind,
    lang,
    unbranded = false,
    onUnbranded,
    onTitle,
    onFiles,
    onTheme,
  }: OwnerStripProps,
) {
  const isSpanish = getClientLocale(lang) === "es";
  const isModalOpen = pricingModalOpen.value;
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<OwnerMeta | null>(null);
  const [hasSupporterPass, setHasSupporterPass] = useState(false);

  useEffect(() => {
    const syncPass = () => setHasSupporterPass(checkHasPassport());
    syncPass();
    globalThis.addEventListener("qrb-passport-changed", syncPass);
    globalThis.addEventListener("qrb-passport-synced", syncPass);
    return () => {
      globalThis.removeEventListener("qrb-passport-changed", syncPass);
      globalThis.removeEventListener("qrb-passport-synced", syncPass);
    };
  }, [isModalOpen]);
  const [statsError, setStatsError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsRevision, setStatsRevision] = useState(0);
  const [range, setRange] = useState<StatsRange>("week");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState<string | null>(null);
  const [showVibe, setShowVibe] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mutationLock = useRef(false);
  const cancelRenameOnBlur = useRef(false);

  // Sticker: a QR of this share, framed SCAN ME, exported on demand.
  const qrUrl = useSignal(shareUrl);
  const initialRoulette = parseRouletteParams(
    globalThis.location?.search ?? "",
  );
  const [rouletteEnabled, setRouletteEnabled] = useState(
    initialRoulette.roulette,
  );
  const [rouletteSpins, setRouletteSpins] = useState<number | null>(
    initialRoulette.dailySpins,
  );

  const applyRouletteSetting = (enabled: boolean, spins: number | null) => {
    setRouletteEnabled(enabled);
    setRouletteSpins(spins);
    const base = shareUrl || globalThis.location?.href || "";
    const nextUrl = buildRouletteShareUrl(base, enabled, spins);
    qrUrl.value = nextUrl;
    if (typeof globalThis.history?.replaceState === "function") {
      try {
        globalThis.history.replaceState(null, "", nextUrl);
      } catch {
        // Ignore history state errors
      }
    }
    haptics.light();
  };
  const qrStyle = useSignal<keyof typeof QR_STYLES | "custom">(
    theme as keyof typeof QR_STYLES,
  );
  const triggerDownload = useSignal(false);
  const frame = useSignal<{ enabled: boolean; caption: string } | null>({
    enabled: true,
    caption: "SCAN ME",
  });
  useEffect(() => {
    qrStyle.value = theme as keyof typeof QR_STYLES;
  }, [theme]);

  // Vault → token → owner metadata. No token, no request, no strip.
  useEffect(() => {
    let cancelled = false;
    getOwnerToken("file", fileId).then(async (t) => {
      if (cancelled || !t) return;
      const passPresent = checkHasPassport();
      setToken(t);
      setHasSupporterPass(passPresent);
      if (passPresent) {
        onUnbranded?.();
      }
      setStatsLoading(true);
      setStatsError(false);
      let serverUnbranded = unbranded;
      try {
        const data = await apiRequest<OwnerMeta>(
          `${getApiUrl()}/get-file-metadata?id=${fileId}&owner=${t}`,
          { method: "GET" },
          "Couldn't load your stats",
        );
        if (!data.isOwner) throw new Error("Owner stats unavailable");
        serverUnbranded = Boolean(
          unbranded || data.unbranded || data.stats?.unbranded,
        );
        if (serverUnbranded) {
          onUnbranded?.();
        }
        if (!cancelled) setMeta({ ...data, unbranded: serverUnbranded });
      } catch {
        // Stats are a nicety; the controls still work without them.
        if (!cancelled) {
          setStatsError(true);
          setMeta({ isOwner: true, unbranded: serverUnbranded || passPresent });
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }

      // Auto-upgrade older shares when the owner holds a valid QRBuddy Passport
      if (passPresent && !serverUnbranded && !cancelled) {
        try {
          await apiRequest(
            `${getApiUrl()}/update-file`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId,
                ownerToken: t,
                action: "set-unbranded",
              }),
            },
            "Couldn't activate white-label",
          );
          if (!cancelled) {
            onUnbranded?.();
            setMeta((prev) => (prev ? { ...prev, unbranded: true } : prev));
          }
        } catch {
          // Best-effort background upgrade; owner can also tap the badge.
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileId, statsRevision]);

  if (!token || !meta) return null;

  const post = async <T,>(body: Record<string, unknown>, fail: string) =>
    await apiRequest<T>(
      `${getApiUrl()}/update-file`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, ownerToken: token, ...body }),
      },
      fail,
    );

  const beginMutation = (action: string) => {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(action);
    return true;
  };

  const endMutation = () => {
    mutationLock.current = false;
    setBusy(null);
  };

  const saveTitle = async () => {
    const clean = draft.trim();
    setEditing(false);
    if (!clean || clean === title) {
      setDraft(title);
      return;
    }
    if (!beginMutation("rename")) {
      setDraft(title);
      return;
    }
    try {
      const r = await post<{ fileName: string }>(
        { action: "rename", title: clean },
        "Couldn't rename it",
      );
      onTitle(r.fileName);
      updateHistoryItem(
        (item) =>
          item.metadata?.ownerId === fileId ||
          item.content === shareUrl ||
          item.content.includes(`/f/${fileId}`),
        (item) => ({
          ...item,
          metadata: {
            ...item.metadata,
            title: r.fileName,
          },
        }),
      );
      haptics.success();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Couldn't rename it", 3000);
      setDraft(title);
    } finally {
      endMutation();
    }
  };

  const retheme = async (key: string) => {
    if (key === theme || !beginMutation("theme")) return;
    try {
      await post({ action: "retheme", theme: key }, "Couldn't change the vibe");
      onTheme(key);
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Couldn't change the vibe",
        3000,
      );
    } finally {
      endMutation();
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const nextFiles = reorderItems(files, index, direction);
    if (
      nextFiles.every((item, idx) => item.id === files[idx]?.id) ||
      !beginMutation(`reorder-${files[index]?.id ?? index}`)
    ) {
      return;
    }
    const previousFiles = files;
    onFiles(nextFiles);
    haptics.light();
    try {
      const r = await post<{ files: ShareItem[] }>(
        {
          action: "reorder",
          itemIds: nextFiles.map((item) => item.id),
          itemId: files[index].id,
          direction: direction === -1 ? "up" : "down",
        },
        "Couldn't reorder items",
      );
      if (Array.isArray(r.files)) {
        onFiles(r.files);
      }
    } catch (e) {
      onFiles(previousFiles);
      addToast(
        e instanceof Error ? e.message : "Couldn't reorder items",
        3000,
      );
    } finally {
      endMutation();
    }
  };

  const removeItem = async (item: ShareItem) => {
    if (mutationLock.current) return;
    if (!confirm(`Remove "${prettyName(item.name)}"?`)) return;
    if (!beginMutation(item.id)) return;
    try {
      const r = await post<{ files: ShareItem[] }>(
        { action: "remove", itemId: item.id },
        "Couldn't remove it",
      );
      onFiles(r.files);
      haptics.medium();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Couldn't remove it", 3000);
    } finally {
      endMutation();
    }
  };

  const appendFiles = async (picked: File[]) => {
    if (picked.length === 0 || !beginMutation("append")) return;
    try {
      const ready = kind === "slideshow" ? await prepImages(picked) : picked;
      const form = new FormData();
      form.append("fileId", fileId);
      form.append("ownerToken", token);
      form.append("action", "append");
      ready.forEach((f) => form.append("file", f));
      const r = await apiRequestFormData<
        { files: ShareItem[]; fileName?: string }
      >(`${getApiUrl()}/update-file`, form, "Couldn't add those");
      onFiles(r.files);
      if (r.fileName) onTitle(r.fileName);
      haptics.success();
      addToast(
        `Added ${ready.length} ${kind === "playlist" ? "track" : "photo"}${
          ready.length === 1 ? "" : "s"
        } ✨`,
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Couldn't add those", 4000);
    } finally {
      endMutation();
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const activateWhiteLabel = async () => {
    onUnbranded?.();
    setMeta((prev) => (prev ? { ...prev, unbranded: true } : prev));
    if (!beginMutation("unbranded")) return;
    try {
      await post({ action: "set-unbranded" }, "Couldn't activate white-label");
      haptics.light();
      addToast("Clean white-label active — zero QRBuddy branding ✨", 3000);
    } catch {
      // Local white-label state still stays active for this owner
    } finally {
      endMutation();
    }
  };

  const sticker = () => {
    triggerDownload.value = true;
    haptics.medium();
    addToast("Sticker on the way — print it, stick it 🖨️");
  };

  const handleTabKeyDown = (e: KeyboardEvent) => {
    const next = nextStatsRange(range, e.key);
    if (!next) return;
    e.preventDefault();
    setRange(next);
    const nextIdx = RANGES.findIndex((r) => r.id === next);
    if (nextIdx !== -1) {
      tabRefs.current[nextIdx]?.focus();
    }
  };

  const cards = buildCards(
    meta.stats ?? {},
    meta.ledger ?? [],
    meta.weather ?? {},
  );
  const card = cards[range];
  const kpis = cardKpis(card, kind);
  const itemName = (id: string) => {
    const f = files.find((x) => x.id === id);
    if (!f) return "One of them";
    const idx = files.indexOf(f);
    return kind === "playlist" ? prettyName(f.name) : `Photo ${idx + 1}`;
  };
  const lines = cardLines(card, itemName, kind, meta.createdAt);
  const canEditPayload = !isLimited && kind !== "file";
  const mutationBusy = busy !== null;
  const hasPass = hasSupporterPass;

  const resolveLeaderboardItemName = (id: string) => {
    const f = files.find((x) => x.id === id);
    return f ? prettyName(f.name) : itemName(id);
  };

  const handleExportCsv = () => {
    const csv = buildShareStatsCsv(title, card, resolveLeaderboardItemName);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrbuddy-${fileId}-stats.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    haptics.success();
  };

  return (
    <section
      class="w-full max-w-md bg-qr-cream text-black border-4 border-black rounded-3xl shadow-chunky-hover p-4 sm:p-5 space-y-4 animate-slide-up"
      aria-label="Owner controls"
    >
      {/* Header: it's yours + the name, editable */}
      <div class="flex items-start gap-3">
        <span class="w-10 h-10 rounded-xl border-2 border-black bg-amber-200 flex items-center justify-center text-lg shrink-0">
          👑
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-xs font-black uppercase tracking-wide text-qr-pop">
              It's yours
            </p>
            {(unbranded || meta.unbranded || hasSupporterPass) && (
              <button
                type="button"
                disabled={mutationBusy}
                onClick={() => void activateWhiteLabel()}
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-black bg-amber-200 text-black text-[10px] font-black shadow-sm hover:bg-amber-300 transition-colors disabled:opacity-50"
                title="QRBuddy Passport perk: QRBuddy footer badge is hidden on this share"
              >
                🛂 Clean White-Label Active
              </button>
            )}
          </div>
          {editing
            ? (
              <input
                type="text"
                value={draft}
                maxLength={80}
                // deno-lint-ignore jsx-boolean-value
                autoFocus={true}
                onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
                onBlur={() => {
                  if (cancelRenameOnBlur.current) {
                    cancelRenameOnBlur.current = false;
                    return;
                  }
                  void saveTitle();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRenameOnBlur.current = true;
                    (e.currentTarget as HTMLInputElement).blur();
                    setDraft(title);
                    setEditing(false);
                  }
                }}
                aria-label="Share name"
                class="w-full min-h-[44px] px-3 py-1.5 border-2 border-black/15 bg-white rounded-2xl text-base font-black focus:border-qr-pop focus:outline-none"
              />
            )
            : (
              <button
                type="button"
                disabled={mutationBusy}
                onClick={() => {
                  setDraft(title);
                  setEditing(true);
                }}
                class="min-h-[44px] text-left font-black text-lg leading-tight hover:text-qr-pop transition-colors truncate max-w-full disabled:opacity-50"
                title="Rename"
              >
                {title}{" "}
                <span class="text-xs opacity-50" aria-hidden="true">✎</span>
              </button>
            )}
        </div>
      </div>

      {/* Stats card: compact 1-row banner when 0 opens, full KPI card once opens > 0 */}
      {cards.all.views === 0 && !statsError && !statsLoading
        ? (
          <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3 space-y-2.5 shadow-[2px_2px_0_#1e1714]">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs sm:text-sm font-black text-[#1e1714]">
                🌸 {isSpanish
                  ? "Aún sin visitas — ¡pega el QR en algún lugar!"
                  : "No opens yet — stick the QR somewhere!"}
              </p>
              <button
                type="button"
                class="min-h-[34px] px-3 rounded-full border-2 border-[#1e1714] bg-amber-100 hover:bg-amber-200 text-xs font-black text-[#1e1714] shrink-0 transition-transform active:scale-95"
                disabled={statsLoading}
                onClick={() => setStatsRevision((n) => n + 1)}
              >
                {isSpanish ? "Actualizar" : "Refresh"}
              </button>
            </div>
            {!hasPass && (
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  openPricingModal();
                }}
                class="w-full min-h-[38px] px-3 py-1.5 rounded-xl border-2 border-[#1e1714] bg-amber-100 hover:bg-amber-200 text-[#1e1714] text-xs font-black text-center leading-snug transition-all hover:-translate-y-0.5"
              >
                {isSpanish
                  ? "🛂 Desbloquea ranking, ciudades y CSV con el Pasaporte QRBuddy →"
                  : "🛂 Unlock leaderboard, top cities & CSV with QRBuddy Passport →"}
              </button>
            )}
          </div>
        )
        : (
          <div class="bg-[#fffef7] border-2 border-[#1e1714] rounded-2xl p-3 space-y-3 shadow-[2px_2px_0_#1e1714]">
            <div
              class="grid grid-cols-3 gap-1 rounded-full bg-amber-50 p-1 border-2 border-black"
              role="tablist"
              aria-label="Stats time range"
            >
              {RANGES.map((r, idx) => (
                <button
                  key={r.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  id={`owner-stats-tab-${r.id}`}
                  type="button"
                  role="tab"
                  aria-selected={range === r.id}
                  aria-controls={`owner-stats-panel-${r.id}`}
                  tabIndex={range === r.id ? 0 : -1}
                  onClick={() => setRange(r.id)}
                  onKeyDown={handleTabKeyDown}
                  class={`min-h-[38px] rounded-full text-xs font-black transition-all ${
                    range === r.id
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:bg-amber-100"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div
              id={`owner-stats-panel-${range}`}
              role="tabpanel"
              aria-labelledby={`owner-stats-tab-${range}`}
              class="space-y-3"
            >
              {statsError || statsLoading
                ? (
                  <p
                    class="text-sm font-bold text-neutral-500 text-center py-2"
                    role="status"
                  >
                    {statsLoading
                      ? "Loading stats…"
                      : "Stats are unavailable right now."}
                  </p>
                )
                : (
                  <>
                    {/* 3-Tile Visual KPI Header */}
                    <div class="grid grid-cols-3 gap-1.5">
                      {kpis.map((tile) => (
                        <div
                          key={tile.label}
                          class="bg-qr-cream border-2 border-black rounded-xl p-2 text-center flex flex-col justify-between min-w-0"
                        >
                          <span class="text-[10px] font-black uppercase tracking-wider text-neutral-600 truncate">
                            {tile.label}
                          </span>
                          <span class="mt-0.5 text-sm sm:text-base font-black text-black leading-tight truncate">
                            {tile.value}
                          </span>
                          {tile.badge
                            ? (
                              <span class="mt-0.5 inline-block mx-auto px-1.5 py-0.2 rounded-full bg-amber-200 border border-black text-[10px] font-black text-black leading-tight truncate max-w-full">
                                {tile.badge}
                              </span>
                            )
                            : (
                              <span class="mt-0.5 text-[10px] font-bold text-neutral-500 truncate">
                                {range === "today"
                                  ? "Today"
                                  : range === "week"
                                  ? "7 days"
                                  : "All time"}
                              </span>
                            )}
                        </div>
                      ))}
                    </div>

                    {/* Narrative Story Chips / Bullets */}
                    {lines.length === 0
                      ? (
                        <p class="text-sm font-bold text-neutral-500 text-center py-1">
                          {range === "today"
                            ? "No page opens yet today."
                            : "No page opens yet — stick it somewhere 🌸"}
                        </p>
                      )
                      : (
                        <ul class="flex flex-wrap gap-1.5">
                          {lines.map((line, i) => (
                            <li
                              key={i}
                              class={`rounded-xl border px-2.5 py-1.5 text-xs leading-snug ${
                                i === 0
                                  ? "w-full bg-amber-100 border-black font-black text-black"
                                  : "bg-qr-cream border-black/20 font-bold text-neutral-900"
                              }`}
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                  </>
                )}

              {!statsError && !statsLoading && range !== "today" &&
                card.spark.some((v) => v > 0) && <Spark values={card.spark} />}

              {/* Passport Field Report 🛂 */}
              {!statsError && !statsLoading && (
                hasPass
                  ? (
                    <div class="bg-qr-cream border-2 border-black rounded-2xl p-3 space-y-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-black bg-amber-200 text-[10px] font-black uppercase tracking-wide text-black shadow-sm">
                          🛂 PASSPORT FIELD REPORT
                        </span>
                      </div>

                      {/* 1. 🏆 Full Track / Photo Leaderboard */}
                      {files.length > 1 && card.itemLeaderboard.length > 0 && (
                        <div class="space-y-1.5">
                          <p class="text-[11px] font-black uppercase tracking-wider text-black">
                            🏆 {kind === "playlist"
                              ? "Track Leaderboard"
                              : "Photo Leaderboard"}
                          </p>
                          <ol class="space-y-1.5">
                            {card.itemLeaderboard.map((entry, idx) => {
                              const label = resolveLeaderboardItemName(
                                entry.id,
                              );
                              const unit = kind === "playlist"
                                ? entry.plays === 1 ? "play" : "plays"
                                : entry.plays === 1
                                ? "view"
                                : "views";
                              const widthPct = Math.max(
                                8,
                                Math.round(entry.share * 100),
                              );
                              return (
                                <li
                                  key={entry.id}
                                  class="bg-white border-2 border-black rounded-xl p-2 space-y-1"
                                >
                                  <div class="flex items-center justify-between gap-2 text-xs font-black text-black min-w-0">
                                    <span class="truncate min-w-0">
                                      <span class="text-qr-pop mr-1.5">
                                        #{idx + 1}
                                      </span>
                                      {label}
                                    </span>
                                    <span class="shrink-0 font-mono text-[11px] text-neutral-700">
                                      {entry.plays} {unit}
                                    </span>
                                  </div>
                                  <div class="w-full h-2 rounded-full bg-black/10 overflow-hidden border border-black/30">
                                    <div
                                      class="h-full rounded-full bg-qr-pop transition-all"
                                      style={{ width: `${widthPct}%` }}
                                    />
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}

                      {/* 2. ⏱️ Hang Time & Completion + 🧭 Farthest Stamp */}
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <div class="bg-white border-2 border-black rounded-xl p-2 text-center flex flex-col justify-between min-w-0">
                          <span class="text-[10px] font-black uppercase tracking-wider text-neutral-600 truncate">
                            Avg. Hang Time
                          </span>
                          <span class="mt-0.5 text-xs sm:text-sm font-black text-black leading-tight truncate">
                            {formatDwellSeconds(card.avgDwellSeconds)}
                          </span>
                        </div>
                        <div class="bg-white border-2 border-black rounded-xl p-2 text-center flex flex-col justify-between min-w-0">
                          <span class="text-[10px] font-black uppercase tracking-wider text-neutral-600 truncate">
                            Completion Rate
                          </span>
                          <span class="mt-0.5 text-xs sm:text-sm font-black text-black leading-tight truncate">
                            {card.completionRate !== null
                              ? `${Math.round(card.completionRate * 100)}%`
                              : "—"}
                          </span>
                        </div>
                        <div class="col-span-2 sm:col-span-1 bg-white border-2 border-black rounded-xl p-2 text-center flex flex-col justify-between min-w-0">
                          <span class="text-[10px] font-black uppercase tracking-wider text-neutral-600 truncate">
                            Farthest Scan
                          </span>
                          <span
                            class="mt-0.5 text-[11px] font-black text-black leading-tight truncate"
                            title={card.farthest
                              ? `✈️ ${card.farthest.km.toLocaleString()} km · ${card.farthest.place}`
                              : undefined}
                          >
                            {card.farthest
                              ? `✈️ ${card.farthest.km.toLocaleString()} km · ${card.farthest.place}`
                              : card.topPlaces[0]
                              ? `📍 ${card.topPlaces[0].name}`
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {card.topPlaces.length > 0 && (
                        <div class="flex flex-wrap gap-1.5">
                          {card.topPlaces.map((place) => (
                            <span
                              key={place.name}
                              class="bg-white border-2 border-black px-2.5 py-1 rounded-full text-[11px] font-black text-black"
                            >
                              📍 {place.name} · {place.views}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 3. 📲 Source Apps & 📥 Export CSV */}
                      <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div class="flex flex-wrap gap-1.5 min-w-0">
                          {card.appBreakdown.map((app) => (
                            <span
                              key={app.name}
                              class="bg-amber-100 border-2 border-black px-2.5 py-1 rounded-full text-[11px] font-black text-black"
                            >
                              📲 {app.name} · {app.views}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleExportCsv}
                          class="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-white hover:bg-amber-200 text-xs font-black text-black shadow-chunky transition-all hover:scale-105 active:scale-95 ml-auto"
                        >
                          📥 Export CSV
                        </button>
                      </div>
                    </div>
                  )
                  : (
                    <button
                      type="button"
                      onClick={() => {
                        haptics.light();
                        openPricingModal();
                      }}
                      class="w-full min-h-[40px] px-3 py-2 rounded-2xl border-2 border-black bg-amber-100 hover:bg-amber-200 text-black text-xs font-black text-center leading-snug shadow-chunky transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isSpanish
                        ? "🛂 Desbloquea ranking, ciudades y CSV con el Pasaporte QRBuddy →"
                        : "🛂 Unlock leaderboard, top cities & CSV with QRBuddy Passport →"}
                    </button>
                  )
              )}
            </div>

            <div class="flex items-center justify-between gap-2 pt-1 border-t border-black/10">
              <p class="text-[11px] text-neutral-500 truncate">
                Coarse UTC estimates · includes your opens
              </p>
              <button
                type="button"
                class="min-h-[34px] px-3 rounded-full border-2 border-black bg-white text-xs font-black hover:bg-amber-100 shrink-0"
                disabled={statsLoading}
                onClick={() => setStatsRevision((n) => n + 1)}
              >
                {statsError ? "Retry" : "Refresh"}
              </button>
            </div>
          </div>
        )}

      {/* Verbs */}
      <div class="grid grid-cols-3 gap-2">
        {canEditPayload
          ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={mutationBusy || files.length >= 10}
              class={`${PILL} bg-black text-white`}
              title={files.length >= 10 ? "A share holds up to 10 items" : ""}
            >
              {busy === "append"
                ? "Adding…"
                : `+ Add ${kind === "playlist" ? "tracks" : "photos"}`}
            </button>
          )
          : (
            <button
              type="button"
              onClick={() =>
                addToast(
                  isLimited
                    ? "This one self-destructs, so what's inside is frozen."
                    : "Single files can't grow — make a slideshow or mixtape.",
                  4000,
                )}
              class={`${PILL} bg-white opacity-60`}
            >
              + Add
            </button>
          )}
        <button
          type="button"
          onClick={() => setShowVibe((v) => !v)}
          aria-expanded={showVibe}
          disabled={mutationBusy}
          class={`${PILL} ${showVibe ? "bg-amber-200" : "bg-white"}`}
        >
          Vibe ▾
        </button>
        <button
          type="button"
          onClick={sticker}
          class={`${PILL} bg-qr-pop text-white hover:bg-qr-popDeep`}
        >
          Sticker
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        class="hidden"
        multiple
        accept={kind === "playlist" ? "audio/*" : "image/*"}
        disabled={mutationBusy}
        onChange={(e) => {
          const list = (e.target as HTMLInputElement).files;
          if (list) void appendFiles(Array.from(list));
        }}
      />

      {showVibe && (
        <div class="animate-slide-down">
          <PalettePills
            value={theme}
            onChange={(k) => void retheme(k)}
            disabled={mutationBusy}
          />
        </div>
      )}

      {files.length > 1 && (
        <div class="flex flex-wrap items-center justify-between gap-2 bg-[#fffef7] border-2 border-[#1e1714]/20 rounded-2xl px-3 py-2">
          <span class="text-xs font-black text-[#1e1714] whitespace-nowrap">
            🎲 {isSpanish ? "Ruleta (QR / Link)" : "Roulette draw"}
          </span>
          <div class="inline-flex items-center rounded-xl border-2 border-[#1e1714] bg-qr-cream p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => applyRouletteSetting(false, null)}
              class={`min-h-[30px] px-2.5 py-0.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                !rouletteEnabled
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              {isSpanish ? "No" : "Off"}
            </button>
            <button
              type="button"
              onClick={() => applyRouletteSetting(true, null)}
              class={`min-h-[30px] px-2.5 py-0.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                rouletteEnabled && rouletteSpins === null
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              {isSpanish ? "∞ Libre" : "∞ Open"}
            </button>
            <label
              onClick={() => {
                if (!rouletteEnabled || rouletteSpins === null) {
                  applyRouletteSetting(true, 1);
                }
              }}
              class={`min-h-[30px] inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap transition-all ${
                rouletteEnabled && rouletteSpins !== null
                  ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border border-[#1e1714]"
                  : "text-[#4a3f39] hover:text-[#1e1714]"
              }`}
            >
              <input
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                aria-label={isSpanish ? "Giros por día" : "Spins per day"}
                value={rouletteEnabled && rouletteSpins !== null
                  ? String(rouletteSpins)
                  : ""}
                placeholder="1"
                onInput={(e) => {
                  const raw = (e.target as HTMLInputElement).value.trim();
                  if (!raw) {
                    applyRouletteSetting(true, null);
                    return;
                  }
                  const n = Number.parseInt(raw, 10);
                  if (Number.isFinite(n)) {
                    applyRouletteSetting(
                      true,
                      Math.min(99, Math.max(1, n)),
                    );
                  }
                }}
                class="w-7 bg-transparent text-[11px] font-black text-[#1e1714] placeholder:text-[#6e6058] focus:outline-none text-center"
              />
              <span class="text-[10px] font-black">
                /{isSpanish ? "día" : "day"}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Items with reorder ↑/↓ and remove ✕ — tucked in a compact drawer so OwnerStrip stays short */}
      {canEditPayload && files.length > 1 && (
        <details class="group bg-[#fffef7] border-2 border-[#1e1714]/20 rounded-2xl px-3 py-2">
          <summary class="list-none cursor-pointer min-h-[34px] flex items-center justify-between gap-2 text-xs font-black text-[#1e1714] select-none">
            <span>
              Manage {files.length} {kind === "playlist" ? "tracks" : "photos"}
              {" "}
              (reorder / remove)
            </span>
            <span class="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <ul class="space-y-1.5 pt-2" aria-label="Share items">
            {files.map((f, i) => {
              const label = kind === "playlist"
                ? prettyName(f.name)
                : `Photo ${i + 1} · ${prettyName(f.name)}`;
              return (
                <li
                  key={f.id}
                  class="flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-bold bg-qr-cream border-2 border-black/15 rounded-xl px-2.5 py-1"
                >
                  <span class="w-4 text-xs font-black text-neutral-600 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span class="truncate flex-1 min-w-0" title={label}>
                    {label}
                  </span>
                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void moveItem(i, -1)}
                      disabled={i === 0 || mutationBusy}
                      aria-label={`Move ${prettyName(f.name)} up`}
                      class="w-8 h-8 rounded-full border-2 border-black/15 bg-white hover:border-black hover:bg-amber-200 text-xs font-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveItem(i, 1)}
                      disabled={i === files.length - 1 || mutationBusy}
                      aria-label={`Move ${prettyName(f.name)} down`}
                      class="w-8 h-8 rounded-full border-2 border-black/15 bg-white hover:border-black hover:bg-amber-200 text-xs font-black transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeItem(f)}
                      disabled={mutationBusy}
                      aria-label={`Remove ${prettyName(f.name)}`}
                      class="w-8 h-8 rounded-full border-2 border-black/15 bg-white hover:border-black hover:bg-rose-100 text-xs font-black transition-colors disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* Off-screen sticker exporter: powers the "Sticker" button above without hanging a 200px QR off the bottom */}
      <div
        class="sr-only pointer-events-none h-0 overflow-hidden"
        aria-hidden="true"
      >
        <QRCanvas
          url={qrUrl}
          style={qrStyle}
          triggerDownload={triggerDownload}
          frameConfig={frame}
        />
      </div>
    </section>
  );
}
