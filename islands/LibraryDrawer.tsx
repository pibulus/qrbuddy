import { useEffect, useState } from "preact/hooks";
import { useModalShell } from "./modal/useModalShell.ts";
import {
  buildPassportSyncUrl,
  generatePassportIdentity,
  getOrCreatePassport,
  parsePassportFromUrl,
  QRBuddyPassport,
  renderPassportQrSvg,
  savePassport,
} from "../utils/passport.ts";
import {
  claimLegacyCode,
  fetchLibrary,
  importLocalHistoryCodes,
  LibraryCodeItem,
  LibraryQuota,
} from "../utils/library.ts";
import { addToast } from "./ToastManager.tsx";
import { haptics } from "../utils/haptics.ts";

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LibraryDrawer({ isOpen, onClose }: LibraryDrawerProps) {
  const [passport, setPassport] = useState<QRBuddyPassport | null>(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<LibraryCodeItem[]>([]);
  const [quota, setQuota] = useState<LibraryQuota | null>(null);
  const [search, setSearch] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importToken, setImportToken] = useState("");
  const [importing, setImporting] = useState(false);

  // Initialize passport & check URL hash on open
  useEffect(() => {
    // Check if URL contains passport sync credentials
    const synced = parsePassportFromUrl();
    if (synced) {
      setPassport(synced);
      addToast("✨ Synced with your QRBuddy Passport!", 3500);
    } else {
      const p = getOrCreatePassport();
      setPassport(p);
    }

    const onPassportChanged = () => {
      const p = getOrCreatePassport();
      setPassport(p);
      loadLibraryData();
    };

    globalThis.addEventListener("qrb-passport-changed", onPassportChanged);
    globalThis.addEventListener("qrb-passport-synced", onPassportChanged);

    return () => {
      globalThis.removeEventListener("qrb-passport-changed", onPassportChanged);
      globalThis.removeEventListener("qrb-passport-synced", onPassportChanged);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const p = getOrCreatePassport();
    setPassport(p);
    loadLibraryData();
  }, [isOpen]);

  const loadLibraryData = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetchLibrary(query);
      if (res.success) {
        setCodes(res.codes);
        setQuota(res.quota);
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
      addToast("📋 Sync link copied! Open on any device to pair", 3000);
    } catch {
      addToast("Could not copy link automatically", 3000);
    }
  };

  const handleRerollMoniker = () => {
    if (!passport) return;
    haptics.light();
    const fresh = generatePassportIdentity();
    // Keep same ID, secret, tier, and phrase; re-roll moniker & spirit emoji
    const updated: QRBuddyPassport = {
      ...passport,
      name: fresh.name,
      avatarEmoji: fresh.avatarEmoji,
    };
    savePassport(updated);
    setPassport(updated);
    addToast(`🎲 Re-rolled to ${updated.avatarEmoji} ${updated.name}!`, 3000);
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
        addToast("✨ Pre-launch QR code claimed into your library!", 4000);
        setImportToken("");
        setShowImport(false);
        loadLibraryData();
      } else {
        haptics.error();
        addToast(res.message || "Failed to claim QR code", 4000);
      }
    } catch (err) {
      haptics.error();
      addToast(
        err instanceof Error ? err.message : "Failed to claim code",
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
          `✨ Claimed ${claimed} grandfathered code${
            claimed === 1 ? "" : "s"
          } into your library!`,
          4000,
        );
        loadLibraryData();
      } else if (attempted > 0) {
        addToast("All local codes are already in your library", 3000);
      } else {
        addToast("No local dynamic codes found to import", 3000);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Sync failed", 4000);
    } finally {
      setImporting(false);
    }
  };

  const shell = useModalShell({ open: isOpen, onClose });
  if (!shell.mounted) return null;

  const syncUrl = passport ? buildPassportSyncUrl(passport) : "";
  const syncQrSvg = syncUrl ? renderPassportQrSvg(syncUrl, 4) : "";

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
            <span class="text-2xl" role="img" aria-label="Library">📚</span>
            <h2
              id="library-title"
              class="font-black text-xl tracking-tight text-neutral-900"
            >
              Your Library
            </h2>
          </div>
          <button
            type="button"
            onClick={shell.requestClose}
            aria-label="Close library"
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
                <div class="flex items-center gap-3">
                  <span class="w-11 h-11 rounded-full border-2 border-black bg-white flex items-center justify-center text-2xl shadow-xs">
                    {passport.avatarEmoji}
                  </span>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="font-black text-base text-neutral-900 leading-tight">
                        {passport.name}
                      </h3>
                      <button
                        type="button"
                        onClick={handleRerollMoniker}
                        title="Roll a new moniker"
                        class="text-xs p-1 rounded-md border border-black/20 hover:bg-black/5 active:scale-95"
                      >
                        🎲
                      </button>
                    </div>
                    <div class="mt-0.5">
                      {quota?.is_active_plus
                        ? (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-300 to-pink-300 border border-black">
                            ✨ Plus Active · 100 codes
                          </span>
                        )
                        : (
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-black/30 text-neutral-700">
                            🌸 Free Passport · {quota
                              ? `${quota.used_count} of ${quota.total_allowed} used`
                              : "5 codes"}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopySyncUrl}
                  class="px-3 min-h-[36px] text-xs font-black rounded-full border-2 border-black bg-amber-200 hover:bg-amber-300 active:scale-95 transition-transform shadow-chunky"
                >
                  📋 Copy Sync Link
                </button>
              </div>

              {/* Compact collapsible Cross-Device Pairing & Backup Phrase */}
              <details class="group bg-white rounded-xl border-2 border-black/15">
                <summary class="cursor-pointer list-none px-3 py-2 flex items-center justify-between text-xs font-black text-neutral-800 select-none">
                  <span>📲 Pair another device or view recovery phrase</span>
                  <span class="transition-transform group-open:rotate-180 text-[10px]">
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
                        📱 Scan with another device to sync library
                      </p>
                      <p class="text-[11px] text-neutral-500 leading-tight">
                        Instant cross-device pairing. Zero accounts, zero
                        passwords.
                      </p>
                      <div class="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={handleCopySyncUrl}
                          class="px-2.5 py-1 text-xs font-bold rounded-lg border border-black bg-amber-200 hover:bg-amber-300 active:scale-95 transition-transform"
                        >
                          📋 Copy Link
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPhrase(!showPhrase)}
                          class="px-2.5 py-1 text-xs font-bold rounded-lg border border-black/20 bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-transform"
                        >
                          🔑 {showPhrase ? "Hide Phrase" : "Backup Phrase"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4-Word Sovereign Backup Phrase */}
                  {showPhrase && (
                    <div class="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-2.5 text-xs text-neutral-700 space-y-1">
                      <p class="font-bold text-[10px] uppercase tracking-wider text-amber-800">
                        Sovereign Recovery Phrase
                      </p>
                      <code class="block font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-amber-200 select-all break-all">
                        {passport.phrase}
                      </code>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}

          {/* Quota Progress Bar */}
          {quota && (
            <div class="bg-white border-2 border-black rounded-2xl p-4 shadow-sm space-y-2">
              <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-neutral-700">Code Allowance</span>
                <span class="text-neutral-900">
                  {quota.used_count} / {quota.total_allowed} used
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
                  Includes {quota.legacy_count} grandfathered legacy code{quota
                      .legacy_count === 1
                    ? ""
                    : "s"} (exempt from allowance).
                </p>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div class="relative">
            <input
              type="text"
              value={search}
              onInput={(e) => {
                const q = (e.target as HTMLInputElement).value;
                setSearch(q);
                loadLibraryData(q);
              }}
              placeholder="Search your library..."
              class="w-full px-4 py-2.5 pl-10 rounded-xl border-2 border-black/15 bg-white text-sm font-medium focus:outline-none focus:border-black transition-colors"
            />
            <span class="absolute left-3.5 top-3 text-neutral-400 text-sm">
              🔍
            </span>
          </div>

          {/* Code List */}
          {loading && codes.length === 0
            ? (
              <div class="text-center py-8 text-neutral-400 text-sm font-medium">
                Loading your QR codes...
              </div>
            )
            : codes.length === 0
            ? (
              <div class="text-center py-8 bg-white border-2 border-dashed border-black/20 rounded-2xl p-6 space-y-2">
                <p class="text-2xl">🌱</p>
                <p class="font-bold text-sm text-neutral-800">
                  No editable codes yet
                </p>
                <p class="text-xs text-neutral-500 max-w-xs mx-auto">
                  Create an editable QR code in the generator to update its
                  destination anytime after printing.
                </p>
              </div>
            )
            : (
              <div class="space-y-3">
                {codes.map((c) => (
                  <div
                    key={c.id}
                    class="bg-white border-2 border-black rounded-2xl p-4 shadow-sm hover:border-black/70 transition-colors flex flex-col gap-2"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span class="font-black text-sm text-neutral-900 truncate">
                            {c.title || c.short_code}
                          </span>
                          {c.is_legacy && (
                            <span class="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded">
                              Legacy
                            </span>
                          )}
                        </div>
                        <p class="text-xs text-neutral-500 font-mono truncate mt-0.5">
                          {c.destination_url}
                        </p>
                      </div>
                      <a
                        href={`/edit/${c.short_code}`}
                        class="px-3 py-1.5 rounded-xl border-2 border-black bg-amber-200 text-xs font-bold hover:bg-amber-300 active:scale-95 transition-transform shrink-0"
                      >
                        Edit ↗
                      </a>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-black/5 text-[11px] text-neutral-400">
                      <span>
                        {c.scan_count} scan{c.scan_count === 1 ? "" : "s"}
                      </span>
                      <span>
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
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
                    Claim old QR code with token ↗
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleImportHistory}
                    class="text-xs font-bold text-neutral-600 hover:text-black underline disabled:opacity-50 text-left sm:text-right"
                  >
                    {importing ? "Importing..." : "Sync from browser history ↺"}
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
                      Claim Pre-Launch Code
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowImport(false)}
                      class="text-xs font-bold text-neutral-500 hover:text-black"
                    >
                      Cancel
                    </button>
                  </div>
                  <p class="text-[11px] text-neutral-500 leading-relaxed">
                    Paste the owner token from a code you created before this
                    release. Claiming it does not consume your 5-code allowance.
                  </p>
                  <input
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
                    {importing ? "Claiming..." : "Claim Code →"}
                  </button>
                </form>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
