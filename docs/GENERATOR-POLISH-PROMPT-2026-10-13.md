# QRBuddy generator polish — external implementation prompt

Paste the following into the external implementation session. This is the first
implementation package; paid hosting is a subsequent package.

```text
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.

Implement this bounded generator improvement. Read CLAUDE.md first. Preserve
QRBuddy's compact, colourful design and all existing user data.

BASELINE AND OWNERSHIP

Expected starting branch: main. Inspect git status and diff before editing;
the working tree contains another session's uncommitted media/accessibility
improvements. Preserve them. Do not reset, stash, reformat unrelated files,
switch branches, commit, push, deploy, or change backend configuration.
Do not run alongside another session editing these files.

Primary scope:
- islands/QRCanvas.tsx
- islands/create-modal/DesignTab.tsx
- routes/index.tsx and routes/es/index.tsx for minimal shared-state wiring
- A small design-preference helper and client island/hook if necessary
- Focused export/preference helpers and tests if necessary

Conditional scope:
- islands/LogoUploader.tsx only for a demonstrated export-quality issue
- utils/qr-decode.ts only for a reproduced verification defect
- islands/CreateModal.tsx only for minimal prop wiring; it is already dirty.
  Preserve its existing media-discovery changes and report your exact addition.

No pricing, checkout, retention, custom slugs, named brand-kit library, history
schema changes, or paid-feature copy in this package. Keep all changes free.

1. EXPORT THE DESIGN PEOPLE ACTUALLY MADE

PNG currently renders at a fixed 1000px QR size. SVG uses the library's raw
download and omits the selected frame.

- Make SVG include the enabled frame and caption, matching the PNG design.
  Keep QR modules, frame and caption as vector content; do not disguise a
  rasterised QR as SVG. An uploaded raster logo can remain raster.
- Preserve gradients, corner styling, logo placement and quiet space. Ensure
  SVG gradient/clip references survive composition and the file opens alone.
- Handle empty captions, the existing maximum caption length, accented text,
  and XML characters safely. Use safe XML construction, not unescaped markup.
  Keep text inside the frame with a deliberate font fallback strategy.
- Add a compact PNG size choice in the existing Design export area: 1000,
  2000, 3000 px, defined as the final image's longest edge. Default to 1000.
  Scale frame, spacing and typography proportionally; render at the requested
  resolution rather than enlarging the existing bitmap.
- Keep the home card's dimensions/performance unchanged. Explicit Design-tab
  exports use the selected size; existing quick-download/sticker actions
  retain a sensible default and their existing content/theme ownership.
  Prevent global export events from downloading multiple mounted QR cards.
- Remove the stale SVG "no frame" tooltip. Report success only after export
  generation and download initiation succeed; handle failures consistently.
  Do not claim the file was saved to disk, which the browser cannot confirm.
- Check logo quality in exported examples. Current normalization is 400px;
  do not call every raster logo defective or add a full SVG import pipeline.
  Make a bounded quality fix only if a realistic example demonstrates need.

2. REMEMBER THE LAST DESIGN, LOCALLY

- Restore the last selected palette/custom gradient, normalized logo, frame
  setting/caption and PNG size on the next visit, for both home languages.
- Use one versioned, validated preference record. Persist presentation only:
  no destination, Wi-Fi credentials, contact contents, owner keys, uploaded
  media or entitlement data. Leave History and its storage keys untouched.
- Respect Fresh island hydration: restoration/persistence must run in client
  islands, not depend on route-component effects. Restore before autosaving
  defaults; avoid overwriting an interaction with a late asynchronous restore.
- Limit stored logo size and validate saved settings. Malformed, obsolete,
  unavailable or full storage must leave the generator usable. Do not remove
  other application data to free space or repeatedly toast storage failures.
- Add one small "Reset design" action in Design. It restores the normal
  default palette, removes logo/frame/custom gradient and resets export size.
  It does not clear content, History, pass, media or ownership. Reload must
  preserve that reset. Ensure resetting is not undone by an old upload callback.
- Persist preferences only from the main generator; viewing someone else's
  share or creating its sticker must not overwrite the user's saved design.
- Follow established copy/localisation conventions, with accessible controls
  and touch targets. Keep the homepage layout intact.

3. VERIFY THE EXISTING SCAN WARNING

QRCanvas already calls checkQRScannability on the actual rendered canvas
after URL, style, custom-gradient and logo changes. Do not add a second scanner.

- Exercise a normal preset, a deliberately unreadable custom style, recovery
  to readable colours, and rapid consecutive edits. Check that only the
  current rendered result controls the warning.
- Check decoder failure/unavailability. An unknown result is not proof of
  scannability. Never claim a software check guarantees camera/print success.
- Fix reproduced readiness/stale-result problems with deterministic render
  readiness and cancellation, not added arbitrary sleeps or retries.
- If the existing behaviour is sound, leave it alone and return evidence.

VERIFICATION

Format touched files, then run:
  deno task check
  deno task test:unit
  deno task build

The unit task explicitly lists files. If you add focused tests, run them
explicitly and include the command, or deliberately wire them into the task.
Useful tests cover preference validation/storage failures and SVG escaping;
do not add tests that merely repeat constant values.

Use a local browser, with builds completed before browser verification:
- Export and open actual framed/unframed PNG and SVG files, with/without
  logo and with preset/custom colours. Inspect dimensions and caption bounds.
- Decode representative exported files to the expected content, including
  framed SVG rasterised for the decoder. Check all PNG size choices.
- Verify all export entry points, including a media sticker. Do not create
  production fixtures merely to test local export behaviour.
- Reload with custom design/logo/frame; reset and reload; test malformed,
  blocked and quota-exhausted preference storage. Existing data must survive.
- Check mobile 320/375px and desktop, keyboard operation and both home routes.
- Verify the scan-warning scenarios above and retain representative evidence.

If browser/tools are unavailable, state exactly which checks remain unverified.
Do not substitute a passing build for export/browser proof. Physical phone
scanning and printed output remain separate checks unless actually performed.

HANDOFF

Return a concise summary, the exact files changed by this session, tests run
with outcomes, exported artifact/screenshot paths, and any limitations.
Distinguish your diff from the pre-existing dirty work. Add a brief verification
record at docs/GENERATOR-POLISH-RESULTS-2026-10-13.md. Leave the work uncommitted
for review; report it as implemented locally, not shipped.
```
