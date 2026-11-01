# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## 🎯 Project: QRBuddy

Beautiful gradient QR code generator with personality - transforms boring QR
codes into stunning gradient art pieces with soft brutal aesthetic.

## 🚀 Common Development Commands

```bash
# Start development server with hot reload
deno task start

# Format and lint code (run after changes)
deno fmt && deno lint

# Full check (format, lint, type check)
deno task check

# Explicit offline unit suite (no network permission)
deno task test:unit

# Build for production
deno task build

# Preview production build locally
deno task preview

# Update Fresh framework
deno task update
```

## 🏗 Architecture Overview

QRBuddy is a **Deno Fresh** application that generates beautiful gradient QR
codes. It follows Fresh's island architecture pattern where interactive
components are hydrated on the client while the rest remains server-rendered
HTML.

### Core Architecture Patterns

1. **Island Architecture**: Interactive components live in `/islands/` and are
   selectively hydrated on the client. Each island is a self-contained Preact
   component with its own state management via signals.

2. **Signal-Based State**: Uses Preact signals for reactive state management
   across components. Key signals:
   - `url`: The URL to encode in the QR code
   - `style`: Current selected gradient style (sunset, pool, terminal, candy,
     vapor, noir, brutalist)
   - `triggerDownload`/`triggerCopy`: Action triggers that components watch via
     useEffect

3. **Component Communication**: Islands communicate through shared signals
   passed as props from the parent route (`routes/index.tsx`). This allows
   decoupled components to react to state changes without direct dependencies.

### Key Technical Decisions

- **QR Generation**: The stage, exports, clipboard and batches all render
  through `utils/qr-renderer.ts` (`QRRenderer`), which rasterises
  `utils/qr-vector-svg.ts`. One geometry source means the Design preview, card,
  PNG, SVG and ZIP cannot drift. `qr-code-styling` remains only in
  `islands/BucketQR.tsx`.
- **Styling**: Tailwind CSS with custom theme configuration in
  `tailwind.config.ts`
- **Build**: No separate bundler configuration is needed. Development uses the
  Fresh dev server; production and preview require the Fresh AOT build from
  `deno task build`.
- **Type Safety**: TypeScript throughout with Deno's built-in type checking

### Component Responsibilities

**Route (`routes/index.tsx`)**

- Initializes all shared signals
- Orchestrates component layout
- Handles SEO meta tags

**Islands (Interactive Components)**

See GLOSSARY.md for complete list organized by category. Key islands:

- `QRCanvas`: Core QR rendering and download/copy functionality
- `SmartInput`: Smart input handling URLs, files, and plain text with dynamic QR
  options
- `StyleSelector`/`GradientCreator`: Gradient selection + custom builder entry
- `GradientCreator`: Custom gradient builder
- `LogoUploader`: Custom logo upload with drag-drop
- `EditQRForm`: Dynamic QR edit interface
- `BucketQR`: File locker display and management
- `FileSlideshow`: Destructible multi-image preview and finite-share zip
  download entry point
- `ToastManager`: Notification stacking system
- `CreateModal`: Combined QR type, options, file locker, and design sheet
- `VerticalStudio`: Interactive vertical & comparison studio (`routes/for/*`,
  `routes/compare.tsx`, `routes/vs/[slug].tsx`, and `/es/*` equivalents) with
  built-in Wi-Fi, vCard, and GS1 Sunrise 2027 Digital Link quick-builders
- `AboutModal`/`KofiModal`/`PricingModal`: Feature discovery
- `ErrorBoundary`: Error handling
- `Analytics`: Umami event tracking

**Utils & Ecosystem Plugins**

- **`utils/qr-styles.ts`**: Style definitions with gradient configurations -
  each style defines dots, background, cornersSquare, and cornersDot properties
- **`utils/qr-vector-svg.ts`**: Pure-TypeScript, zero-DOM Vector SVG 1.1 builder
  with luminance-locked palettes and Canva/Figma compliance validator. Owns the
  module and finder geometry, whole-module centre excavation, and the
  `data-ecl`/`data-cutout`/`data-center-mark` attributes tests assert on.
