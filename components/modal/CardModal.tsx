/**
 * CardModal — QRBuddy's one info-dialog skin on top of useModalShell.
 *
 * The floating cream card: chunky sepia border, squircle radius, a mascot
 * badge tile up top, circular × tucked top-right. Every info dialog (About,
 * Intro, Passport, Tip Jar) renders through this so they read as one app,
 * not three. Interactive sheets (CreateModal, style gallery, GradientCreator)
 * keep their bottom-sheet skeleton — this is for reading, not working.
 *
 * The pitch kit lives here too, mirroring TalkType's: one body rhythm
 * (`CardBody`), one heading recipe (`CardHeading`), one signature row
 * (`CardSignature`), one sub-view header (`CardBackBar`), and the two pill
 * buttons. A face is those pieces in that order — nothing sets its own
 * sizes.
 *
 * Structure: the dialog is a non-scrolling frame; the card inside it
 * scrolls, so the × stays put while long content scrolls under it.
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
  /** false = render `badge` bare (e.g. the app icon, which is its own tile). */
  badgeTile?: boolean;
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
  badgeTile = true,
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
            <div class="flex justify-center mb-4" aria-hidden="true">
              {badgeTile
                ? (
                  <div
                    class={`w-14 h-14 rounded-2xl border-2 border-[#1e1714] bg-gradient-to-br ${badgeClass} shadow-[2px_2px_0_#1e1714] flex items-center justify-center text-2xl select-none`}
                  >
                    {badge}
                  </div>
                )
                : badge}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** The one vertical rhythm every face uses (TalkType: space-y-4 sm:space-y-5). */
export function CardBody(
  props: { children: ComponentChildren; class?: string },
) {
  return (
    <div class={`text-center space-y-4 sm:space-y-5 ${props.class ?? ""}`}>
      {props.children}
    </div>
  );
}

/**
 * Headline + one pink tagline. Two lines max for the title; the punchline
 * word wears `.qr-marker`. Side padding keeps a long first line clear of
 * the × when no badge sits above it.
 */
export function CardHeading(
  props: {
    id: string;
    title: ComponentChildren;
    tagline?: ComponentChildren;
    clearClose?: boolean;
  },
) {
  return (
    <div class={`space-y-1.5 ${props.clearClose ? "px-8" : ""}`}>
      <h2
        id={props.id}
        class="font-black text-[1.55rem] sm:text-3xl leading-[1.15] tracking-tight text-[#1e1714] text-balance"
      >
        {props.title}
      </h2>
      {props.tagline && (
        <p class="text-sm sm:text-base font-bold tracking-tight text-[#db2777]">
          {props.tagline}
        </p>
      )}
    </div>
  );
}

/**
 * Sub-view header: a Back pill on the left, an eyebrow label on the right.
 * Replaces the heading row on faces that drill in (redeem, pair).
 */
export function CardBackBar(
  props: { onBack: () => void; back: string; eyebrow: string },
) {
  return (
    <div class="flex items-center justify-between pr-12">
      <button
        type="button"
        onClick={props.onBack}
        class="min-h-[38px] px-3 rounded-full border-2 border-[#1e1714] bg-[#fffef7] text-xs font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] hover:-translate-y-0.5 transition-transform"
      >
        ← {props.back}
      </button>
      <span class="text-xs font-black uppercase tracking-wider text-[#6f6158]">
        {props.eyebrow}
      </span>
    </div>
  );
}

/**
 * The signature row every face ends in: "Made by Pablo ☕ in Melbourne",
 * then whatever quiet links the face wants after the dot. The charm emoji
 * is the row's one piece of chrome — tap to shuffle.
 */
export function CardSignature(
  props: {
    isSpanish: boolean;
    makerUrl: string;
    charm: string;
    onCharm?: () => void;
    children?: ComponentChildren;
  },
) {
  return (
    <p class="text-xs font-semibold text-[#6f6158] flex items-center justify-center gap-x-1.5 gap-y-1 flex-wrap">
      <span>{props.isSpanish ? "Hecho por" : "Made by"}</span>
      <a
        href={props.makerUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="font-black text-[#1e1714] underline decoration-2 decoration-[#db2777]/50 underline-offset-2 hover:text-[#db2777] transition-colors"
      >
        Pablo
      </a>
      <button
        type="button"
        onClick={props.onCharm}
        class="inline-block text-sm leading-none hover:scale-125 active:scale-95 transition-transform cursor-pointer select-none"
        aria-label={props.isSpanish ? "Cambiar amuleto" : "Shuffle charm"}
      >
        {props.charm}
      </button>
      <span>{props.isSpanish ? "en Melbourne" : "in Melbourne"}</span>
      {props.children}
    </p>
  );
}

/** Dot separator for the signature / footer-link rows. */
export function CardDot() {
  return <span aria-hidden="true">·</span>;
}

/** Quiet underlined text link/button for the signature row. */
export function CardQuietLink(
  props: { href?: string; onClick?: () => void; children: ComponentChildren },
) {
  const cls =
    "font-bold text-[#1e1714] hover:text-[#db2777] underline underline-offset-2 transition-colors";
  if (props.href) {
    return <a href={props.href} class={cls}>{props.children}</a>;
  }
  return (
    <button type="button" onClick={props.onClick} class={cls}>
      {props.children}
    </button>
  );
}

/** The one primary pill every card shares (TalkType Pitch Kit warm CTA). */
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

/** Secondary pill — cream, bordered, for auxiliary actions. */
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
