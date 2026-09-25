# Cult Code audit — qrbuddy

Three passes of `/ritual`, ~25 agent runs, one night. Every file:line below was
re-verified by hand after the agent reported it; agent line numbers drifted ±3
and are corrected here. Branch: `cult/full-ritual`.

Test suite went 37 → 38 (the ritual wrote one). `deno fmt`, `deno check` and
`deno test -A tests/` green at every commit.

---

## 🔴 Still open — needs a human

### 1. `SUPPORTER_CURRENCY` — cosmetic, but it's the storefront lying

`supabase/functions/_shared/square.ts:35` defaults to `"AUD"`. Ten route files
advertise `"priceCurrency": "USD"` in JSON-LD and `routes/es/menus.tsx:45`
states "$49 USD / $499 MXN". $49 AUD ≈ $32 USD.

**Not an entitlement bug.** `_shared/license.ts:53-58` defines
`SupporterPayload` as `{tier, v, iat, exp}` — the licence token carries neither
amount nor currency, and `requestHasValidPass` gates every real limit on
tier+expiry alone. Nobody gets more or less for paying in the wrong currency.

**→ Check the Square dashboard (Locations → currency), then either set
`SUPPORTER_CURRENCY` to match the storefront, or fix the eleven places that say
USD.** Now documented in `.env.example` with the constraint from `square.ts:34`
(it must match the Square location or the API rejects the payment link).

### 2. ~~`SQUARE_ENVIRONMENT` fails open to live money~~ (Fixed ✅)

`supabase/functions/_shared/square.ts:10` now requires
`SQUARE_ENVIRONMENT === "production"` to hit `connect.squareup.com`. Unset,
misspelled, or `"sandbox"` safely defaults to `connect.squareupsandbox.com`.
Documented in `.env.example`.

### 3. Two live forks of auth code across edge functions

`_shared/bucket-auth.ts` is documented as canonical and has one importer
(`create-upload-url`). `upload-to-bucket/index.ts` carries an inline fork of
`sha256Hex`/`verifyOwnerToken`/`verifyPassword`; `download-from-bucket` forks
`sha256Hex`/`verifyPassword`. **Byte-identical today** — verified — with nothing
enforcing that a future security fix reaches all copies.

A third fork: `normalizeUrl` exists in `utils/url.ts` (client, fixed this pass)
and privately inside `create-dynamic-qr/index.ts` and
`update-dynamic-qr/index.ts`, neither with the host:port carve-out.

**→ Edge functions in one Deno Deploy project can share local imports across
function directories.** Collapsing these into `_shared/` takes the fork count
from three to one (client vs edge), which is the honest floor for this
architecture.

### 4. `validatePhone()` accepts anything non-empty

`types/qr-templates.ts:210`. Reproduced by executing it:

```
validatePhone({phone:"🎸🔥💀"})     → null  (valid)
formatPhone({phone:"🎸🔥💀"})       → "tel:🎸🔥💀"
formatPhone({phone:"a".repeat(200)}) → "tel:aaaa…" (200 chars)
```

Left unfixed deliberately: how permissive an international phone field should be
is a product call, not a drive-by regex.

### 5. Smaller, flagged not fixed

- `hooks/useBucketStatus.ts:47` sends `owner_token` as a **GET query param**,
  landing a bearer credential in edge-function access logs. `BucketQR.tsx:252`
  actively strips that same token from the visible URL, so the instinct exists.
  Fix needs `get-bucket-status` to read a header, as `utils/api.ts:145` already
  does with `x-qrb-pass`.
- `_shared/rate-limit.ts:14` is in-memory per-isolate: `create-checkout`'s
  5-per-15-min is 5-per-region and resets on cold start.
- `cleanup-expired/index.ts:36` compares the cron bearer with `!==`, not a
  timing-safe compare, unlike the Square webhook's HMAC path.
- `tailwind.config.ts` has no `black`/`white` keys, so every `bg-black` resolves
  to literal `#000`, against the warm-palette house law. App-wide; needs a
  design-token decision, not a find-replace. **Note:** `text-yellow-300` on
  `#000` measures 15.93:1 (AAA) — re-check contrast before any palette swap.
- `islands/RotatingTitle.tsx` auto-updates indefinitely with no pause control
  (WCAG 2.2.2, Level A).
- `islands/HistoryDrawer.tsx` has Escape + `aria-modal` + initial focus but no
  Tab-cycle focus trap.
- `routes/note/[code].tsx` and `routes/bucket/[code].tsx` have no `og:image` or
  `twitter:card` at all — deliberate privacy choice, or oversight?