- **`utils/softstack-passport/`**: vendored canonical Passport module
  (`_shared-modules/passport`, local git repo). Owns SS- codes, shared identity,
  skins/palettes/avatar, `card.css` and the pure `card.html.js` renderer. Never
  edit the vendored copy alone — change canonical, re-vendor, keep the manifest
  hashes green. `card.css` is copied to `static/` at dev/build.
- **`utils/qr-design.ts`**: Stamp registry, `stampUrl()` and `resolveQRStyle()`
  — the only place palette colour and geometry are combined.
- **`utils/qr-renderer.ts`**: Browser adapter (`append`/`update`/`getRawData`/
  `dispose`) with a revision guard so a slow logo load can never paint an older
  design over a newer one.
- **`components/create-modal/DesignPreview.tsx`**: Live `Design`-tab preview,
  framed exactly like the export.
- **`utils/gs1-digital-link.ts`**: GS1 Sunrise 2027 Digital Link URI builder
  (`/01/GTIN/10/LOT/21/SERIAL/17/EXP`) and GS1 Mod-10 check-digit calculator
- **`utils/comparisons.ts`**: Bilingual (`en`/`es`), Sovereign-Voice comparison
  registry powering `/compare`, `/es/comparar`, `/vs/[slug]`, and
  `/es/vs/[slug]` (`qrio`, `qrfy`, `bitly`, `qr-code-generator`)
- **`plugins/canva-app/` & `plugins/figma-plugin/`**: Ready-to-ship Canva Apps
  SDK v2 (`addElementAtPoint` SVG vector drop) and Figma Community
  (`createNodeFromSvg`) plugin packages
- **`static/sitemap.xml` & `static/llms.txt`**: Bilingual search + LLM crawler
  indexes covering all 30 canonical EN/ES routes (+ 2 legal routes = 32 sitemap
  nodes)
- **`utils/api-request.ts`**: Shared API request helpers with automatic auth
  header injection and consistent error handling (eliminates duplicate code
  across hooks)
- **`utils/file-validation.ts`**: Client-side file validation utilities for size
  and type checking (validates before upload for better UX)
- **`utils/constants.ts`**: Application-wide constants including upload progress
  intervals, scan limits, and timing values (eliminates magic numbers)
- **`utils/api.ts`**: API configuration and authentication header helpers

### Common Patterns

**API Requests to Supabase Edge Functions**

Always use the shared `apiRequest` or `apiRequestFormData` helpers from
`utils/api-request.ts`. These automatically include authentication headers and
provide consistent error handling.

```typescript
// GET/POST with JSON
const data = await apiRequest<ResponseType>(
  `${apiUrl}/endpoint`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foo: "bar" }),
  },
  "Friendly error message",
);

// File upload with FormData
const result = await apiRequestFormData<UploadResponse>(
  `${apiUrl}/upload-file`,
  formData,
  "Upload failed",
);
```

**File Upload Validation**

Always validate files client-side before upload using `validateFile()` from
`utils/file-validation.ts`:

```typescript
const validation = validateFile(file);
if (!validation.valid) {
  throw new Error(validation.error);
}
// Safe to proceed with upload
```

**Using Constants**

Import constants from `utils/constants.ts` instead of hardcoding values:

```typescript
import { UNLIMITED_SCANS } from "../utils/constants.ts";

// Good: Named constant
if (maxDownloads === UNLIMITED_SCANS) {
  // handle unlimited case
}

// Bad: Magic number
if (maxDownloads === 999999) {
  // unclear what this number means
}
```

### State Flow Pattern

1. User interaction in an island component updates a signal
2. Signal change triggers useEffect hooks in dependent components
3. QRCanvas watches url/style signals and regenerates QR on change
4. Action signals (triggerDownload/triggerCopy) are set to true, consumed by
   QRCanvas, then reset to false

### Launch gates

`deno task check && deno task test:unit && deno task build` plus the five audit
tests are the local gate. Edge-function changes ship separately:
`supabase functions deploy …` per `supabase/README.md`; a site push does not
deploy them. The five rate-gated functions were deployed 2026-11-02; re-deploy
them whenever their code changes.

### Deployment

- **Deploy budget**: Deno Deploy allows **15 deployments per hour** on this
  plan. Rapid pushes past that are silently not built (the site keeps serving
  the last good revision). Check with
  `deno deploy deployments list --org pibulus --app qrbuddy --token "$DENO_DEPLOY_TOKEN_NEW" --non-interactive --json`
  before assuming a push is live, and space out release passes.
