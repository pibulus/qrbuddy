# Generator Polish Verification Results (2026-10-13)

## 1. Executive Summary

This report documents the implementation and verification of the QR generator
polish work package (`docs/GENERATOR-POLISH-PROMPT-2026-10-13.md`) and the
subsequent resolution of findings from both review passes
(`docs/GENERATOR-POLISH-REVIEW-2026-10-13.md` and
`docs/GENERATOR-POLISH-RECHECK-2026-10-13.md`).

The work encompasses three core pillars and four follow-up corrections:

1. **Accurate Vector SVG & Scaled PNG Exports**: Native vector framed SVG
   generation with nested coordinate spaces, XML escaping, typography font
   fallbacks, text length bounds, and `<defs>` preservation. Scaled PNG geometry
   at native 1000px, 2000px, and 3000px heights. Deduped export events and
   honest completion toasts.
2. **Local Design Preferences**: Versioned, schema-validated localStorage
   persistence (`qrbuddy_design_prefs`) with prototype pollution guards and deep
   nested gradient validation, restoring styles across reloads and across `/`
   and `/es` routes. Safe "Reset design" button with in-flight upload
   cancellation.
3. **Scan Warning Verification**: Automated scannability analysis
   (`checkQRScannability` via `/zxing_reader.wasm`) with deterministic warnings,
   clean recovery, tokenized debounce cancellation on rapid edits, and safe
   fail-open handling when decoders are unavailable.
