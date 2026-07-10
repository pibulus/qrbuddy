# 🔥 Fable Audit — 2026-07-06

Final-quality launch-readiness pass on branch `fable-audit-2026-07-06` (5
commits on top of `main`@`c5093c0`). Verified after every commit: `deno fmt` ✓ ·
`deno lint` ✓ · `deno check` ✓ (0 errors) · tests 23/23 ✓ · `deno task build` ✓.

**⚠️ The edge-function fixes are LOCAL ONLY. They do nothing in prod until you
redeploy the Supabase functions** (`supabase functions deploy`, per CLAUDE.md).
The Fresh frontend also needs its usual `deployctl` deploy. I did not deploy
anything (per the rails).

---

## What changed, ranked by launch impact

### 1. 🚨 "NO tracking/analytics" was a false claim (docs fixed; product call is yours)

`redirect-qr` logs coarse per-scan stats to `scan_logs` (device type, OS,
browser, country, city — from Cloudflare headers) to power the owner's
AnalyticsDashboard. No IPs, no raw user agents — genuinely privacy-respecting —
but README, GLOSSARY, CLAUDE.md, and the function's own header comment all said
**"NO tracking/analytics"**, which was flatly untrue. For a brand built on
"SOFTWARE IS POLITICS" honesty, that's the #1 thing to get right before launch.

**Fixed:** all docs + the code comment now say what actually happens. **Your
call:** if you want the claim to be literally true instead, rip out the
scan_logs insert + AnalyticsDashboard. I kept the feature and fixed the words.
Note: `.launch-hints.yaml` (untracked) still carries the old "NO
tracking/analytics" line — update it if you keep marketing from it.

### 2. 🔒 Edge-function hardening (`182dad8`) — needs redeploy to matter

- **Locker retry lockout**: `download-from-bucket` claimed the download slot but
  never released it on failure — a transient storage error locked one-time and
  ping-pong lockers for a full minute against the user's own retry. Now mirrors
  `get-file`'s release-on-failure pattern.
- **Orphaned blobs**: a multi-file upload that failed partway left the earlier
  files in storage with no DB row — invisible to `cleanup-expired`, orphaned
  forever. Now rolled back in the catch.
- **Silent expiry bypass**: `expires_at` was stored unvalidated; an unparseable
  date produces `Invalid Date`, every comparison against it is `false`, so the
  QR **never expires** — a security control silently no-oping. Create + update
  now reject bad dates with 400. Same treatment for `max_scans` (a `-5` bricked
  the QR on scan one) and unknown `routing_mode` values.
- **cleanup-expired gaps**: it never touched `dynamic_qr_codes` (expired QRs
  only deactivate lazily on scan) or `scan_logs` (unbounded growth, forever).
  Added: deactivate expired QRs + 90-day scan-log retention.
- **Time routing NaN**: garbage `startHour`/`endHour` in routing config made
  every scan route "inactive" via NaN comparisons. Now clamped 0–23/24 with 9–17
  fallback.
- **Malformed JSON → 400** (was 500) in all five JSON-body functions.

### 3. 🐛 Client crash in the core flow (`c154e2c`)

`SmartInput`'s history effect called `new URL(url.value)` unguarded. Repro:
create a dynamic QR (sets `editUrl`), then type plain text — **throws on every
keystroke** and spams the history drawer with partial entries. Now skips
unparseable values. Also removed a stray `// ... (lines omitted)` AI-editing
artifact in QRCanvas.

### 4. 🧹 Dead code −81 lines (`4a3cb50`)

Removed exports with zero call sites anywhere: `getRandomStyle`,
`addHapticToElement`, `addSoundToElement`, the `hasProAccess`/`canUseFeature`/
`PRO_FEATURES` cluster, three orphaned `UPLOAD_PROGRESS_*` constants.
`FileSlideshow` now imports jszip via the import map instead of a hardcoded
esm.sh URL (different module URL = the browser could load the lib twice).

### 5. 📝 Docs truth pass (`0f9ebdf`)