- **Production app**: https://qrbuddy.app
- **Deno Deploy alias**: https://qrbuddy.pibulus.deno.net
- **Supabase project ref**: `aqydpibnvlhcjcwosrti`

Fresh production uses the Git-connected Deno Deploy build. An authorized push to
`main` runs checks, the offline unit suite, then `deno task build`, which stamps
the source and generates the Fresh AOT manifest before routing. The deployment
build stops if any of those steps fail. CI also runs `deno task check`, the
explicit offline `deno task test:unit` suite, and the build; it does not deploy.
`/version.json` includes `commit`, `buildId`, and a deterministic `sourceHash`;
the source hash identifies the built source even when Git metadata is missing.

Do not upload a local checkout with `deployctl` or `deno deploy`: `_fresh/` is
generated and ignored by Git, and the Fresh Tailwind plugin requires its AOT
manifest. Keep `APP_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in the Deno
Deploy app configuration. `SUPABASE_SERVICE_ROLE_KEY` belongs only in Supabase
function secrets.

Supabase schema and function operations are separate from the Fresh app. Use the
migration preflight and function deployment commands in
[`supabase/README.md`](./supabase/README.md); skip the `_shared` helper folder
when deploying functions.

**Current Release Status (`v2.0.0 SEALED` — 2026-10-27)**:

- **The QRBuddy Passport 🛂✨** (`~$32 USD / A$49` for 365 days, no
  auto-renewal, `SQUARE_CHECKOUT_ENABLED=true`) is live on production, unified
  with local/server Library and `#passport=...` fragment QR pairing.
- **Passport Field Report 🛂** (7d/30d/90d scan analytics, Top Cities &
  Countries, 24h Peak Rush Hour, Browser split, Track/Photo Leaderboard, and
  RFC-4180 CSV export) is live on `/edit` and `/f/[code]`.
- **1080p Camera QR Scanner & Street-Safe Inspector** (`BarcodeDetector` →
  `zxing-wasm` → `jsQR` with 50% macro crop + `📸 Snap HD Photo` fallback) is
  live.
- **6-Agent Gang Audit (`Rex`, `Bumblefuzz`, `The Cryptkeeper`, `The Oracle`,
  `Stacey`, `The Simplificator`)**, Fleet Standard PWA icon set, and HTTP
  `X-Robots-Tag: noindex, nofollow` / SEO armor are deployed and verified.
- Historical Oct 13 audit snapshots live in
  [`./docs/archive/`](./docs/archive/); active launch and payment docs live in
  [`./docs/QRBUDDY-HOMEWORK-AND-MONEY-PLAYBOOK.md`](./docs/QRBUDDY-HOMEWORK-AND-MONEY-PLAYBOOK.md)
  and [`./docs/ETHICAL_PAYMENT_SETUP.md`](./docs/ETHICAL_PAYMENT_SETUP.md).

## 🎨 Design System

QRBuddy follows Pablo's "Soft Brutal" aesthetic:

- **Chunky borders**: 4px black borders with custom shadow classes
- **Warm pastels**: Cream backgrounds with gradient accents
- **Spring animations**: Squish, rotate-shuffle, and pop effects
- **Gradient & high-contrast themes**: 10 print-verified styles in `QR_STYLES`
  (`Sunset`, `Ocean`, `Forest`, `Crimson`, `Vaporwave`, `Cosmic`, `Candy`,
  `Matrix`, `Brutal`, `Classic`); 6 sit in the public gallery, the rest stay for
  easter eggs and locker pages

### Layout & Surface Rules

Spacing sits on the 8/16/32/64 grid. Established conventions — follow them when
adding surfaces:

- **Page shell**: `px-6 pt-8 pb-6` mobile, `sm:pt-12` desktop; footer
  `mt-16 py-8`. Main column `max-w-md`, `space-y-6 sm:space-y-8`.
- **QR card and input stack**: shared `max-w-[336px] sm:max-w-[360px]`, flush
  edges. Input starts 24px below the card; the Save pill hangs 12px below it,
  leaving 12px clearance. Never fade/desaturate the QR; the empty state is
  signalled by a subtle `scale-[0.97]` posture, full color always.
