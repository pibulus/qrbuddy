/**
 * ModalShell.tsx — the Preact/Fresh twin of ModalShell.svelte. Same contract,
 * same css classes (modal-shell.css — copy it into static/ and <link> it, or
 * paste it into the app's global stylesheet; Fresh islands can't import css).
 *
 * The machinery lives in useModalShell.ts; this is the ready-made skeleton:
 * backdrop, card, tucked squishy ×, your content as children.
 *
 * Lifecycle contract: the PARENT owns `open`. Keep the component rendered and
 * flip `open` false only inside `onClose` — the shell plays its exit
 * animation first, then calls it.
 *
 * Self-contained: copy the modal/ folder verbatim into an app, no other files.
 */
import type { ComponentChildren } from "preact";
import { useModalShell } from "./useModalShell.ts";

export interface ModalShellProps {
  /** Parent-owned open state (boolean or signal.value). */
  open: boolean;
  /** Called AFTER the exit animation — flip your open state false here. */
  onClose: () => void;
  /** id of the heading element inside children (aria-labelledby). */
  labelledby?: string;
  /** Max card width — the card renders at min(92vw, maxWidth). */
  maxWidth?: string;
  /** Tall content scrolls inside the card (pair with .cute-scroll). */
  scrollable?: boolean;
  /** Escape + backdrop click close the modal. false = explicit close only. */
  dismissible?: boolean;
  /** Render the tucked squishy × button. */
  showClose?: boolean;
  /** Exit ms override. Omit = read --charm-modal-close-ms off the card. */
  closeMs?: number | null;
  /** Extra classes for the card (your modal's own body styling hook). */
  class?: string;
  children: ComponentChildren;
}

export function ModalShell(props: ModalShellProps) {
  const {
    open,
    onClose,
    labelledby,
    maxWidth = "24rem",
    scrollable = false,
    dismissible = true,
    showClose = true,
    closeMs = null,
  } = props;

  const shell = useModalShell({ open, onClose, dismissible, closeMs });
  if (!shell.mounted) return null;

  const closingMod = shell.closing ? " charm-modal--closing" : "";
  const cardClass = "charm-modal" +
    (scrollable ? " charm-modal--scrollable" : "") +
    closingMod +
    (props.class ? ` ${props.class}` : "");

  return (
    <div
      ref={shell.backdropRef}
      class={"charm-modal-backdrop" + closingMod}
      role="presentation"
      onClick={shell.onBackdropClick}
    >
      <div
        ref={shell.dialogRef}
        class={cardClass}
        style={{ width: `min(92vw, ${maxWidth})` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledby}
        tabindex={-1}
      >
        {showClose && (
          <button
            type="button"
            class="charm-modal-close"
            aria-label="Close"
            onClick={shell.requestClose}
          >
            ×
          </button>
        )}
        {props.children}
      </div>
    </div>
  );
}