4. **Follow-Up Corrections Pass**:
   - **Caption Containment Across All Scripts**: Replaced hand-maintained glyph
     approximations with dynamic Canvas 2D measurement in browser environments
     and standard Unicode decomposition (NFD) / East Asian wide-character
     advance metrics in headless environments (`measureCaptionWidth()`). Wide
     captions—including 13 accented `Ŵ` characters, 13 CJK `照` ideographs, 16
     `W`s, and 24-character strings—scale font down and constrain geometry
     (`textLength="1000" lengthAdjust="spacingAndGlyphs"`). Short captions (e.g.
     `"SCAN ME"`) retain base 92px font without `textLength`, preventing
     artificial letter stretching. SVG and PNG export font sizing and geometry
     match deliberately.
   - **Supported Colour Syntax Validation**: Replaced arbitrary string
     acceptance with strict syntax validation in `isValidColor()`. Supports Hex
     (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`), RGB/RGBA, HSL/HSLA (preserving
     the style dice roller's HSL format), and named keywords (`transparent`,
     `black`, `white`). Rejects arbitrary strings (`not-a-colour`, `bad`, etc.).
   - **Removed Test Hooks from Production**: Removed the test-only
     `smart-input-set-last-share` listener from `islands/SmartInput.tsx`. The
     test suite now exercises the actual share creation flow by intercepting
     `/upload-file` locally during real file staging and confirmation.
   - **Real Application Browser Testing**: Replaced simulated checks with real
     UI tests: live SmartInput rapid sequential edits testing debounce
     cancellation; live `/zxing_reader.wasm` abort testing fail-open decoder
     unavailability; in-flight logo upload cancellation testing
     `↺ Reset design`; and live UI interactions testing storage under throwing
     `QuotaExceededError`.

All existing uncommitted changes in the repository were preserved. All changes
remain uncommitted locally for review.

---

## 2. Exact Files Changed / Created

### New Files Created

- `utils/design-preferences.ts`: Schema validation, prototype key rejection
  (`Object.prototype.hasOwnProperty`), deep gradient validation, strict colour
  validation (`isValidColor`), logo length limits (`250_000` chars), storage
  quota/corruption handling, and reset helpers.
- `utils/svg-export.ts`: `escapeXml()` utility, `measureCaptionWidth()` with
  browser Canvas 2D measurement and Unicode NFD / East Asian fallback, and
  `createFramedSvg()` vector generator using nested SVG coordinate viewports and
  adaptive font scaling.
- `islands/DesignPreferencesSync.tsx`: Client hydration island managing initial
  preference restoration and debounced synchronization.
- `tests/generator_polish_test.ts`: 17 focused offline unit tests covering
  preference validation, prototype keys, malformed gradients, strict colour
  syntax (Hex, RGB, HSL, keywords, invalid rejection), legitimate custom styles,
  SVG caption geometry across Latin, accented glyphs (13 `Ŵ`), CJK ideographs
  (13 `照`), short captions, XML escaping, and storage resilience.
- `scratch/verify_review_correction.js`: Playwright browser test suite
  exercising actual UI clicks, distinct URLs, live share upload flow with
  intercepted `/upload-file`, live rapid edits, live decoder wasm abort,
  in-flight logo reset, blocked storage, viewports, and standalone SVG
  `getBBox()` measurements.
- `scratch/decode_review_artifacts.ts`: Automated Deno decoding script verifying
  review artifacts using `npm:zxing-wasm@2.1.2/reader`.
- `.playwright-mcp/review-artifacts-2026-10-13/`: Directory containing
  review-specific export artifacts, rasterized SVGs, screenshots, and JSON audit
  logs.
- `docs/verification-artifacts-2026-10-13/`: Historical verification artifacts
  preserved intact.

### Modified Files

- `islands/QRCanvas.tsx`:
  - Synchronized `downloadFramedPng` and `downloadSvg` to use
    `measureCaptionWidth` matching font sizing and text bounds.
  - Unified `getQrOptions(renderSize)` helper with `typeNumber: 0 as const`.
  - Scaled PNG export geometry for target longest edge (1000/2000/3000px).
  - Implemented `downloadSvg` with framed vector SVG generation via
    `createFramedSvg`.
  - Added export event deduplication guard (`_handled` check and
    `preventDefault()`).
  - Updated completion toasts to trigger honestly only upon download generation
    completion.
- `islands/create-modal/DesignTab.tsx`:
  - Added segmented button selector for PNG export size (1000 / 2000 / 3000px).
  - Removed stale "no frame" tooltip on the SVG export button.
  - Removed premature trigger toasts on export buttons.
  - Added accessible "↺ Reset design" button that resets signals, clears
    storage, and dispatches `qr-design-reset`.
- `islands/LogoUploader.tsx`:
  - Added `uploadGenRef` generation tracker and `qr-design-reset` listener to
    cancel in-flight `FileReader` and `Image` callbacks upon reset or file
    removal.
- `islands/smart-input/ShareReady.tsx`:
  - Dispatched `qr-export` with `frameOverride` for media sticker downloads,
    leaving user design preferences untouched.
- `islands/CreateModal.tsx`:
  - Passed `customStyle` and `pngSize` down to `DesignTab`.
- `islands/SmartInput.tsx`:
  - Wired `pngSize` and `customStyle` props into `CreateModal`.
  - Cleaned of all test-only hooks (`smart-input-set-last-share` completely
    removed).
- `routes/index.tsx` & `routes/es/index.tsx`:
  - Initialized `pngSize` signal (`1000`), mounted `<DesignPreferencesSync />`,
    passed props into `SmartInput`.
- `routes/_middleware.ts`:
  - Added `data: blob:` to Content-Security-Policy `connect-src` so
    `QRCodeStyling`'s internal fetch of data URL logos does not violate CSP.
- `deno.json`:
  - Registered `tests/generator_polish_test.ts` in `deno task test:unit`.

### Pre-Existing Working Tree Files (Preserved Intact)

- `hooks/useQRData.ts`
- `islands/EditQRForm.tsx`
- `islands/FileSlideshow.tsx`
- `islands/OwnerStrip.tsx`
- `islands/edit-qr/RoutingConfigForm.tsx`
- `islands/smart-input/FileUploadOptions.tsx`
- `tests/logic_test.ts`
- `utils/history.ts`

---

## 3. Test Suites & Commands Run

### 1. `deno task check`

- **Command**:
  `deno fmt --check && deno lint && deno check **/*.ts && deno check **/*.tsx`
- **Result**: Passed cleanly across 269 files and islands with 0 lint and 0 type
  errors.

### 2. `deno task test:unit`

- **Command**:
  `deno test --allow-env tests/logic_test.ts tests/license_test.ts tests/inAppBrowser_test.ts tests/peek_test.ts tests/r2_test.ts tests/rate_limit_test.ts tests/dynamic_qr_preview_test.ts tests/square_test.ts tests/generator_polish_test.ts`
- **Result**: `ok | 72 passed | 0 failed | 1 ignored (363ms)`
- **Unit tests in `tests/generator_polish_test.ts` (17 total)**:
  1. `escapeXml - escapes XML special characters safely`: ok
  2. `createFramedSvg - unframed/empty caption generates correct vector card without text`:
     ok
  3. `createFramedSvg - caption inclusion, styling, and safe XML escaping`: ok
  4. `createFramedSvg - short caption has 92px font and NO textLength stretching`:
     ok
  5. `createFramedSvg - wide caption (WWWWWWWWWWWWWWWW) scales font and constrains textLength`:
     ok
  6. `createFramedSvg - long caption (24 chars) scales font and adds length constraint`:
     ok
  7. `createFramedSvg - 13 accented Ws (Ŵ) scale font and constrain textLength`:
     ok
  8. `createFramedSvg - 13 CJK ideographs (照) scale font and constrain textLength`:
     ok
  9. `measureCaptionWidth - Unicode-aware measurement handles accents, CJK, and Latin`:
     ok
  10. `isValidColor - validates supported generated formats and rejects invalid strings`:
      ok
  11. `validateDesignPreferences - rejects prototype properties (constructor, toString)`:
      ok
  12. `validateDesignPreferences - rejects malformed nested customStyle (e.g. colorStops: 'bad')`:
      ok
  13. `validateDesignPreferences - preserves legitimate custom styles from GradientCreator and dice roller`:
      ok
  14. `validateDesignPreferences - invalid types, obsolete versions, and defaults`:
      ok
  15. `validateDesignPreferences - valid preferences with all fields`: ok
  16. `validateDesignPreferences - bounds logo length and truncates long captions`:
      ok
  17. `Storage resilience - simulated localStorage quota and corruption handling`:
      ok

### 3. `deno task build`

- **Command**: `deno task stamp && deno run -A dev.ts build`
- **Result**: Passed. Fresh manifest generated for 33 routes and 57 islands.
  Assets written to `_fresh`.

---

## 4. Recheck Findings & Resolution Verification

### Finding 1: General Caption Containment & Deliberate Sizing

- **Fix**: Replaced hand-maintained regex tables with `measureCaptionWidth()`:
  - In browser contexts: Uses offscreen Canvas 2D `ctx.measureText()` with exact
    font
    (`900 ${fontSize}px "Inter Black", Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).
  - In headless contexts: Uses Unicode NFD decomposition (attaching zero advance
    width to combining marks, giving accented glyphs like `Ŵ` the base width of
    `W`) and standard East Asian wide character metrics (giving CJK ideographs
    like `照` 1.01 em).
  - Scaled font size down whenever measured width exceeds 1000px:
    `Math.max(38, Math.floor(baseFontSize * (1000 / measuredWidth)))`.
  - Added `textLength="1000" lengthAdjust="spacingAndGlyphs"` exclusively when
    text exceeds available width.
  - Short captions (e.g. `"SCAN ME"`) omit `textLength` and keep 92px font to
    preserve natural letter spacing.