- **Z scale**: content ≤10 · page chrome 40–50 · modals/sheets `z-[60]` ·
  drawers `z-[70]` · toasts `z-[80]` (toasts must beat every modal).
- **Backdrop**: one recipe everywhere — `bg-[#2B1A0E]/60 backdrop-blur-sm` (warm
  espresso, not pure black — pure black over the cream page read muddy olive).
- **Interactive sheets** (CreateModal, QRReader, style gallery,
  GradientCreator): bottom sheet on mobile (`items-end`, `rounded-t-3xl`, no
  side border, `animate-slide-up`), centered card on `sm:+`
  (`sm:border-4
  border-black sm:rounded-3xl`, `sm:animate-pop-in`);
  `max-h-[92dvh]`; header/body `p-4 sm:p-6`; bottom padding respects the home
  indicator: `pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6`.
- **CreateModal footprint**: `max-w-lg`, cream card, fixed height
  `h-[min(92dvh,760px)]` / `sm:h-[min(744px,88dvh)]` so the three tabs never
  change the dialog's height; only the body scrolls (320px phones scroll the
  Design tab, 390 and up do not). Every selectable is `ChoiceRow` (`rich`
  variant for the Behavior tab): state by inversion only — active is
  `bg-amber-200 border-black shadow-chunky`, inactive `border-black/15`. No
  "Active" pills, no eyebrow tags, no dashed boxes, no tinted wrapper cards, no
  "what you just picked" header card inside a form. Inputs share one recipe:
  `border-2 border-black/15 bg-white rounded-2xl focus:border-qr-pop`. Expanding
  sub-panels (`islands/extras/*`) are all
  `bg-white border-2 border-black rounded-2xl p-4` — white on the cream card,
  never a per-feature tint. Scroll containers inside cards use `scrollbar-none`
  (styles.css) so the native track never cuts a corner radius. The tab strip is
  warm milk (`bg-amber-50`), never clinical white.
- **Info dialogs** (About/Intro/Passport/Kofi): always
  `components/modal/CardModal.tsx` — centered cream card at all sizes,
  `max-w-[440px]`, `border-3` + `rounded-3xl`, emoji badge tile centered at the
  top, circular pink `✕` top-right, same backdrop/z as sheets. The dialog is a
  non-scrolling frame and the card scrolls inside it, so the `✕` stays put. A
  face is the kit in order and sets no sizes of its own: `CardBody` (the one
  rhythm, `space-y-4 sm:space-y-5`) → `CardHeading` (title
  `text-[1.55rem] sm:text-3xl leading-[1.15]`, punchline word in `.qr-marker`,
  one pink tagline) → `.qr-pitch-lines` (intro: three plain centred lines) or
  `.qr-pitch-copy` (one sentence of why + a `.qr-pitch-list` of three) →
  `CardPrimaryButton` → `CardSignature` ("Made by Pablo ☕ in Melbourne" +
  `CardQuietLink`s). Drill-in faces open with `CardBackBar` instead of a badge.
  Copy is TalkType-length: one line per idea, no em-dash sub-clauses, no CTA
  garnish, no instructional captions, never "you"/"we". The first-visit intro
  asks for nothing. Mirrors TalkType's `tt-pitch-*` kit in `app.css` — when one
  changes, change the other.
- **Footer dock**: `islands/FooterDock.tsx` — one white capsule (About ·
  Solutions · pink bordered Supporter pill inset), never a wrap of loose pills.
  Item padding/type are `clamp()`ed so it stays one line down to 320px in both
  languages. Maker line ("Made by Pablo" → `MAKER_URL`) sits under it on phones,
  left of it on desktop. Solutions pops upward and light-dismisses. Tip Jar is
  parked (commented out). Home routes pin it to the viewport bottom edge
  (`min-h-[100dvh]` shell, `mt-auto` footer).