- Sovereign-voice violations: `routes/bucket/[code].tsx:102` ("Your persistent
  file locker"), `islands/extras/TimeBombSettings.tsx:54` ("You can change both
  anytime from your edit link").

---

## ✅ Fixed this ritual

**Crashes**

- `routes/q.tsx` — `URIError` 500ing the public share page on any target URL
  containing `%`. `searchParams.get()` already decodes; the second
  `decodeURIComponent` received malformed input. Guarded with `safeDecode()`
  rather than removing the decode, because `?d=` links are minted outside this
  codebase and may be double-encoded. **Shipped to `main` separately as
  `eeb2e09`.**
- `islands/QRCanvas.tsx:238` — `getCurrentStyle()` returned `undefined` for any
  style key not in `QR_STYLES`, and three call sites read `.dots` off it.
  Reachable from four mount paths. Now falls back to `QR_STYLES.sunset`.
- `routes/f/[code].tsx`, `routes/bucket/[code].tsx` — query strings built as
  `?id=${code}` with no `encodeURIComponent`. `r.tsx` already did it correctly.

**Resilience**

- `routes/_500.tsx` created — did not exist. Unhandled throws served Fresh's raw
  stack trace to strangers mid-scan.
- `islands/ErrorBoundary.tsx` rendered raw `error.message` for any throw; now
  only for sanitized `ApiError`.
- `routes/bucket/[code].tsx` was the only one of five fetch routes with no
  try/catch.
- `utils/api.ts` gained `fetchWithTimeout` (AbortSignal 8s), wired into the four
  control-plane fetches. **Deliberately not** the file download, preview, or R2
  presigned fetch — those responses _are_ the file body, and a deadline there
  would kill slow-network transfers.
- `BucketQR` and `FileSlideshow` wrapped in `ErrorBoundary`; the homepage QR
  preview had three boundaries and the upload/payment path had none.
- Two clipboard handlers fired success toasts without awaiting or catching.

**Correctness**

- `utils/url.ts` `normalizeUrl("example.com:8080")` returned unchanged — the
  scheme regex can't tell `https:` from `example.com:`. `EditQRForm` and
  `useDynamicQR` feed dynamic-QR routing destinations through it, so host:port
  destinations saved silently unusable. Fixed with a port heuristic (a scheme is
  never followed by only digits) so `mailto:`/`tel:`/`sms:`/`geo:` still
  survive. **Covered by a new test.**
- `routes/r.tsx` forwarded client headers now capped at 500 chars —
  `scan_logs.city` is unbounded `TEXT`.
- Locker `title`/`creator`/`description` were rendered via bare `as string`
  casts; bucket content is filled by whoever holds the code.

**Structure**

- `components/VerticalLandingHead.tsx` — 703 lines of byte-identical `<Head>`
  collapsed out of 8 landing pages. Added reciprocal `hreflang`, which did not
  previously exist.
- `islands/BucketQR.tsx` 1116 → 826, extracting two hooks, two components, a
  theme map and a shared type. Upload/download/preview handlers deliberately
  left inline.
- Dead `@keyframes bounce-slow` removed; a drifted `.animate-fade-in` override
  deleted; `.animate-pulse-glow` deliberately kept (Tailwind's glows pink, the
  buttons are red).

**Surface**

- `og:image` on `routes/q.tsx` and `routes/f/[code].tsx` pointed at a stale
  pre-rebrand placeholder with no QR on it. Every shared QR link and file link
  unfurled wrong in iMessage/WhatsApp. Now `og-card.png`.
- `boom.tsx` — "KABOOM!" overflowed its card at 375px.
- `qr-scrim` (#2B1A0E, the app's existing warm-black token, used in 10 files)
  applied to the two `bg-black` surfaces that never got it.
- Touch targets: the "add rotating link" editor exists twice; the create-flow
  copy had 44px targets and the edit-flow copy had a bare `px-2` destructive
  delete with no label.
- `<main>` + skip-link on `VerticalStudio` (propagates to 8 pages); PIN keypad
  given a live region; destructive download warning wired via `aria-describedby`
  so it's announced at focus; `prefers-reduced-motion` respected by
  `RotatingTitle`'s JS-driven cycling.

**Incidental**

- `fresh.gen.ts` was **22 entries stale** — missing `es/*`, `for/*`, the
  redirect stubs and two islands that all exist as files. `deno task build`
  regenerates it so this was latent, not live. Found only because one agent
  started the dev server; fourteen agents had read past it, because a stale
  generated file looks exactly like a valid one.

---

## The pattern underneath

Nine separate findings, different agents, different territories, one shape: **a
value or safety pattern that exists correctly in one place and never reached its
siblings.** og:image, currency, animation timing, `encodeURIComponent`,
try/catch, the `qr-scrim` token, touch targets, `sha256Hex`, `normalizeUrl`.

The structural cause is that **this app's deploy boundary is also a code
boundary** — `supabase/functions/*` are isolated Deno Deploy bundles and cannot
import from `utils/` or `types/`. Where a value must stay identical across that
seam, there is no shared-import path, so a copy is the only mechanism and drift
is only a matter of time.

The line worth holding: `islands/modal/` is duplicated _on purpose_ — a
copy-per-app charm, self-contained, shared with sibling apps. That's correct
duplication, and it has no shared truth to drift from. Defective duplication
always does.

---

_Generated by [Cult Code](https://github.com/pibulus/cult-code). Every finding
verified by hand, not taken on the agent's word — two agents stated things
confidently and wrongly, and both were caught that way._
