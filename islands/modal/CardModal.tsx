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
  maxWidthClass = "max-w-[460px]",
  padClass = "p-6 sm:p-8",
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
        class={`relative w-full ${maxWidthClass} ${
          badge ? "mt-8" : ""
        } outline-none charm-modal-card animate-pop-in${
          shell.closing ? " charm-modal--closing" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledby}
        tabindex={-1}
      >
        {/* 44px hit area, 36px visual — pinned to the frame, not the scroll */}
        <button
          type="button"
          onClick={shell.requestClose}
          class="group absolute z-10 top-2.5 right-2.5 w-11 h-11 rounded-full flex items-center justify-center"
          aria-label="Close"
        >
          <span
            class="w-9 h-9 rounded-full bg-white border-2 border-black text-black font-black text-base leading-none flex items-center justify-center shadow-chunky transition-transform group-hover:scale-110 group-hover:rotate-90 group-active:scale-90"
            aria-hidden="true"
          >
            ✕
          </span>
        </button>

        {badge && (
          // Half on, half off the top edge. Tilt and float live on separate
          // elements so the float keyframes don't wipe the tilt. The strip is
          // click-through so it never shadows the ×; the tile itself isn't,
          // so tapping the mascot can't fall through to the backdrop.
          <div
            class="absolute z-10 inset-x-0 top-0 -translate-y-1/2 flex justify-center select-none pointer-events-none"
            aria-hidden="true"
          >
            <div class="-rotate-6 pointer-events-auto">
              <div
                class={`w-16 h-16 rounded-2xl border-3 border-black bg-gradient-to-br ${badgeClass} shadow-chunky animate-float flex items-center justify-center text-3xl`}
              >
                {badge}
              </div>
            </div>
          </div>
        )}

        <div
          class={`max-h-[calc(92dvh-2rem)] overflow-y-auto scrollbar-none bg-qr-cream border-4 border-black rounded-3xl shadow-chunky-hover ${padClass} ${
            badge ? "pt-12 sm:pt-14" : ""
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** The one primary pill every card shares. */
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
      class={`w-full min-h-[52px] rounded-full border-3 border-black px-6 py-3 text-lg font-black shadow-chunky transition-all hover:scale-[1.02] hover:shadow-chunky-hover active:scale-[0.97] disabled:opacity-60 disabled:hover:scale-100 ${
        props.class ?? "bg-qr-pop text-white hover:bg-qr-popDeep"
      }`}
    >
      {props.children}
    </button>
  );
}

/** Secondary pill — white, bordered, for the row under the primary. */
export function CardSecondaryButton(
  props: {
    onClick?: () => void;
    href?: string;
    children: ComponentChildren;
  },
) {
  const cls =
    "flex-1 min-h-[44px] inline-flex items-center justify-center rounded-full border-2 border-black bg-white px-4 text-sm font-bold text-black shadow-chunky transition-all hover:scale-105 active:scale-95";
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
