# Generator polish correction recheck

Decision: **HOLD: caption containment is still incomplete and verification
claims still exceed what the scripts exercise.** No application changes made in
this review. No monetisation changes are implied by this work.

## Confirmed progress

- Independently ran `deno task test:unit`: 69 passed, 0 failed, 1 ignored.
- Own-property preset checks and nested gradient structure checks now address
  the original `constructor` and string-valued `colorStops` reproductions.
- Independently measured the original 16-W SVG caption in Chromium: width
  1000px, bounds 64–1064. The short SCAN ME caption remains unstretched.
- The revised script contains genuine clicks for export size, export buttons,
  Reset design and the fixture's Sticker button. Those are improvements over the
  first script. This review did not rerun its full suite.

## Remaining issues

### Caption estimation still allows valid text to be clipped

`utils/svg-export.ts` replaces one glyph-width estimate with another. Glyphs
outside its table can still exceed the caption bounds without `textLength`.
Direct Chromium measurements of SVGs produced by the current helper:

| Caption         |   Width |   Left |   Right | textLength |
| --------------- | ------: | -----: | ------: | ---------- |
| 13 copies of Ŵ  | 1261.95 | -66.98 | 1194.98 | absent     |
| 13 copies of 照 | 1200.80 | -36.40 | 1164.40 | absent     |

Both are within the 24-character input limit. The whole SVG is 1128px wide; the
intended caption area is x=64 through x=1064. Both are clipped. Do not keep
expanding a hand-maintained glyph table; use actual measurement and bounded
vector text geometry. A short caption must retain its natural measured width,
not expand to fill the entire frame.

### Browser evidence still contains ineffective checks

In `scratch/verify_review_correction.js`:

- The rapid-edit test writes localStorage repeatedly. DesignPreferencesSync
  reads storage on mount and does not subscribe to these writes. These are not
  live style changes and do not establish overlapping decoder completions.
- The decoder-unavailability test only evaluates `null === false`; no decoder is
  made unavailable and no application path is exercised.
- The blocked-storage test installs a throwing setter, immediately returns true,
  then restores it. It performs no application operation while blocked.
- The section mentioning in-flight logo reset performs no logo selection/reset
  scenario.

Replace these with actual application tests or explicitly mark them untested. Do
not call JavaScript expression checks or untouched UI a passing flow.

### Colour-validation description is inaccurate

`isValidColor` accepts any nonempty string up to 50 characters. It is not the
hex/RGB validator described in the handoff. `not-a-colour` is accepted. A local
browser probe did not reproduce a crash for that particular value, so this is
not claimed as a confirmed renderer crash. Validate supported colour syntax
properly; preserve HSL values used by the existing dice roller, plus existing
hex/alpha and other supported generated forms.

### Keep fixture machinery outside the application

The correction added an always-on `smart-input-set-last-share` listener in
SmartInput solely for the verification suite. It changes the live destination
and published-share state. Remove this test-only production behaviour; use an
isolated fixture harness or intercept the normal upload response locally. This
is a scope/maintainability correction, not a claimed remote exploit.

## External follow-up prompt

```text
Read CLAUDE.md and docs/GENERATOR-POLISH-RECHECK-2026-10-13.md.
Make the narrow corrections in that recheck. Preserve all existing work.

1. Replace hand-estimated caption widths with actual measured, bounded vector
   text geometry. Test 13 accented Ws and 13 CJK characters as well as the
   previous captions. Keep short captions at their natural width. Do not add
   more special cases to the glyph table. Match PNG/SVG sizing deliberately.
2. Make colour validation match supported generated colour syntax, including
   the dice roller's HSL colours; reject arbitrary invalid strings.
3. Remove the production smart-input-set-last-share test hook. Test the actual
   share flow with a locally intercepted upload response or isolated harness.
4. Correct rapid-edit, decoder-unavailability, storage-failure and in-flight
   logo-reset tests to exercise application behaviour. Make assertions fail the
   process. If not implemented, clearly mark the check untested in the report.

Primary scope: utils/svg-export.ts, utils/design-preferences.ts, QRCanvas's
caption integration, removal of SmartInput's fixture-only handler, focused
tests, local browser scripts and the results document. No feature expansion,
pricing/hosting/backend changes, commits, pushes or deployments.

Run check, offline unit tests, build, and relevant local browser verification.
Return exact evidence and limitations. Update the results document to remove
the unsupported claims. Leave work uncommitted for review.
```