- **7 gradient styles, not 6**: `noir` ("Classic" in the picker) existed in code
  but no doc admitted it. Fixed in README ×3, GLOSSARY ×2, CLAUDE.md ×2, TINKER
  ×3 (incl. stale cheat-sheet line numbers).
- docs/README.md counts: 40 islands (not 41), 12 TSX routes (not 11), 3 test
  files (not 2). tests/README.md now lists `logic_test.ts`.
- GLOSSARY gains the missing utils (haptics/history/sounds) + a Hooks section.
- create-dynamic-qr's rate-limit comment said 20/hr; code enforces 10/hr.

---

## Deliberately left alone (and why)

- **PricingLink / openPricingModal** — provably unreferenced, but it's the
  parked pricing feature: one uncomment in `routes/index.tsx:250` from live,
  waiting on a Lemon Squeezy URL (`PRICING_TIERS.pro.paymentUrl` is `""`).
  Removing it would undo intent. (Heads-up: as shipped, `PricingModal` renders
  but nothing can open it.)
- **Short-code TOCTOU** in create-dynamic-qr/create-bucket — the check-then-
  insert race exists but the DB UNIQUE constraint makes the worst case a rare
  500, ~1-in-billions odds at current keyspace. Not worth churn now; a
  retry-on-unique-violation would be the fix if codes ever collide.
- **`@preact/signals-core` import-map entry** — no direct import anywhere, but
  it likely pins the transitive version for `@preact/signals`. Left it.
- **`get-bucket-status` selecting `password_hash`** — used for the owner-token
  compare path, never returned to clients (verified). Trimming the select is
  micro-optimization, skipped.
- **`validationState === "invalid"` UI in SmartInput** — unreachable (the
  validator accepts any non-empty text), so the red shake/error never fires.
  Harmless; removing it is cosmetic churn.
- **Hard-deleting old inactive dynamic QRs** — product decision (owners can
  reactivate via edit), so cleanup only _deactivates_ expired ones.

## Known risks / next steps for Pablo

1. **Redeploy the 8 changed edge functions**, then run the integration tests
   with env set (`tests/edge-functions_test.ts`, `remediation_test.ts` — they
   auto-skip offline; the 23 that ran are the pure-logic suite).
2. Decide the analytics stance (keep coarse stats + honest copy, or remove
   logging and restore the "NO analytics" claim).
3. `.launch-hints.yaml` still says "NO tracking/analytics".
4. Real-phone smoke pass was already on your list from the design pass — still
   the right last mile before launch.

## Commits on this branch

```
0f9ebdf docs: 📝 truth pass — 7 styles, honest analytics wording, real counts
4a3cb50 chore: 🧹 kill provably-dead code, normalize jszip import
182dad8 fix: 🔒 edge function hardening — claim release, blob rollback, write-time validation
c154e2c fix: 🐛 guard history effect against non-URL input, drop stray artifact comment
```

(+ this audit doc. Safety stash `fable-audit-safepoint WIP` left intact on the
stash list — contains nothing beyond `.launch-hints.yaml`, which is also still
in the working tree.)

---

# 🔥 Fable Audit, Session 2 — 2026-07-10

Focus: Create-modal cognitive ergonomics + end-to-end verification of every QR
mode (text cards, media share, destructible files, dynamic QRs, lockers). Five
parallel tracing agents read every client → hook → edge-function path; the
headline flows were then driven live in a browser against the dev server.
Verified: `deno task check` ✓ · tests 23/23 ✓ · live smoke of the staged-upload
panel, restructured modal, and editable-text hint.

**⚠️ Redeploy needed: `get-dynamic-qr`** (now returns `splash_config`). Nothing
else server-side changed. Fresh frontend needs its usual `deployctl` deploy.

## The two big finds (both were headline features, both broken)

1. **Self-destruct was unreachable.** The download-limit picker only rendered
   mid-drag, outside the drag-listening DOM, and unmounted on drop — physically
   unclickable. Every dropped file uploaded with the unlimited default. Fixed by
   staging files on drop/pick: filename + size + limit picker (∞/1/3/5/10, reset
   each time) + Create QR/Cancel. Client validation now runs before the options
   step.