- **Chromium Standalone SVG `getBBox()` Measurements**:
  - `WWWWWWWWWWWWWWWW` (16 wide chars):
    - `x: 64, y: 1126, width: 1000, height: 70, right: 1064, fontSize: '58', hasTextLength: true`
      (contained).
  - `ŴŴŴŴŴŴŴŴŴŴŴŴŴ` (13 accented Ws):
    - `x: 64, y: 1117.5, width: 1000, height: 87, right: 1064, fontSize: '72', hasTextLength: true`
      (contained).
  - `照照照照照照照照照照照照照` (13 CJK ideographs):
    - `x: 64, y: 1115, width: 1000, height: 92, right: 1064, fontSize: '76', hasTextLength: true`
      (contained).
  - `SCAN ME` (short caption):
    - `x: 351.34, y: 1105.5, width: 425.33, height: 111, right: 776.66, fontSize: '92', hasTextLength: false`
      (natural width, no stretching).
  - `123456789012345678901234` (24 chars max):
    - `x: 64, y: 1126, width: 1000, height: 70, right: 1064, fontSize: '58', hasTextLength: true`
      (contained).
  - `CAFÉ <&> MÚSICA` (accents & XML entities):
    - `x: 142.90, y: 1105.5, width: 842.20, height: 111, right: 985.10, fontSize: '92', hasTextLength: false`
      (contained).
  - Empty caption `""`:
    - No `<text>` node rendered.

