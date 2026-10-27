/**
 * CardModal — QRBuddy's one info-dialog skin on top of useModalShell.
 *
 * The floating cream card: chunky black border, squircle radius, a mascot
 * badge hanging over the top edge like a slapped-on sticker, circular ×
 * tucked top-right. Every info dialog (About, Supporter, Tip Jar) renders
 * through this so they read as one app, not three. Interactive sheets
 * (CreateModal, style gallery, GradientCreator) keep their bottom-sheet
 * skeleton — this is for reading, not working.
 *
 * Structure: the dialog is a non-scrolling frame; the card inside it
 * scrolls. That lets the badge hang outside the card without being clipped
 * and keeps the × pinned while long content (FAQ, Ko-fi) scrolls.
 *
 * Lifecycle contract is the shell's: the parent owns `open` and flips it
 * false inside `onClose`.
 */
import type { ComponentChildren } from "preact";
import { useModalShell } from "./useModalShell.ts";

export interface CardModalProps {
  open: boolean;
  onClose: () => void;
  /** id of the heading element inside children (aria-labelledby). */
  labelledby: string;
  /** Emoji (or any node) for the centered badge. Omit for no badge. */
  badge?: ComponentChildren;
  /** Tailwind gradient classes for the badge tile. */
  badgeClass?: string;
  /** Card max width. Defaults to the manifesto width. */
  maxWidthClass?: string;
  /** Padding override for content that brings its own (e.g. an iframe). */
  padClass?: string;
  children: ComponentChildren;
}

export function CardModal({
  open,
  onClose,
  labelledby,
  badge,
  badgeClass = "from-qr-sunset1 via-pink-400 to-purple-500",
  maxWidthClass = "max-w-[440px]",
  padClass = "p-6 sm:p-7",
  children,
}: CardModalProps) {
  const shell = useModalShell({ open, onClose });
  if (!shell.mounted) return null;

  return (
    <div
      ref={shell.backdropRef}
      class={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-qr-scrim/60 backdrop-blur-sm charm-modal-backdrop animate-fade-in${
        shell.closing
          ? " charm-modal-backdrop--closing charm-modal--closing"
          : ""
      }`}
      role="presentation"
      onClick={shell.onBackdropClick}
    >
      <div
        ref={shell.dialogRef}
        class={`relative w-full ${maxWidthClass} outline-none charm-modal-card animate-pop-in${
          shell.closing ? " charm-modal--closing" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledby}
        tabindex={-1}
      >
        <button
          type="button"
          onClick={shell.requestClose}
          class="qr-modal-close-btn absolute z-10 top-3.5 right-3.5"
          aria-label="Close"
        >
          <svg
            class="w-4 h-4 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3.25"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6.5 6.5l11 11m0-11l-11 11" />
          </svg>
        </button>

        <div
          class={`max-h-[calc(92dvh-2rem)] overflow-y-auto scrollbar-none bg-[#fbf1e4] border-3 border-[#1e1714] rounded-3xl shadow-chunky-hover ${padClass}`}
        >
          {badge && (
            <div class="flex justify-center mb-3" aria-hidden="true">
              <div
                class={`w-14 h-14 rounded-2xl border-2 border-[#1e1714] bg-gradient-to-br ${badgeClass} shadow-[2px_2px_0_#1e1714] flex items-center justify-center text-2xl select-none`}
              >
                {badge}
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** The one primary pill every card shares (TalkType Pitch Kit warm yellow CTA). */
export function CardPrimaryButton(
  props: {
    onClick: () => void;
    disabled?: boolean;
    children: ComponentChildren;
    class?: string;
  },
) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      class={`qr-pitch-cta ${props.class ?? ""}`}
    >
      {props.children}
    </button>
  );
}

/** Secondary pill — cream/white, bordered, for auxiliary actions. */
export function CardSecondaryButton(
  props: {
    onClick?: () => void;
    href?: string;
    children: ComponentChildren;
  },
) {
  const cls =
    "flex-1 min-h-[44px] inline-flex items-center justify-center rounded-2xl border-2 border-[#1e1714] bg-[#fffef7] px-4 text-sm font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] transition-all hover:-translate-y-0.5 active:translate-y-0";
  if (props.href) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        class={cls}
      >
        {props.children}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} class={cls}>
      {props.children}
    </button>
  );
}
