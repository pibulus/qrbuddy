# Generator polish review — 13 October 2026

Decision: **HOLD for two reproduced fixes and corrected browser evidence.** The
direction and scope remain sound. No application files changed in this review.

## Independently checked

- `deno task test:unit`: **64 passed, 0 failed, 1 ignored** using the actual
  offline task (`--allow-env`), not the unrestricted command quoted in the
  implementation report.
- Reviewed the export, preference, reset, integration and CSP diffs, supporting
  helpers, tests, browser script and implementation report.
- Started the existing local Fresh AOT preview and reproduced preference
  failures in isolated Playwright Chromium pages. Normal defaults produced one
  QR canvas; the two invalid records below produced zero.
- Generated an SVG directly with the current helper and measured its caption
  bounds in Chromium using `getBBox()`.
- This was targeted verification, not a new full build, device/print test or
  review of all pre-existing media changes.

## Findings

### 1. Saved preference validation accepts values that break rendering

`utils/design-preferences.ts:41` uses `in`, accepting inherited keys such as
`constructor`. Lines 48–56 only check that custom dots/background are objects;
nested gradients are unchecked and then cast to `QRStyle`.

Set `qrbuddy_design_prefs` to either record and reload:

```json
{ "version": 1, "style": "constructor" }
```

```json
{
  "version": 1,
  "style": "custom",
  "customStyle": {
    "dots": { "gradient": { "colorStops": "bad" } },
    "background": { "color": "#fff" }
  }
}
```

The first produced a page error
(`Cannot read properties of undefined (reading
'join')`) and no QR canvas. The
second displayed “Oops! QR Machine Broke” and no QR canvas. Both records pass
the new validator. Malformed saved state can therefore keep breaking the
generator on subsequent visits.

Use own-property preset checks and bounded validation/normalization for the
actual custom-style shape, including gradient stops, offsets, colours, enums,
angles and corner settings. Invalid custom data should restore safe defaults.
Preserve legitimate GradientCreator and style-picker-generated designs.

### 2. Valid wide captions are clipped in framed SVG

`utils/svg-export.ts:42–53` only constrains text width when a character-count
estimate exceeds the available width. Wide glyphs evade that estimate.

For `WWWWWWWWWWWWWWWW` (16 characters, below the 24-character UI limit), the
current helper creates 92px text with no `textLength`. Chromium measured:

- Text width: **1553.58px**.
- Left/right bounds: **-212.79 / 1340.79px**.
- Entire SVG width: **1128px**; intended caption area is 1000px wide.

PNG uses `fillText(..., maxWidth)` and constrains it, so the formats disagree.
Constrain actual SVG caption geometry with a dependable font/fallback strategy;
do not rely solely on character-count averages. Preserve normal short captions
without stretching them unnecessarily. Test wide glyphs, accents, XML-sensitive
characters, empty captions and the maximum length in a standalone SVG.

### 3. Browser evidence overstates what the script exercises

In `scratch/verify_generator_polish.js`:

- `rapid_consecutive_edits` is assigned a literal PASSED value; no edits or
  controlled overlapping completions are performed.
- Reset removes localStorage and dispatches an event; it does not click the
  Reset design control, contrary to the implementation report.
- The sticker check dispatches a generic export for the default homepage QR; it
  does not exercise ShareReady's actual button or prove a share destination.
- Export tests dispatch events directly rather than exercising size controls and
  download buttons. All artifacts use the default homepage URL.
- Several checks record FAILED/WARNING strings without failing the process.
- Fixed sleeps are used for hydration/scan readiness. Decoder unavailability,
  real rapid edits and blocked storage are not established by these checks.
- The stated `verification-browser-summary.json` was absent from the artifact
  directory at review time. Existing screenshots and decoding-summary.json are
  present; those are useful but narrower evidence.

Repair the verification and its report. Do not represent inferred behaviour or
synthetic event checks as actual user-flow proof.

## External correction prompt

```text
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.
Read CLAUDE.md and docs/GENERATOR-POLISH-REVIEW-2026-10-13.md.

Correct the two reproduced issues in that review:
1. Reject/normalize inherited preset names and malformed nested custom styles
   before restoring preferences, preserving all valid generated custom designs.
2. Keep framed SVG captions inside the actual caption area, including sixteen
   W characters, while matching the PNG result as closely as practical.

Primary scope: utils/design-preferences.ts, utils/svg-export.ts,
tests/generator_polish_test.ts, and the browser verification scripts/report.
Touch QRCanvas only if necessary for dependable caption measurement/integration.
Preserve all pre-existing work. No pricing/backend/hosting changes, commits,
pushes or deployment. Do not expand this into another audit or redesign.

Add meaningful regression checks for both failures. Correct the browser suite:
- Click actual Design controls, change size, export, reset and reload.
- Use a distinct test URL and verify the exported QR contains that exact value.
- Exercise actual ShareReady sticker interaction with an isolated local fixture
  and verify its destination and that stored design preferences are unchanged.
- Exercise overlapping edits/check completions and unavailable decoder results;
  do not mark a scenario PASSED without performing it.
- Exercise malformed nested preferences, blocked/full storage, and reset during
  an in-flight logo selection. Preserve unrelated History/owner/pass data using
  sentinel records in the correct existing keys.
- Use deterministic readiness/completion conditions rather than fixed sleeps.
- Failed assertions must fail the command. Decode checks must compare expected
  content, not merely find any readable QR.

Run deno task check, deno task test:unit and deno task build, then the corrected
local browser checks. Open/rasterize standalone SVGs and assert caption bounds
as well as QR decoding. Keep mobile and both home routes covered.

Update GENERATOR-POLISH-RESULTS-2026-10-13.md to distinguish verified, inferred
and untested claims and give commands/results plus existing artifact paths.
Use .playwright-mcp/ for new disposable review artifacts; do not delete the
earlier evidence. No physical-device or print guarantees from Chromium.

Return the scoped diff summary, verification results and remaining limitations.
Leave everything uncommitted for review.
```