### Finding 2: Strict Colour Validation

- **Fix**: Replaced string-length check with strict format parsing in
  `isValidColor()`:
  - Hex: `/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/`
  - RGB / RGBA:
    `/^rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i`
  - HSL / HSLA:
    `/^hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i`
    (supports dice roller)
  - Keywords: `/^(?:transparent|black|white)$/i`
- **Result**: Validated across unit tests: accepted `#fff`, `#12345678`,
  `hsl(120, 65%, 45%)`, `rgba(...)`, `transparent`; rejected `not-a-colour`,
  `bad`, `""`, `#zzz`, `hsl(bad)`.

### Finding 3: Removal of Test Hooks from Production Code

- **Fix**: Completely removed `smart-input-set-last-share` and its event
  listener from `islands/SmartInput.tsx`.
- **Verification**: In `scratch/verify_review_correction.js`, the test stages a
  file in SmartInput's file input, intercepts `**/upload-file` returning
  `{ url: "https://qrbuddy.app/f/sticker-fixture-9876", ... }`, clicks the
  genuine "Create QR" button in `FileUploadOptions`, confirms `<ShareReady />`
  appears naturally, clicks the actual "Sticker" button, verifies download
  content, and confirms user design preferences (`matcha`, `2000px`) were not
  mutated.

### Finding 4: Actual Application Browser Suite

- **Rapid Overlapping Edits**: Typed 4 sequential inputs (`rapid-edit-1`,
  `rapid-edit-2`, `rapid-edit-3`, `final-settled-link`) into live SmartInput
  with 60ms intervals. Verified that debounce cancellation dropped intermediate
  renders, the final check settled after 700ms, and no warning badge lingered.
- **Live Decoder Unavailability**: Aborted `/zxing_reader.wasm*` network
  requests via Playwright, typed into SmartInput, waited 1200ms. Verified
  `checkQRScannability` caught WASM failure and returned `null`, and the UI
  remained clean without the warning badge (fail-open).
- **In-Flight Logo Selection Reset**: Selected a logo image in LogoUploader,
  immediately clicked `↺ Reset design`. Verified that the in-flight read was
  discarded, `logoUrl` remained empty, the file input was reset, and the design
  reset toast appeared.
- **Blocked Storage During Live Actions**: Monkeypatched `localStorage.setItem`
  to throw `DOMException("QuotaExceededError")`. Performed live actions: clicked
  frame toggle, clicked 2000px export size, clicked `↺ Reset design`. Verified
  operations proceeded smoothly with 0 uncaught errors.

---

## 5. Classification of Claims & Boundaries

### A. Verified User Flows (Direct UI Interaction & Measurement)

- Actual UI clicks for export size (1000/2000/3000px), framed PNG export, framed
  SVG export, and `↺ Reset design`.
- Distinct URL (`https://qrbuddy.app/correction-distinct-...`) verified in
  exported PNGs and rasterized SVG via `zxing-wasm`.
- Real file upload flow via intercepted `/upload-file`, `<ShareReady />`
  rendering, and Sticker download verification.
