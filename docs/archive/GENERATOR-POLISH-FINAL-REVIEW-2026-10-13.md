# Generator polish — final local review

**Decision: generator-polish package approved locally.** This supersedes the
generator-specific HOLD decisions in GENERATOR-POLISH-REVIEW and
GENERATOR-POLISH-RECHECK. No commit, push, deployment or paid-offer changes were
performed. This is not a new review of every pre-existing media/backend change
in the combined working tree.

## Final integration fix

The corrected SVG helper measures uppercase caption text, but QRCanvas supplied
an override measured from the raw input. Twelve lowercase `w` characters were
measured at 966px and then exported as uppercase `W`, which measured 1164.73px
and clipped outside the 1128px SVG.

Removed the redundant measured-width override from `downloadSvg`. The helper now
owns normalization and measurement consistently. This was the only application
edit made during the final review.

## Independent checks

- Offline suite: **72 passed, 0 failed, 1 ignored**.
- `deno task check`: passed after the integration fix.
- `deno task build`: passed after the integration fix; 33 routes, 57 islands.
- `git diff --check`: passed.
- Ran the external `scratch/verify_review_correction.js` successfully against
  the local AOT preview. Its scope qualifications below still apply.
- Ran the external artifact decoder successfully: all ten existing review files
  were present and decoded to its expected destinations/prefixes.
- After rebuilding, independently exported four SVGs via the actual Design
  controls: twelve lowercase w characters, thirteen accented Ws, thirteen CJK
  ideographs, and SCAN ME. Opened/rasterized each standalone SVG and measured
  caption bounds. The three wide captions occupy x=64..1064 exactly; SCAN ME
  remains 425.33px wide without stretching.
- All four newly exported/rasterized SVGs decoded to the exact input URL
  `https://example.org/qrbuddy-final-review`.
- Held a real FileReader operation pending, clicked the actual Reset design
  button, then released the read and awaited loadend. Logo remained empty and
  the file input was cleared.
- Replaced `Storage.prototype.setItem` with a throwing implementation, clicked
  frame/size/reset controls and confirmed **three intercepted failing writes**.
  UI reset completed without page errors.
- Used a fresh browser context and blocked the first decoder WASM load before
  navigation. Confirmed two aborted fetch attempts, then successfully exported a
  PNG while the warning stayed hidden. This establishes graceful unavailable
  decoder behaviour, not successful scan validation.
- Confirmed the test-only `smart-input-set-last-share` production listener is
  gone. The external test uses a locally intercepted upload response.

## Evidence and limits

Independent script and artifacts:
`.playwright-mcp/final-generator-review/verify.cjs`, `results.json`, exported
SVGs, rasterized captions and `decoder-unavailable.png`. The script supports
`--decoder-only` to rerun the fresh-context failure test independently.

Two review-script selectors were corrected to use the actual Design tab role and
accessible reset/download controls. Selector failures were not counted as
application defects or successful checks.

The external suite's rapid edits are a UI smoke test, not controlled proof of
out-of-order decoder completions. Its original late WASM interception could miss
a cached module, and its quick logo reset did not establish a pending read; the
independent fresh-context and held-FileReader checks above cover those two
conditions. The independent throwing-storage check also counts actual failures.

Physical printing, phone-camera scanning and cross-engine font rendering remain
unverified. Local upload interception does not prove production media delivery.
Do not turn these bounded results into claims of universal scannability or
whole-product release readiness.