- **Stage tiers** (`components/smart-input/SmartInputToolbar.tsx` exports the
  tokens): everything under the QR is warm paper told apart by how far it stands
  off the page, never by colour. The QR card is the hero (`border-4`,
  `shadow-chunky-hover`). `STAGE_INPUT` = the URL bar, `border-3` + 3px sepia
  lip; the border stays `#1e1714` at rest even when valid (the ✓ does that job),
  theme accent only on focus, amber + shake on invalid. `STAGE_WELL` = recessed
  track for Static/Editable: `border-2`, creamy `#f7ecdc` ground, hairline
  inset, no outer shadow; only the active segment gets the theme tint and a
  1.5px lift; whole switch ~36px tall (`p-0.5`, segments `min-h-[30px]`). Active
  segment = raised `#fffef7` keycap; inactive stays full ink, never grey. Copy
  is the mode name only: `Static` / `Editable` + a `5 free` micro-badge in
  saturated `--qr-theme-accent`. No prose in a switch. `STAGE_TOOL_BTN` = panel
  triggers: `border-2`, 2px lip, neutral paper for all of them; the one whose
  panel is open latches down (`translate-y-[2px] shadow-none` + tint) via
  `openPanel`. `STAGE_PRESS` is the keycap physics everywhere: 70ms, hover
  `-1px`, press `+2px` and shadow 0. Cluster rhythm is one `gap-2`/`space-y-2`
  throughout.
- **Bold pigment, not nursery pastel**: the Save pill is saturated gold
  `#ffbe0b` (hover `#ffd04a`, active `#f2ac00`) with sepia text, which pops on
  every palette. Footer `Passport`, the `5 free` badge and the card's `editable`
  tag all wear saturated `--qr-theme-accent` with `#fffef7` text. Structural
  surfaces stay `#fffef7` + `#1e1714` so the pigment has a stage. Never a
  `--qr-theme-tint` wash as a CTA fill.
- **Home action row**: two chunky cream keycaps, `[Link ▾]` and `Design`,
  `grid-cols-[1fr_1.15fr] gap-2.5`, 46px tall, `rounded-2xl`, 2px sepia
  border/lip. No ink-filled hero. Inspect and History live as header icons in
  the Create sheet, opening their dialogs after closing it. Input → mode switch
  gap is 12px; mode switch → tools is 10px. Glyphs are inline monochrome SVGs
  (`StageGlyph`), never emoji. Business users and kids read the same labels; no
  mystery pill, no caption, no parenthetical. The sheet's own header names the
  open tab (`SHEET_HEADINGS`: "What the QR holds." / "How the QR behaves." /
  "How the QR looks."). Static/Editable stays in-flow between input and row.
- **Design tab** (`components/create-modal/DesignTab.tsx`): three levers only —
  palette, centre mark, card label — under a 120–136px live preview that sits
  between the tab strip and the controls. Palette is seven evenly spread cells:
  six 36–40px gradient swatches plus Custom; the active name lives in the header
  (`Palette · Sunset`). **Center mark** is five stamps, `Upload logo`, or a 1–3
  character monogram; tapping the active stamp clears it, as does the ✕ in the
  monogram cell. No None tile, no mask picker: stamps and monograms are circles,
  uploads are squircles. **Card label** is one bar holding the current text, a
  clear ✕ and a banner swatch, plus four quick-fill chips (Scan Me · Menu ·
  Wi-Fi · Guest Pass); a chip toggles back off. Chips share one recipe: `1.5px`
  sepia resting border, warm-white ground, active = 2px ink + 2px lip + accent
  dot. QRBuddy keeps its liquid matrix; there is no pattern picker. A centre
  mark forces H and excavates whole modules with a tight moat and a bold ring;
  timing, alignment and format modules stay square. H is not a licence to erase
  function patterns — dense codes omit the mark and say so. Dots/diamond
  geometry also renders at H, verified by decode sweeps, not by eye.
- **Card label geometry** (`islands/QRCanvas.tsx`): the label is a banner on top
  of the same pass — banner joins the matrix with a 2px ink divider, balanced
  `py-3`, one continuous 4px outline. Never a second box tacked below. Three
  curated looks cycle from a swatch inside the label bar: **Accent** (palette
  accent, text flips to ink above 0.42 luminance), **Ink** (`#1e1714` +
  near-white), **Paper** (cream + ink). No font or colour pickers. Tapping the
  banner dispatches `qr-edit-label`, which opens Design. Exports use the same
  banner (`createFramedSvg`, `downloadFramedPng`), so preview and download
  agree.
