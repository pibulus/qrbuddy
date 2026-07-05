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
