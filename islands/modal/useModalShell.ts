/**
 * useModalShell.ts — the modal-shell brain for the Fresh/Preact apps
 * (qrbuddy, stargram, & co). Same contract as ModalShell.svelte; ModalShell.tsx
 * is the ready-made wrapper — reach for the hook directly only when a modal
 * needs a custom skeleton but still wants the canonical machinery.
 *
 * Owns: Escape, Tab focus trap + focus restore, body scroll-lock, backdrop
 * click-outside, the close-out animation clock, reduced-motion. Close timing
 * has ONE source of truth: the --charm-modal-close-ms token, read off the
 * card at close time (pass closeMs only to override).
 *
 * Works with plain useState or @preact/signals — pass `open` as a boolean
 * each render (reading signal.value re-renders, so it Just Works).
 *
 * Self-contained: copy the modal/ folder verbatim into an app, no other files.
 */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";

const DEFAULT_CLOSE_MS = 160;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseModalShellOptions {
  /** Parent-owned open state (boolean or signal.value). */
  open: boolean;
  /** Called AFTER the exit animation — flip your open state false here. */
  onClose: () => void;
  /** Escape + backdrop click close the modal. Default true. */
  dismissible?: boolean;
  /** Exit ms override. Omit = read --charm-modal-close-ms off the card. */
  closeMs?: number | null;
}

export interface UseModalShellResult {
  /** Render the shell while true (open OR playing the exit animation). */
  mounted: boolean;
  /** True during the exit animation — add .charm-modal--closing. */
  closing: boolean;
  /** Bind to the backdrop element. */
  backdropRef: RefObject<HTMLDivElement>;
  /** Bind to the dialog card (focused on open, trap + timing anchor). */
  dialogRef: RefObject<HTMLDivElement>;
  /** Start the close-out: exit animation → focus restore → onClose(). */
  requestClose: () => void;
  /** Put on the backdrop's onClick — closes only on true outside clicks. */
  onBackdropClick: (e: MouseEvent) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== "function") return false;
  try {
    return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useModalShell(
  options: UseModalShellOptions,
): UseModalShellResult {
  const { open, onClose, dismissible = true, closeMs = null } = options;

  const [closing, setClosing] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const lastFocused = useRef<Element | null>(null);

  // Latest-value refs so the document-level listeners never go stale.
  const stateRef = useRef({ open, closing, dismissible, onClose, closeMs });
  stateRef.current = { open, closing, dismissible, onClose, closeMs };

  // One source of truth for close timing: the CSS token on the card.
  function resolveCloseMs(): number {
    const override = stateRef.current.closeMs;
    if (override != null) return override;
    const el = dialogRef.current;
    if (el && typeof getComputedStyle === "function") {
      const raw = getComputedStyle(el)
        .getPropertyValue("--charm-modal-close-ms")
        .trim();
      const n = parseFloat(raw);
      if (!Number.isNaN(n)) {
        return raw.endsWith("ms") || !raw.endsWith("s") ? n : n * 1000;
      }
    }
    return DEFAULT_CLOSE_MS;
  }

  function requestClose() {
    if (stateRef.current.closing || !stateRef.current.open) return;
    setClosing(true);
    stateRef.current.closing = true;
    const finish = () => {
      closeTimer.current = null;
      const prev = lastFocused.current;
      if (prev instanceof HTMLElement) prev.focus();
      stateRef.current.onClose();
    };
    if (prefersReducedMotion()) finish();
    else {
      closeTimer.current = setTimeout(
        finish,
        resolveCloseMs(),
      ) as unknown as number;
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (stateRef.current.dismissible && e.target === backdropRef.current) {
      requestClose();
    }
  }

  // Keep Tab cycling inside the dialog while it is open.
  function trapTab(e: KeyboardEvent) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusables.length) {
      e.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const inside = dialog.contains(active);
    if (e.shiftKey && (!inside || active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || active === last)) {
      e.preventDefault();
      first.focus();
    }
  }

  // Open lifecycle: focus in, scroll-lock, Escape + trap. Cleanup releases
  // everything (also covers unmount mid-open).
  useEffect(() => {
    if (!open) {
      // External close (parent flipped open without requestClose) — reset.
      if (closeTimer.current != null) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      setClosing(false);
      return;
    }

    setClosing(false);
    lastFocused.current = document.activeElement;
    dialogRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeydown = (e: KeyboardEvent) => {
      if (!stateRef.current.open || stateRef.current.closing) return;
      if (e.key === "Escape" && stateRef.current.dismissible) {
        e.preventDefault();
        requestClose();
      } else if (e.key === "Tab") {
        trapTab(e);
      }
    };
    document.addEventListener("keydown", onKeydown);

    return () => {
      document.removeEventListener("keydown", onKeydown);
      document.body.style.overflow = prevOverflow;
      if (closeTimer.current != null) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, [open]);

  return useMemo(
    () => ({
      mounted: open || closing,
      closing,
      backdropRef,
      dialogRef,
      requestClose,
      onBackdropClick,
    }),
    [open, closing],
  );
}