- **QR card liveness** (`islands/QRCanvas.tsx`): every matrix change (data,
  palette, Static↔Editable) pulses `scale(0.985)→1` over 140ms. Tapping the
  matrix copies the PNG to the clipboard and shows a cream "Copied PNG" pill for
  1.2s (browsers without image clipboard fall through to download). The Save
  pill is saturated gold `#ffbe0b`, `border-2`, 2px lip, two keycaps split by a
  sepia rule. Editable mode is shown on the artifact: a top-right `editable` tag
  in saturated accent with a pulsing near-white dot. Download toasts carry no
  emoji.
- **Top rail**: the theme pill opens a gallery — six swatches with names plus a
  full-width Custom colours row, never a blind cycle. On phones the trigger is
  swatch + ▾ only so it never collides with the wordmark. No language toggle —
  `/es` is reached via hreflang/search. No random-colour dice.
- **4xx must never be cached**: a 404 served during a deploy rollover once got
  pinned by Cloudflare for days and killed island hydration on that edge.
  Middleware forces `Cache-Control: no-store` + `CDN-Cache-Control: no-store` on
  every response ≥ 400. If an edge still holds a poisoned 404, push a new build
  (new asset hash) or purge the zone.
- **Colour gates**: `tailwind.config.ts` maps the `white` and `black` utility
  names to `#fffef7` and `#1e1714`, so legacy classes stay warm. Never write an
  absolute white/black hex, and never use `red`/`rose` families — errors are
  amber surfaces with ink text, destructive actions use muted clay `#c4607a`.
  `tests/audit_test.ts` enforces both, plus canonical coverage, robots/sitemap,
  security headers and edge-function rate gates.
- **Voice**: QRBuddy is the entity. Never "we"/"us" in UI copy.
- **Palette presets** (`utils/qr-styles.ts` + `STYLE_DISPLAY`): one family —
  pastel-punk, two-tone, the same 135° diagonal (`DIAGONAL` rad). Scannability
  floor for any preset or swatch: every dot stop ≤ 0.40 relative luminance and ≥
  2:1 against its own background. Pretty-but-pale lime/amber stops fail phone
  cameras on cream paper — don't add them. Swatch previews are always
  `linear-gradient(135deg, …)` so the grid catches the light uniformly. Gallery
  tiles are enamel badges: gradient in a black ring with a white bezel, name in
  black below, active = `bg-amber-200` inversion. Retired styles (terminal,
  brutalist) stay in `QR_STYLES` for easter eggs and locker pages but leave the
  public gallery.
- **Toasts**: bottom snackbar,
  `bottom-[max(1.5rem,env(safe-area-inset-bottom))]`, full-width flex container
  (never `left-1/2` — it caps layout width at 50vw and wraps).
- **Tap targets**: ≥44px; shadows use the `shadow-chunky` tokens (soft 25%
  black), never hard 0-blur hex shadows.
- **Show, don't tell**: no instructional captions; state changes get visual
  feedback (scale ticks, pops, haptics) instead of text.

## 📝 Development Notes

- Always run `deno fmt && deno lint` after making changes
- The QR library expects specific gradient object structures - maintain type
  compatibility
- Tailwind CSS is configured in `tailwind.config.ts` with custom theme colors
- Fresh automatically handles code splitting for islands - keep islands focused
  and minimal
- See GLOSSARY.md for complete component reference

## 🔒 Security & Performance Considerations

### Memory Management

- **Event Listeners**: Islands/hooks that attach global or document listeners
  clean up with `removeEventListener` in useEffect returns
- **Timeouts**: All setTimeout calls are short-lived (400ms-3500ms) for UI
  feedback only
- **QR Library**: QRCodeStyling instance is properly managed via refs, no memory
  leaks detected

### Security

- **File Upload Security**: Client-side validation blocks executable files and
  enforces 50MB size limit using `utils/file-validation.ts`; server functions
  validate again, with stricter per-file limits for multi-image shares
- **URL Validation**: All redirect URLs validated to prevent open redirect
  vulnerabilities (blocks javascript:, data:, file: protocols)
- **CORS Policy**: Environment-specific origins (qrbuddy.app in prod, localhost
  in dev) - no wildcard access
