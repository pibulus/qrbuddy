import type { JSX } from "preact";

type ModalCloseButtonProps =
  & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "type" | "children">
  & { "data-history-close"?: boolean };

/**
 * The one tucked, squishy close button every sheet uses. Styling lives in
 * `.qr-modal-close-btn` (static/styles.css); the cross is a 3.25-stroke SVG so
 * it never depends on a font glyph.
 */
export default function ModalCloseButton(
  { class: className = "", ...rest }: ModalCloseButtonProps,
) {
  return (
    <button
      type="button"
      {...rest}
      class={`qr-modal-close-btn ${className}`.trim()}
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
  );
}