2. **"Share a file" never presented media.** The bucket pages it creates were
   download-only (no `<img>`/`<video>`/`<audio>` anywhere in BucketQR); the
   inline preview component (FileSlideshow) belongs to the destructible `/f/`
   route. Fixed both ways: every piece of copy that overpromised was corrected,
   AND bucket pages now offer 👁️ Preview for image/video/audio on open
   (keep-file) lockers — the only mode where a download is non-destructive.
   PIN-locked buckets preview too: metadata is redacted pre-unlock, so the media
   check keys off the response Content-Type, with a graceful fall-back to
   download for non-media (e.g. PDFs). Ping-pong and one-shot lockers
   deliberately get no preview (it would consume the content).

## Create modal restructure

Options tab presented five sibling rows with hidden, inconsistent mutual
exclusion (rotation↔limits wiped each other; intro wiped nothing; "Editable"
showed inactive whenever any add-on was on). The backend never required this —
create/update/redirect all compose limits + rotation + splash correctly. Now:
Static vs Editable binary, with rotation/limits/intro as independent add-ons
under "Editable extras". All cross-wiping deleted. Tooltip question resolved: no
hover tooltips — inline one-line descriptions (the existing ChoiceRow pattern)
are the right mobile-first answer; deeper explanation lives inside each expanded
panel.

## Other fixes in this session

- **Typing-clobber bug**: Editable mode auto-created a text bucket after a 1.2s
  pause and overwrote further typing with the note URL (silent infinite retry on
  failure). Auto-create is now URL-only; text cards are explicit via Create →
  Plain text (hint added under the input).
- **Splash edit parity**: intro pages were uneditable/invisible on /edit;
  get-dynamic-qr now returns splash_config and EditQRForm can view/edit/clear
  it.
- **Dead code**: routes/r/[code].tsx + routes/go.tsx (unfinished free/pro tier
  concept keyed on an X-QRBuddy-Tier header no function sets) deleted.
  LogoSettings wrapper island deleted. BucketQR text-card theming referenced
  styles that don't exist (ocean/neon/forest) — replaced with all 7 real ones.
