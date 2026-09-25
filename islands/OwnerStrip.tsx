/**
 * OwnerStrip — "It's yours." Renders on /f/{code} only when this device's
 * token vault holds the share's owner token; the public never sees it, and
 * without a token it makes no owner request at all.
 *
 * Stats (today / this week / all time) as a trading card, rename inline,
 * re-vibe with the palette pills, add or remove items, stamp a sticker. The
 * address never changes, so stickers already out there keep working.
 */
import { useSignal } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { getApiUrl } from "../utils/api.ts";
import { apiRequest, apiRequestFormData } from "../utils/api-request.ts";
import { getOwnerToken } from "../utils/token-vault.ts";
import { haptics } from "../utils/haptics.ts";
import { prepImages, prettyName } from "../utils/image-prep.ts";
import {
  buildCards,
  cardLines,
  type LedgerRow,
  type LifetimeStats,
  type StatsRange,
  type WeatherBaseline,
} from "../utils/share-stats.ts";
import type { QR_STYLES } from "../utils/qr-styles.ts";
import { addToast } from "./ToastManager.tsx";
import PalettePills from "./create-modal/PalettePills.tsx";
import QRCanvas from "./QRCanvas.tsx";

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
  onTitle: (title: string) => void;
  onFiles: (files: ShareItem[]) => void;
  onTheme: (theme: string) => void;
}

interface OwnerMeta {
  isOwner?: boolean;
  stats?: LifetimeStats;
  ledger?: LedgerRow[];
  weather?: WeatherBaseline;
  createdAt?: string;
}

const PILL =
  "min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-black px-3 text-xs font-black shadow-chunky transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100";

const RANGES: { id: StatsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
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

export default function OwnerStrip(
  {
    fileId,
    shareUrl,
    title,
    files,
    theme,
    isLimited,
    kind,
    onTitle,
    onFiles,
    onTheme,
  }: OwnerStripProps,
) {
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<OwnerMeta | null>(null);
  const [range, setRange] = useState<StatsRange>("week");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState<string | null>(null);
  const [showVibe, setShowVibe] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Sticker: a QR of this share, framed SCAN ME, exported on demand.
  const qrUrl = useSignal(shareUrl);
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
      setToken(t);
      try {
        const data = await apiRequest<OwnerMeta>(
          `${getApiUrl()}/get-file-metadata?id=${fileId}&owner=${t}`,
          { method: "GET" },
          "Couldn't load your stats",
        );
        if (!cancelled && data.isOwner) setMeta(data);
      } catch {
        // Stats are a nicety; the controls still work without them.
        if (!cancelled) setMeta({ isOwner: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

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

  const saveTitle = async () => {
    const clean = draft.trim();
    setEditing(false);
    if (!clean || clean === title) {
      setDraft(title);
      return;
    }
    setBusy("rename");
    try {
      const r = await post<{ fileName: string }>(
        { action: "rename", title: clean },
        "Couldn't rename it",
      );
      onTitle(r.fileName);
      haptics.success();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Couldn't rename it", 3000);
      setDraft(title);
    } finally {
      setBusy(null);
    }
  };

  const retheme = async (key: string) => {
    if (key === theme) return;
    setBusy("theme");
    try {
      await post({ action: "retheme", theme: key }, "Couldn't change the vibe");
      onTheme(key);
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Couldn't change the vibe",
        3000,
      );
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (item: ShareItem) => {
    if (!confirm(`Remove "${prettyName(item.name)}"?`)) return;
    setBusy(item.id);
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
      setBusy(null);
    }
  };

  const appendFiles = async (picked: File[]) => {
    if (picked.length === 0) return;
    setBusy("append");
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
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const sticker = () => {
    triggerDownload.value = true;
    haptics.medium();
    addToast("Sticker on the way — print it, stick it 🖨️");
  };

  const cards = buildCards(
    meta.stats ?? {},
    meta.ledger ?? [],
    meta.weather ?? {},
  );
  const card = cards[range];
  const itemName = (id: string) => {
    const f = files.find((x) => x.id === id);
    if (!f) return "One of them";
    const idx = files.indexOf(f);
    return kind === "playlist" ? prettyName(f.name) : `Photo ${idx + 1}`;
  };
  const lines = cardLines(card, itemName, kind, meta.createdAt);
  const canEditPayload = !isLimited && kind !== "file";

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
          <p class="text-xs font-black uppercase tracking-wide text-qr-pop">
            It's yours
          </p>
          {editing
            ? (
              <input
                type="text"
                value={draft}
                maxLength={80}
                // deno-lint-ignore jsx-boolean-value
                autoFocus={true}
                onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setDraft(title);
                    setEditing(false);
                  }
                }}
                aria-label="Share name"
                class="w-full px-3 py-1.5 border-2 border-black/15 bg-white rounded-2xl text-base font-black focus:border-qr-pop focus:outline-none"
              />
            )
            : (
              <button
                type="button"
                onClick={() => {
                  setDraft(title);
                  setEditing(true);
                }}
                class="text-left font-black text-lg leading-tight hover:text-qr-pop transition-colors truncate max-w-full"
                title="Rename"
              >
                {title} <span class="text-xs opacity-50">✎</span>
              </button>
            )}
        </div>
      </div>

      {/* Stats card */}
      <div class="bg-white border-2 border-black rounded-2xl p-3 space-y-3">
        <div
          class="grid grid-cols-3 gap-1 rounded-full bg-amber-50 p-1 border-2 border-black"
          role="tablist"
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              class={`min-h-[36px] rounded-full text-xs font-black transition-all ${
                range === r.id
                  ? "bg-black text-white"
                  : "text-neutral-600 hover:bg-amber-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {lines.length === 0
          ? (
            <p class="text-sm font-bold text-neutral-500 text-center py-2">
              {range === "today"
                ? "No scans yet today."
                : "No scans yet — stick it somewhere 🌸"}
            </p>
          )
          : (
            <ul class="space-y-1.5">
              {lines.map((line, i) => (
                <li
                  key={i}
                  class={`text-sm leading-snug ${
                    i === 0
                      ? "font-black text-base"
                      : "font-bold text-neutral-800"
                  }`}
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        {range !== "today" && card.spark.some((v) => v > 0) && (
          <Spark values={card.spark} />
        )}
      </div>

      {/* Verbs */}
      <div class="grid grid-cols-3 gap-2">
        {canEditPayload
          ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy === "append" || files.length >= 10}
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
        onChange={(e) => {
          const list = (e.target as HTMLInputElement).files;
          if (list) void appendFiles(Array.from(list));
        }}
      />

      {showVibe && (
        <div class="animate-slide-down">
          <PalettePills value={theme} onChange={(k) => void retheme(k)} />
        </div>
      )}

      {/* Items with a remove × — only when the payload is editable */}
      {canEditPayload && files.length > 1 && (
        <ul class="space-y-1">
          {files.map((f, i) => (
            <li
              key={f.id}
              class="flex items-center gap-2 min-h-[36px] text-sm font-bold"
            >
              <span class="w-5 text-xs font-black text-neutral-400 text-right">
                {i + 1}
              </span>
              <span class="truncate flex-1">
                {kind === "playlist" ? prettyName(f.name) : `Photo ${i + 1}`}
              </span>
              <button
                type="button"
                onClick={() => void removeItem(f)}
                disabled={busy === f.id}
                aria-label={`Remove ${prettyName(f.name)}`}
                class="w-8 h-8 rounded-full border-2 border-black/15 hover:border-black text-xs font-black transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The sticker canvas: small, real, framed */}
      <div class="mx-auto w-full max-w-[200px]">
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
