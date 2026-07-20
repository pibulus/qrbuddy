# ModalShell — one shell to end the copy-paste plague 🐚

The canonical dialog shell for the SoftStack fleet. Seven of ten apps were
hand-rolling the same machinery per modal (Escape handler, backdrop click, body
scroll-lock, focus trap, close animation, byte-identical keyframes) and it had
already shipped two drift bugs (qrbuddy's missing scroll-lock, ziplist's double
animation). This folder is that machinery, once, both framework flavors, sharing
one css file.

**Distribution model: copy-per-app** (same as every charm — no package, no build
infra). This folder is fully self-contained: vendor-copy `src/modal/` verbatim,
nothing outside it is needed. When this golden source improves, re-copy (or
`diff`) into the apps.

## Files

| File                | For                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `ModalShell.svelte` | SvelteKit apps (daysay, iconmakeit, riffrap, ziplist, talktype…) — imports the css itself |
| `useModalShell.ts`  | Fresh/Preact apps — the machinery as a hook, for modals needing a custom skeleton         |
| `ModalShell.tsx`    | Fresh/Preact apps — the ready-made skeleton on top of the hook (qrbuddy, stargram…)       |
| `modal-shell.css`   | The shared skeleton + keyframes BOTH flavors reference                                    |

## The contract (identical in both flavors)

**The parent owns `open`.** Keep the component mounted/rendered and flip `open`
to false only in response to the close event — the shell plays its exit
animation FIRST, restores focus to whatever opened it, and _then_ notifies you.
Unmounting the component yourself, or flipping `open` directly, skips the exit
animation (allowed, e.g. for programmatic force-closes).

What the shell owns so your modal never re-implements it:

- Backdrop + click-outside close (true outside clicks only — clicks in the card
  never leak)
- Escape to close (both dismissals gated by `dismissible`)
- Body scroll-lock while open (previous `overflow` value restored, not blanked)
- Focus: moved into the dialog on open, Tab/Shift-Tab trapped inside, restored
  to the opener on close
- Entrance pop + exit fade-out animations, `prefers-reduced-motion` aware
  (instant, no timers)
- The tucked squishy × button (design-law compliant; `showClose={false}` to
  bring your own)

### Props

| Prop          | Default                   | What                                                                                                                                                                                  |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`        | `false` (required in TSX) | Parent-owned open state                                                                                                                                                               |
| `labelledby`  | —                         | id of your heading element → `aria-labelledby`                                                                                                                                        |
| `maxWidth`    | `'24rem'`                 | Card width is `min(92vw, maxWidth)`                                                                                                                                                   |
| `scrollable`  | `false`                   | Tall content scrolls inside the card (pair with `.cute-scroll`)                                                                                                                       |
| `dismissible` | `true`                    | Escape + backdrop close; `false` = explicit close only                                                                                                                                |
| `showClose`   | `true`                    | The × button                                                                                                                                                                          |
| `closeMs`     | `null`                    | Exit-timing override. **Leave null** — the shell reads `--charm-modal-close-ms` off the card, so CSS is the one source of truth (this exact prop/token drift was a shipped bug class) |

**Svelte flavor:** default slot for content, exposes `let:requestClose` for
in-body Done/Cancel buttons; dispatches `on:close` after the exit animation.

```svelte
<ModalShell open={showAbout} labelledby="about-title" on:close={() => (showAbout = false)} let:requestClose>
	<h2 id="about-title">About</h2>
	<button on:click={requestClose}>Done</button>
</ModalShell>
```

**Preact flavor:** `children` for content, `onClose` callback (flip your
state/signal false inside it), plus `class` to add your card's body classes.

```tsx
<ModalShell
  open={aboutOpen.value}
  labelledby="about-title"
  onClose={() => (aboutOpen.value = false)}
>
  <h2 id="about-title">About</h2>
</ModalShell>;
```

**Hook escape hatch** (custom skeletons that still want the machinery):
`useModalShell({ open, onClose, dismissible?, closeMs? })` returns
`{ mounted, closing, backdropRef, dialogRef, requestClose, onBackdropClick }`.
Render while `mounted`, add `charm-modal--closing` while `closing`, wire the two
refs and the two handlers, keep the css class names.

### CSS tokens (skin per app — never edit the css)

All on any ancestor (`:root`, `[data-theme=…]`). Fallbacks are the fleet's warm
palette — **never absolute `#fff`/`#000`**; surfaces are genuinely creamy, inks
warm near-black, borders warm sepia. Keep it that way.

```
--charm-modal-z            (9999 — the fleet modal scale)
--charm-modal-scrim        (rgba(30,23,20,.45) warm wash)   --charm-modal-blur (4px)
--charm-modal-bg           (#fbf1e4 cream)                  --charm-modal-ink  (#2b2016)
--charm-modal-border       (3px solid #3b2e25 sepia)        --charm-modal-radius (24px)
--charm-modal-shadow       (8px 8px 0 rgba(30,23,20,.16))   --charm-modal-pad  (1.5rem)
--charm-modal-open-ms      (220ms)                          --charm-modal-close-ms (160ms)
--charm-modal-ease         (spring pop cubic-bezier)
--charm-modal-close-bg / --charm-modal-close-ink / --charm-modal-close-hover-bg
```

## Vendoring recipes

**SvelteKit:**

```bash
cp -r softstack-charms/src/modal <app>/src/lib/components/modal
# ModalShell.svelte imports modal-shell.css itself — done. Skin via app.css tokens.
```

**Fresh:** islands can't import css, so the css rides separately:

```bash
cp -r softstack-charms/src/modal <app>/islands/modal
cp <app>/islands/modal/modal-shell.css <app>/static/
# <link rel="stylesheet" href="/modal-shell.css" /> in routes/_app.tsx
# (or paste the css into the app's global stylesheet — then delete the copy in islands/)
```

## Gotchas (do not reintroduce)

- **THE fill-mode-forwards juice bug** (learned on microui, documented in the
  css): `animation-fill-mode: forwards` on an _entrance_ animation permanently
  owns `transform` in the cascade and silently kills every hover/`:active`
  transform on that element forever after. Entrances here are **from-only
  keyframes + `backwards` fill**. Exits are to-only + `forwards` — exempt only
  because the element unmounts the moment the animation ends. Keep this law in
  any keyframe you add.
- **Close timing lives in CSS.** Change `--charm-modal-close-ms`, never a JS
  constant. The old fleet pattern ("must match --ds-modal-close-ms in app.css"
  comments) is exactly the drift class this shell exists to kill.
- **One modal at a time.** The scroll-lock saves/restores a single previous
  `overflow` value — stacking two open shells will fight over it. The fleet has
  no stacked modals; keep it that way before "fixing" this.
- **z-index scale:** fleet modals live at 9999; charm tooltips deliberately sit
  far below (250/400). Don't raise a charm above a modal, don't lower the modal
  under an app's own chrome.
- **No red, no alarm.** Even a destructive-confirm modal stays in the warm
  palette (fleet vibe law). And no absolute `#fff`/`#000`, ever.

---

_Seven hand-rolled shells walk into a folder. One walks out._ 🐚
