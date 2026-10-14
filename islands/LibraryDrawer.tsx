import { useEffect, useState } from "preact/hooks";
import {
  getCurrentSession,
  getCurrentUser,
  sendEmailOtp,
  signOutUser,
  verifyEmailOtp,
} from "../utils/auth.ts";
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
  const [session, setSession] = useState<
    { user: { email?: string; id: string } } | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");

  const [codes, setCodes] = useState<LibraryCodeItem[]>([]);
  const [quota, setQuota] = useState<LibraryQuota | null>(null);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [importToken, setImportToken] = useState("");
  const [importing, setImporting] = useState(false);

  // Check auth session
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    getCurrentSession().then((sess) => {
      if (!mounted) return;
      if (sess?.user) {
        setSession({ user: { email: sess.user.email, id: sess.user.id } });
        loadLibraryData();
      } else {
        setSession(null);
      }
    });

    const onAuthChanged = () => {
      getCurrentUser().then((user) => {
        if (!mounted) return;
        if (user) {
          setSession({ user: { email: user.email, id: user.id } });
          loadLibraryData();
        } else {
          setSession(null);
          setCodes([]);
          setQuota(null);
        }
      });
    };

    globalThis.addEventListener("qrb-auth-changed", onAuthChanged);
    return () => {
      mounted = false;
      globalThis.removeEventListener("qrb-auth-changed", onAuthChanged);
    };
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

  const handleSendOtp = async (e: Event) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    haptics.light();

    const res = await sendEmailOtp(email);
    setLoading(false);
    if (res.success) {
      setOtpSent(true);
      haptics.medium();
      addToast("Verification code sent to your email ✉️", 4000);
    } else {
      setAuthError(res.error || "Failed to send code");
      haptics.error();
    }
  };

  const handleVerifyOtp = async (e: Event) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    haptics.light();

    const res = await verifyEmailOtp(email, otpCode);
    setLoading(false);
    if (res.success && res.session?.user) {
      haptics.success();
      setSession({
        user: { email: res.session.user.email, id: res.session.user.id },
      });
      setOtpSent(false);
      setOtpCode("");
      addToast("Signed in to your library ✨", 3000);
      loadLibraryData();
    } else {
      setAuthError(res.error || "Invalid verification code");
      haptics.error();
    }
  };

  const handleSignOut = async () => {
    haptics.light();
    await signOutUser();
    setSession(null);
    setCodes([]);
    setQuota(null);
    addToast("Signed out", 2500);
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
        addToast(`Code /r?code=${res.short_code} added to your library!`, 4000);
        setImportToken("");
        setShowImport(false);
        loadLibraryData();
      } else {
        haptics.error();
        addToast(res.message || "Failed to import code", 4000);
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

  const handleSyncLocalHistory = async () => {
    setImporting(true);
    haptics.light();
    try {
      const { attempted, claimed } = await importLocalHistoryCodes();
      if (claimed > 0) {
        haptics.success();
        addToast(
          `Imported ${claimed} existing code${
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

  if (!isOpen) return null;

  return (
    <div
      class="fixed inset-0 bg-[#2B1A0E]/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        class="bg-[#FAF7F2] w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-black p-4 sm:p-6 shadow-chunky max-h-[92dvh] flex flex-col animate-slide-up sm:animate-pop-in pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
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
            onClick={onClose}
            aria-label="Close library"
            class="w-10 h-10 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-lg hover:bg-neutral-100 active:scale-95 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto scrollbar-none py-4 space-y-4">
          {!session
            ? (
              /* Signed Out View */
              <div class="space-y-4">
                <div class="bg-amber-100 border-2 border-black rounded-2xl p-4 text-sm text-neutral-800 leading-relaxed shadow-sm">
                  <p class="font-bold mb-1">Recoverable QR Library</p>
                  <p>
                    Sign in with your email to keep your editable QR codes
                    across devices. Zero passwords, zero passwords to lose.
                  </p>
                </div>

                {authError && (
                  <div class="bg-rose-100 border-2 border-rose-800 text-rose-900 text-xs font-semibold rounded-xl p-3">
                    {authError}
                  </div>
                )}

                {!otpSent
                  ? (
                    <form onSubmit={handleSendOtp} class="space-y-3">
                      <div>
                        <label
                          htmlFor="library-email-input"
                          class="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1"
                        >
                          Email address
                        </label>
                        <input
                          id="library-email-input"
                          type="email"
                          value={email}
                          onInput={(e) =>
                            setEmail((e.target as HTMLInputElement).value)}
                          placeholder="you@example.com"
                          required
                          class="w-full px-4 py-3 rounded-2xl border-2 border-black/15 bg-white font-medium text-neutral-900 focus:outline-none focus:border-black transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !email.trim()}
                        class="w-full py-3.5 px-4 rounded-full border-2 border-black font-black bg-amber-300 text-neutral-900 shadow-chunky hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all text-sm uppercase tracking-wider"
                      >
                        {loading ? "Sending code..." : "Send 6-digit code →"}
                      </button>
                    </form>
                  )
                  : (
                    <form onSubmit={handleVerifyOtp} class="space-y-3">
                      <div class="text-xs text-neutral-600">
                        Enter the 6-digit code sent to{" "}
                        <strong class="text-neutral-900">{email}</strong>:
                      </div>

                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={otpCode}
                          onInput={(e) =>
                            setOtpCode((e.target as HTMLInputElement).value)}
                          placeholder="123456"
                          required
                          autofocus
                          class="w-full px-4 py-3 rounded-2xl border-2 border-black bg-white font-black text-center text-xl tracking-widest text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpCode.trim().length < 6}
                        class="w-full py-3.5 px-4 rounded-full border-2 border-black font-black bg-emerald-300 text-neutral-900 shadow-chunky hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-all text-sm uppercase tracking-wider"
                      >
                        {loading ? "Verifying..." : "Verify & open library →"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode("");
                        }}
                        class="w-full text-xs font-bold text-neutral-500 hover:text-neutral-800 text-center py-1"
                      >
                        ← Change email address
                      </button>
                    </form>
                  )}
              </div>
            )
            : (
              /* Signed In View */
              <div class="space-y-4">
                {/* Account & Quota Bar */}
                <div class="bg-white border-2 border-black rounded-2xl p-3 flex items-center justify-between shadow-sm">
                  <div class="truncate mr-2">
                    <p class="text-xs font-bold text-neutral-500 truncate">
                      {session.user.email}
                    </p>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span
                        class={`text-xs px-2 py-0.5 rounded-full font-black border border-black ${
                          quota?.is_active_plus
                            ? "bg-purple-200 text-purple-900"
                            : "bg-amber-200 text-neutral-900"
                        }`}
                      >
                        {quota?.is_active_plus ? "Plus" : "Free"}
                      </span>
                      <span class="text-xs font-semibold text-neutral-700">
                        {quota
                          ? `${quota.used_count} of ${quota.total_allowed} codes`
                          : "Loading quota..."}
                      </span>
                      {quota && quota.legacy_count > 0 && (
                        <span class="text-[10px] text-neutral-500 font-medium">
                          (+{quota.legacy_count} legacy)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    class="px-2.5 py-1 text-xs font-bold rounded-lg border border-black/20 hover:border-black bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                  >
                    Sign out
                  </button>
                </div>

                {/* Utility actions: Import legacy / sync history */}
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImport(!showImport)}
                    class="flex-1 py-1.5 px-3 rounded-xl border border-black/20 hover:border-black bg-white text-xs font-bold text-neutral-700 hover:bg-amber-50 transition-colors"
                  >
                    {showImport ? "✕ Cancel import" : "＋ Claim old code"}
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleSyncLocalHistory}
                    class="flex-1 py-1.5 px-3 rounded-xl border border-black/20 hover:border-black bg-white text-xs font-bold text-neutral-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                  >
                    {importing ? "Syncing..." : "⚡️ Sync local codes"}
                  </button>
                </div>

                {/* Import box */}
                {showImport && (
                  <form
                    onSubmit={handleClaimLegacy}
                    class="bg-amber-50 border-2 border-black rounded-2xl p-3 space-y-2"
                  >
                    <p class="text-xs font-semibold text-neutral-700">
                      Paste the 32-character owner token from an earlier QR code
                      to grandfather it:
                    </p>
                    <input
                      type="text"
                      value={importToken}
                      onInput={(e) =>
                        setImportToken((e.target as HTMLInputElement).value)}
                      placeholder="Owner token..."
                      required
                      class="w-full px-3 py-2 rounded-xl border-2 border-black/20 bg-white text-xs font-mono focus:border-black focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={importing || !importToken.trim()}
                      class="w-full py-2 rounded-xl border-2 border-black font-black text-xs bg-amber-300 hover:bg-amber-400 disabled:opacity-50"
                    >
                      {importing ? "Claiming..." : "Claim code into library"}
                    </button>
                  </form>
                )}

                {/* Search bar */}
                <div>
                  <input
                    type="search"
                    value={search}
                    onInput={(e) => {
                      const q = (e.target as HTMLInputElement).value;
                      setSearch(q);
                      loadLibraryData(q);
                    }}
                    placeholder="Filter by title or link..."
                    class="w-full px-3.5 py-2.5 rounded-2xl border-2 border-black/15 bg-white text-xs font-medium placeholder:text-neutral-400 focus:outline-none focus:border-black"
                  />
                </div>

                {/* Codes List */}
                {loading && codes.length === 0
                  ? (
                    <div class="py-8 text-center text-xs font-bold text-neutral-500">
                      Loading your codes...
                    </div>
                  )
                  : codes.length === 0
                  ? (
                    <div class="py-8 text-center bg-white border-2 border-black/10 rounded-2xl p-6 text-neutral-500">
                      <p class="text-sm font-bold text-neutral-800 mb-1">
                        No editable codes yet
                      </p>
                      <p class="text-xs">
                        When you create an editable QR link, it will appear here
                        so you can update its destination anytime.
                      </p>
                    </div>
                  )
                  : (
                    <div class="space-y-2">
                      {codes.map((item) => (
                        <div
                          key={item.id}
                          class="bg-white border-2 border-black rounded-2xl p-3 space-y-2 shadow-sm hover:border-black transition-colors"
                        >
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                              <p class="font-bold text-sm text-neutral-900 truncate">
                                {item.title || item.destination_url}
                              </p>
                              <p class="text-xs text-neutral-500 truncate font-mono mt-0.5">
                                → {item.destination_url}
                              </p>
                            </div>
                            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/15 bg-neutral-100 text-neutral-700 shrink-0">
                              {item.short_code}
                            </span>
                          </div>

                          <div class="flex items-center justify-between text-xs pt-1 border-t border-black/5">
                            <div class="flex items-center gap-2 text-neutral-500">
                              <span>
                                {item.scan_count}{" "}
                                {item.scan_count === 1 ? "scan" : "scans"}
                              </span>
                              {item.is_legacy && (
                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
                                  Legacy
                                </span>
                              )}
                              {!item.is_active && (
                                <span class="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold border border-rose-300">
                                  Paused
                                </span>
                              )}
                            </div>

                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      item.redirect_url,
                                    );
                                    haptics.light();
                                    addToast("Link copied 🔗", 2000);
                                  } catch {
                                    // fallback
                                  }
                                }}
                                class="px-2 py-1 rounded-lg border border-black/15 hover:border-black text-[11px] font-bold bg-neutral-50 hover:bg-neutral-100"
                              >
                                Copy
                              </button>
                              <a
                                href={`/r?code=${item.short_code}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="px-2 py-1 rounded-lg border border-black/15 hover:border-black text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-neutral-900"
                              >
                                Open →
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