- Live rapid input debounce invalidation and clean settling.
- Live `/zxing_reader.wasm` abort verifying fail-open warning state.
- In-flight logo upload reset cancellation.
- Standalone SVG Chromium `getBBox()` measurements across 7 caption scenarios.
- Responsive layouts: 320px (0px horizontal overflow), 375px mobile, 1280px
  desktop, `/es` route.

### B. Inferred Behavior (Software Simulation)

- Storage quota exhaustion simulated by monkeypatching `localStorage.setItem` to
  throw `QuotaExceededError`.
- Server upload backend simulated via Playwright local route fulfillment of
  `/upload-file`.

### C. Explicit Untested Limitations

- Physical printing, paper reflectance, ink bleed, and scanning with physical
  mobile cameras were not tested.
- Sub-pixel font layout was verified in Chromium; minor rendering variations may
  occur on WebKit/Gecko.

---

## 6. Review Artifacts & Verification Table

Disposable review artifacts are saved in
`.playwright-mcp/review-artifacts-2026-10-13/`:

| File                                   | Type           | Dimensions / BBox       | Decoded Content (`zxing-wasm`)               | Match Status |
| -------------------------------------- | -------------- | ----------------------- | -------------------------------------------- | ------------ |
| `clicked-framed-3000.png`              | Framed PNG     | 2607x3000               | Distinct test URL                            | **PASSED**   |
| `clicked-framed-2000.png`              | Framed PNG     | 1738x2000               | Distinct test URL                            | **PASSED**   |
| `clicked-framed.svg`                   | Vector SVG     | 1128x1298               | Rasterized to PNG                            | **PASSED**   |
| `clicked-framed.svg.raster.png`        | Rasterized SVG | 1128x1298               | Distinct test URL                            | **PASSED**   |
| `share-ready-sticker.png`              | Sticker PNG    | 869x1000                | `https://qrbuddy.app/f/sticker-fixture-9876` | **PASSED**   |
| `svg-caption-16w.svg`                  | Standalone SVG | 1000px width (16 `W`s)  | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-13w-circumflex.svg`       | Standalone SVG | 1000px width (13 `Ŵ`s)  | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-13cjk.svg`                | Standalone SVG | 1000px width (13 `照`s) | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-short.svg`                | Standalone SVG | 425px width ("SCAN ME") | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-24char.svg`               | Standalone SVG | 1000px width (24 chars) | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-accents.svg`              | Standalone SVG | 842px width (Accents)   | `https://qrbuddy.app`                        | **PASSED**   |
| `svg-caption-empty.svg`                | Standalone SVG | No caption text node    | `https://qrbuddy.app`                        | **PASSED**   |
| `01-malformed-prefs-safe-fallback.png` | Screenshot     | 1280x800                | Default sunset canvas rendered               | **PASSED**   |
| `review-desktop.png`                   | Screenshot     | 1280x800                | Desktop viewport                             | **PASSED**   |
| `review-mobile-375px.png`              | Screenshot     | 375x667                 | Mobile viewport                              | **PASSED**   |
| `review-mobile-320px.png`              | Screenshot     | 320x568                 | Compact mobile (no overflow)                 | **PASSED**   |
| `review-spanish-home.png`              | Screenshot     | 1280x800                | Spanish `/es` home                           | **PASSED**   |

Historical verification artifacts in `docs/verification-artifacts-2026-10-13/`
remain preserved intact.

---

## 7. Commands to Reproduce Verification

```bash
# 1. Format check, lint, and type check
deno task check

# 2. Run unit test suite (72 tests)
deno task test:unit

# 3. Compile AOT Fresh build
deno task build

# 4. Start local preview server (in a separate terminal)
PORT=8004 deno task preview

# 5. Run corrected browser test suite
NODE_PATH=$(npm root -g) node scratch/verify_review_correction.js

# 6. Run artifact barcode decoder
deno run -A scratch/decode_review_artifacts.ts
```

All 6 commands succeed with exit code 0.