- **Truth pass leftovers**: index.tsx SEO meta said "6 gradients" ×4 (it's 7);
  edit page said "No tracking, no analytics" directly under the analytics
  dashboard; locker page said reusable lockers "refill after each download"
  (wrong for ping-pong); "Disconnect locker" only forgets locally (renamed +
  explained); MediaHubForm's "persistent, secure locker" is a download page, and
  "replace anytime" would be false (uploads to full buckets are rejected).
  `.launch-hints.yaml` analytics line fixed. Island/route counts: 39/11.
- **Copy unification**: file shares say "downloads" end to end (DB/RPC
  language); QR links keep "scans". WiFi type got the same copy voice as its
  siblings. MediaHubForm got client validation + a visible error line (failures
  were haptic-only).
- **Listener race**: smart-media-create handler re-registered on every style
  change (dropped-event window) — now registered once.
- **Slideshow themes were dead**: FileSlideshow's page theming switched on
  "b&w"/"retro"/"cyber" — style names that don't exist — so every real style
  except sunset fell to the default dark look. Now keyed to the real 7 (terminal
  keeps the green-glow look, noir the mono look, brutalist the cream card;
  pool/candy/vapor get tinted backdrops).
- **PIN flow reviewed**: server-side verified solid (salted-hash storage,
  POST-body-only transmission, gates both upload and download, owner-token
  bypass for the creator's own device). The MediaHubForm CORS failure was used
  as a live test of the new error display — it renders.

## Deliberately left alone

- **`local-api/server.ts` mock drift** — no routing/splash support, non-atomic
  scan counts. Anyone testing dynamic features against it will see phantom bugs.
  Rewrite or label before next dynamic-QR work.
- **Sequential rotation exhaustion** serves the last URL forever (no boom).
  Reads as intentional (last-URL-as-landing-page); confirm before launch copy
  promises otherwise.
- **PIN keypad duplication** (LockerSettings + MediaHubForm render the same
  12-key pad inline) — a shared `<PinPad>` would save ~80 lines; cosmetic.
- **UNLIMITED sentinel duplicated** client (`utils/constants.ts`) and server
  (`upload-file`) as separate 999999 literals — agree today, no shared import
  path across the deploy boundary; left with this note.
- **PricingModal orphan** — unchanged from session 1 (parked product intent).
- **Bucket preview can't be E2E-tested from localhost** — deployed edge
  functions only allow the qrbuddy.app origin (correct security posture), so the
  👁️ Preview button needs one real-phone check after deploy: share an image with
  a PIN, unlock, preview.

## Commits (session 2)

```
4d84401 feat: 💅 CreateModal ergonomics — honest Static/Editable binary, composable extras
aecaa70 fix: 🐛 make self-destruct reachable — stage files before upload
9f5ce2b fix: 💅 locker + file-page truth pass — copy matches what the server does
f4db59b chore: 🧹 delete dead free/pro tier routes, fix stale meta claims
d93e914 feat: ✨ intro-page parity on the edit page
```

(+ this docs commit.)

---

# 🔍 Addendum — QR Reader + market notes (2026-07-10, later)

## QR Reader shipped

New `QRReader` island (40 islands now): decode a QR from a dropped image, a
pasted screenshot (⌘V), or the camera — solving "the QR is on my screen and my
phone is in the other room." jsQR via esm.sh (pure, no worker files to break
under Deno/esm.sh; mini-qr's dual html5-qrcode + qr-scanner stack was the
cautionary tale). Type detection (link/WiFi/vCard/SMS/email/tel/text), WiFi and
vCard parsed into pretty rows (mini-qr only shows raw strings — leapfrogged),
Open restricted to http/https, and the signature move stolen from mini-qr's best
idea: **"🌸 Remake it beautiful"** prefills the input so an ugly scanned QR
comes back as a gradient one. Dropping an image on the main input that is itself
a QR offers "read it instead" in the staging panel. Verified live: generated a
QR, screenshotted it, fed it back, decoded, bloomed. Camera path needs a
real-device check (Playwright has no webcam; permission errors fall back to
drop/paste with clear copy).

Bonus from the steal list: error correction auto-bumps Q→H when a center logo is
set (logos hide modules; nobody should have to know that).

## Market notes (for the Pro decision)

2026 dynamic-QR SaaS pricing: QR Tiger $7/mo, Uniqode $9–399/mo, Flowcode
$250+/mo; typical small-business spend $5–15/mo forever. The industry's core
dark pattern: **cancelling the subscription deactivates printed codes** —
customers pay in perpetuity because their signage is hostage. QRBuddy's
counter-position is already designed (docs/ETHICAL_PAYMENT_SETUP.md: $49
lifetime via Ko-fi/Lemon Squeezy; PricingModal parked one uncomment away). Free
tier already includes what they paywall (dynamic QRs, templates, logos,
analytics); the doc reserves bulk/SVG/no-branding for Pro — note SVG export is
trivially available via qr-code-styling when wanted.

## mini-qr steal list — status after the pro-pack pass

Shipped (`ee24662`): ✅ SVG export (Design tab) · ✅ caption frames baked into
PNG downloads · ✅ style dice — with a luma-aware lightness clamp, because the
built-in reader caught rolls whose finder patterns washed out (yellows/greens
read far lighter than blues at the same HSL lightness) · ✅ WiFi/vCard RFC
escaping · plus multi-scale decoding in utils/qr-decode.ts (full-res stylised
QRs previously failed jsQR at native size — 640/1024/400px attempts fixed frames
and photos alike).

Still on the shelf (ranked, all optional):

1. Dot/corner shape pickers in GradientCreator (qr-code-styling supports it).
2. ASCII/Unicode QR export (terminal aesthetic; needs raw-matrix lib).
3. Save/load design as JSON.
4. PWA/offline (static generation is already client-side).

What QRBuddy does better (from the same audit): gradients (they dropped them),
all server-backed features (dynamic/destructible/lockers/analytics), history,
payload weight, and now scan-result parsing.