- **Authentication**: Supabase edge function calls include an `apikey` header
  via `utils/api-request.ts`; legacy JWT anon keys also get
  `Authorization: Bearer <jwt>`. Public QRBuddy functions have
  `verify_jwt = false` in `supabase/config.toml` because handler-level owner
  tokens, PINs/passwords, and rate limits are the real product authorization.
- **Service Role Boundary**: Client/Fresh code uses the anon key only; Supabase
  edge functions use service role secrets for database/storage/RPC access
- **Clipboard API**: Uses modern Clipboard API with proper error handling
- **Hybrid Architecture**: Static QR generation is client-side only; dynamic QRs
  and file uploads use Supabase edge functions

### Performance Optimizations

- **Islands Architecture**: Only interactive components hydrate; Fresh's build
  manifest is the current count source.
- **Signal-Based State**: Efficient reactive updates without re-renders
- **Lazy QR Updates**: QR regenerates only on url/style change via useEffect
  dependencies
- **Tailwind CSS**: Utility-first CSS with minimal runtime overhead

## ✅ Recently Completed

### "It's mine" — share ownership + stats (Latest)

Every file share (`/f/{code}`) has an owner. `upload-file` mints `owner_token`
(returned once, kept in the device's token vault under scope `"file"`, never in
the URL). On the share page, `islands/OwnerStrip.tsx` renders only when the
vault holds the token; the public never sees it.

- **Stats that help, nothing creepy.** `share-beacon` is called from the browser
  (a "view" on open, one "engagement" batch on page-hide) so the edge sees the
  visitor's real headers. `_shared/visitor.ts` turns them into
  country/city/device/os and a daily-salted network hash for daily visitor
  estimates/repeat opens — the IP is used and dropped in the same call, never
  stored. `record_share_activity` (service-role RPC) merges into
  `destructible_files.stats` (lifetime tallies) and `share_stats_daily` (90-day
  ledger, pruned by `cleanup-expired`). `utils/share-stats.ts` folds these into
  the Today / 7 days / All time trading card. Show page opens (including owner
  opens); daily visitor estimates only on Today. Weekly sums are not unique
  people. Referrer/app-source fields are not displayed: a cross-origin beacon
  sees the share page origin, not the original arrival source. Playback counts
  play starts, completion means reaching the last item, downloads are requests.
  Stats load errors show Retry; Refresh fetches current owner metadata.
- **Context that people enjoy** (`20260925010000_share_stats_context.sql`):
  languages (`accept-language`), legacy app-referrer fields (not displayed),
  farthest page open (coarse ~10 km lat/lon vs `origin_lat/lon` recorded at
  upload, haversine in SQL), night-owl / weekend reads from the hour/day
  tallies, iPhone vs Android, age + milestones. No horoscopes.
- **The noticing** (`20260925020000_share_stats_conditions.sql`,
  `_shared/conditions.ts`): each view tallies condition keys — weather, temp
  band, local time slot, moon, plus "hot mornings" / "rainy nights" combos.
  Weather is Open-Meteo (keyless), cached per ~10 km cell per UTC day in
  `weather_days` with a 7-day backfill (≤1 outbound call per cell per day).
  `utils/share-stats.ts` `patternsFor` compares observed vs a fair baseline (how
  often it actually rained where the scanners were; share of days in each moon
  phase) and only speaks at **≥20 views, ≥5 in the condition, lift ≥1.5×**.
  "Just Melbourne" stays quiet. Cross-share "Field Notes" (OkTrends-style,
  `/notes`) is the planned follow-up once real data exists.
- **Edit what it is.** `update-file`: `rename`, `retheme`, `append` (multipart),
  `remove`. Self-destructing shares are frozen to rename/retheme; append can't
  change a share's kind; max 10 items.
- **`SHARE_STATS_SALT`** must be set in edge-function secrets for "people"
  counts; without it views still count.
- The Time Machine drawer shows **👑 Manage →** on shares this device owns.

### Drop → Slideshow / Mixtape

The magic path: drop 2+ photos on the input → a shareable slideshow; drop 2+
audio files → a mixtape. Both live at `/f/{code}` (`FileSlideshow`).

