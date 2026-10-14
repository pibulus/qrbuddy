import { Signal } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { haptics } from "../../utils/haptics.ts";
import { addToast } from "../ToastManager.tsx";
import { looksLikeUrl } from "../../utils/url.ts";
import {
  getCurrentSession,
  isPlusLibraryEnabled,
  sendEmailOtp,
  verifyEmailOtp,
} from "../../utils/auth.ts";
import { fetchLibraryQuota, LibraryQuota } from "../../utils/library.ts";

interface EditableLinkSettingsProps {
  editUrl: Signal<string>;
  /** The URL currently in the main input — what the editable QR will wrap. */
  pendingUrl: string;
  isCreating: boolean;
  onCreate: () => void;
  isSequential?: boolean;
  sequentialUrls?: string[];
}

export default function EditableLinkSettings({
  editUrl,
  pendingUrl,
  isCreating,
  onCreate,
  isSequential,
  sequentialUrls,
}: EditableLinkSettingsProps) {
  const [libraryEnabled] = useState(() => isPlusLibraryEnabled());
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [quota, setQuota] = useState<LibraryQuota | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!libraryEnabled) return;

    let mounted = true;
    getCurrentSession().then((sess) => {
      if (!mounted) return;
      if (sess?.user) {
        setUser({ id: sess.user.id, email: sess.user.email });
        fetchLibraryQuota().then((q) => {
          if (mounted) setQuota(q);
        }).catch(() => {});
      } else {
        setUser(null);
      }
    });

    const onAuth = () => {
      getCurrentSession().then((sess) => {
        if (!mounted) return;
        if (sess?.user) {
          setUser({ id: sess.user.id, email: sess.user.email });
          fetchLibraryQuota().then((q) => {
            if (mounted) setQuota(q);
          }).catch(() => {});
        } else {
          setUser(null);
          setQuota(null);
        }
      });
    };

    globalThis.addEventListener("qrb-auth-changed", onAuth);
    return () => {
      mounted = false;
      globalThis.removeEventListener("qrb-auth-changed", onAuth);
    };
  }, [libraryEnabled]);

  const handleSendCode = async () => {
    if (!emailInput.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    haptics.light();
    const res = await sendEmailOtp(emailInput);
    setAuthLoading(false);
    if (res.success) {
      setOtpSent(true);
      haptics.medium();
      addToast("Code sent to your email! ✉️", 3000);
    } else {
      setAuthError(res.error || "Failed to send code");
      haptics.error();
    }
  };

  const handleVerifyCode = async () => {
    if (!otpInput.trim() || otpInput.trim().length < 6) return;
    setAuthLoading(true);
    setAuthError("");
    haptics.light();
    const res = await verifyEmailOtp(emailInput, otpInput);
    setAuthLoading(false);
    if (res.success && res.session?.user) {
      setUser({ id: res.session.user.id, email: res.session.user.email });
      setOtpSent(false);
      setOtpInput("");
      haptics.success();
      addToast("Signed in! Ready to create editable link ✨", 3000);
      try {
        const q = await fetchLibraryQuota();
        setQuota(q);
      } catch {
        // Ignore
      }
    } else {
      setAuthError(res.error || "Invalid code");
      haptics.error();
    }
  };

  const hasContent = pendingUrl.trim() !== "";
  const validSeqCount = isSequential && sequentialUrls
    ? sequentialUrls.filter((u) => looksLikeUrl(u)).length
    : 0;
  const hasSequentialRoutes = validSeqCount >= 2;
  // Editable QRs wrap links only — WiFi/vCard/text payloads stay static.
  const hasLink = isSequential
    ? hasSequentialRoutes
    : hasContent && looksLikeUrl(pendingUrl);

  const isOverQuota = libraryEnabled && user && quota && !quota.can_create;
  const canSubmit = hasLink && !isCreating &&
    (!libraryEnabled || (user && !isOverQuota));

  return (
    <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-3 animate-slide-down">
      {!editUrl.value && (
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-2xl">✨</span>
            <div class="min-w-0 flex-1">
              <h4 class="font-bold text-sm text-[#9370DB]">
                Editable mode is on
              </h4>
              {isSequential
                ? (
                  hasSequentialRoutes
                    ? (
                      <p class="text-xs text-gray-700 leading-relaxed truncate">
                        Wraps{" "}
                        <span class="font-semibold">
                          {validSeqCount} rotating links
                        </span>
                      </p>
                    )
                    : (
                      <p class="text-xs text-gray-700 leading-relaxed">
                        Add {validSeqCount === 1 ? "one more" : "at least two"}
                        {" "}
                        valid links below to make this sequence rotate.
                      </p>
                    )
                )
                : hasLink
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed truncate">
                    Wraps <span class="font-mono">{pendingUrl}</span>
                  </p>
                )
                : hasContent
                ? (
                  <p class="text-xs text-gray-700 leading-relaxed">
                    Editable wraps a link — this content isn't one, so it stays
                    a static QR.
                  </p>
                )
                : (
                  <p class="text-xs text-gray-700 leading-relaxed">
                    Add a link first — type or paste it in the main input or
                    below.
                  </p>
                )}
            </div>
          </div>

          {/* Library Authentication / Quota helper when enabled */}
          {libraryEnabled && !user && (
            <div class="bg-amber-50 border-2 border-black rounded-xl p-3 space-y-2 animate-slide-down">
              <p class="text-xs font-bold text-neutral-800">
                Sign in with email to save & update this QR code:
              </p>
              {!otpSent
                ? (
                  <div class="flex gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onInput={(e) =>
                        setEmailInput((e.target as HTMLInputElement).value)}
                      placeholder="you@example.com"
                      class="flex-1 px-3 py-2 text-xs border-2 border-black/20 rounded-xl bg-white focus:border-black focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={authLoading || !emailInput.trim()}
                      onClick={handleSendCode}
                      class="px-3 py-2 text-xs font-black rounded-xl border-2 border-black bg-amber-300 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-transform"
                    >
                      {authLoading ? "..." : "Send code"}
                    </button>
                  </div>
                )
                : (
                  <div class="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpInput}
                      onInput={(e) =>
                        setOtpInput((e.target as HTMLInputElement).value)}
                      placeholder="6-digit code"
                      class="flex-1 px-3 py-2 text-xs font-black tracking-widest text-center border-2 border-black rounded-xl bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={authLoading || otpInput.trim().length < 6}
                      onClick={handleVerifyCode}
                      class="px-3 py-2 text-xs font-black rounded-xl border-2 border-black bg-emerald-300 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 transition-transform"
                    >
                      {authLoading ? "..." : "Verify"}
                    </button>
                  </div>
                )}
              {authError && (
                <p class="text-[11px] font-bold text-rose-700">{authError}</p>
              )}
            </div>
          )}

          {libraryEnabled && user && (
            <div class="flex items-center justify-between text-xs px-1 text-neutral-600">
              <span class="font-bold truncate mr-2">
                {user.email}
              </span>
              <span
                class={`font-bold px-2 py-0.5 rounded border border-black/15 ${
                  isOverQuota
                    ? "bg-rose-100 text-rose-800"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {quota
                  ? `${quota.used_count} of ${quota.total_allowed} used`
                  : "Signed in"}
              </span>
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              haptics.medium();
              onCreate();
            }}
            class="w-full min-h-[48px] rounded-xl border-3 border-black bg-[#9370DB] px-4 py-2 font-black text-white shadow-chunky hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isCreating
              ? "Creating..."
              : isOverQuota
              ? `Free limit reached (${quota?.used_count}/${quota?.total_allowed})`
              : "Create editable link"}
          </button>
        </div>
      )}
      {editUrl.value && (
        <div class="bg-white border-2 border-black rounded-2xl p-4 space-y-2 animate-slide-down">
          <div class="flex items-center gap-2">
            <span class="text-xl">✨</span>
            <p class="text-sm font-black text-[#6B46A8]">
              Editable QR created!
            </p>
          </div>
          <div class="flex gap-2">
            <input
              type="text"
              value={editUrl.value}
              readOnly
              class="flex-1 min-h-[44px] px-3 py-2 bg-white border-2 border-[#9370DB] rounded-lg text-xs font-mono"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(editUrl.value);
                  haptics.success();
                  addToast("Edit link copied! 📋");
                } catch {
                  haptics.error();
                  addToast("Couldn't reach the clipboard", 3000);
                }
              }}
              class="min-h-[44px] px-4 py-2 bg-[#9370DB] text-white rounded-lg font-semibold text-sm hover:bg-[#6B46A8] transition-colors"
            >
              Copy
            </button>
          </div>
          <a
            href={`mailto:?subject=${
              encodeURIComponent("Your QRBuddy edit link")
            }&body=${
              encodeURIComponent(
                `Keep this safe — it's the only way to edit your QR later.\n\n${editUrl.value}`,
              )
            }`}
            class="flex items-center justify-center w-full min-h-[44px] rounded-lg border-2 border-[#9370DB] bg-white px-4 py-2 font-bold text-sm text-[#6B46A8] hover:bg-[#F5E6FF] transition-colors"
            onClick={() => haptics.light()}
          >
            📧 Email me this link
          </a>
          <p class="text-xs text-[#6B46A8]">
            This link is your key — no account, no recovery. Save it somewhere
            real.
          </p>
        </div>
      )}
    </div>
  );
}