- **`utils/image-prep.ts`**: photos are downscaled on the device (≤2048px JPEG)
  before upload so the 5MB-per-file multi-share cap never surfaces;
  Safari-decoded HEIC comes out as JPEG. Non-decodable files pass through.
- **Staging card** (`smart-input/FileUploadOptions.tsx`): shows the thing —
  thumbnail strip or tracklist — with an optional title and one CTA ("Make the
  slideshow ✨"). Self-destruct is tucked under a toggle.
- **`smart-input/ShareReady.tsx`**: after upload, the "it's alive" strip: Open ↗
  · Copy · Sticker (turns on the SCAN ME frame and exports the PNG).
- **Title** travels as a `title` form field to `upload-file`, stored in
  `original_name`; untitled multi-shares are named "8 photos" / "5 tracks"
  (legacy "IMG_1.jpg + 7 more" names are read as such on the page).
- **`/f/` page**: photo slideshows autoplay (4.5s, space to pause, any manual
  nav stops it) with a dot transport; playlists show a real tracklist with
  cleaned names (`prettyName`) and auto-advance.

### File Transfer Hardening (Latest)

- **Atomic Destructible Downloads**: File claims/finalization run through
  service-role-only RPCs to avoid double-spend races
- **Finite Multi-File Semantics**: Limited multi-image shares download as one
  zip; direct sub-file downloads are rejected before consuming a use
- **Locker Freshness**: Bucket pages refetch status after upload/download
  success or failure so cross-device state does not stay stale
- **Upload Progress Polish**: Upload UI switches from "Uploading..." to
  "Processing..." at 99% while server-side work completes
- **RPC Grant Lockdown**: Public `anon`/`authenticated` roles cannot directly
  execute internal file-transfer RPCs

### Dynamic QR Codes Integration

- **Anti-Scale Dynamic QRs**: Privacy-first editable redirects. Each scan logs
  coarse stats (device type/os/browser/country) to `scan_logs` for the owner's
  analytics dashboard — no IPs, no raw user agents, 90-day retention via
  cleanup-expired
- **Database Schema**: Added `dynamic_qr_codes` table with scan limits and
  expiry tracking
- **Edge Functions**:
  - Dynamic QRs: create-dynamic-qr, update-dynamic-qr, get-dynamic-qr,
    redirect-qr
  - Destructible files: upload-file, get-file, get-file-metadata, update-file,
    share-beacon
  - File lockers: create-bucket, get-bucket-status, upload-to-bucket,
    download-from-bucket
  - Supporter pass: create-checkout, square-webhook, get-license
  - R2 big files (supporter): create-upload-url, finalize-upload — presigned
    browser→R2 flow, storage paths prefixed `r2/` (see `_shared/r2.ts`)
  - System: health, cleanup-expired
- **Smart Input Enhancements**: Checkbox + options UI for scan limits
  (1/5/10/100/∞) and expiry dates
- **Edit Page**: New `/edit?token={owner_token}` route with EditQRForm island
  for changing destination/settings
- **Owner Tokens**: Stored in localStorage for edit access without user accounts
- **Redirect Route**: `/r?code={short_code}` route forwards to edge function for
  redirect logic
- **Visual Indicators**: Purple/pink "editable" badge on dynamic QRs alongside
  destructible badge
- **Interactive Islands**: Complete island architecture with modals, QR types,
  and feature discovery. See `GLOSSARY.md`; use the Fresh build manifest for the
  current generated count.

### Previous Features

- **Base Zero Achievement**: Added GLOSSARY.md, updated README with accurate
  tech stack
- **Twind→Tailwind Migration**: Migrated from deprecated Twind to stable
  Tailwind CSS
- **Destructible Files**: Self-destructing file uploads with KABOOM explosion
  page
- **Early Islands**: GradientCreator, copy-to-clipboard, error handling, toast
  notifications
- **Mobile Dev Config**: Added --host 0.0.0.0 flag for mobile testing on local
  network

## Delegating substantial work

Pablo's preference (13 October 2026): before substantial new implementation,
provide paste-ready prompts and commands for his own external `agy` or `claude`
sessions. Specify the repo/branch, file ownership, acceptance checks, and the
commit/diff/evidence to return. Keep this session focused on coordination,
review, and release judgment. Do not present in-session sub-agents as a separate
quota pool. Avoid overlapping edits between sessions.
