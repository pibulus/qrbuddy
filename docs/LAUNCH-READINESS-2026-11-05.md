# QRBuddy — launch readiness audit (2026-11-05)

> Written overnight from the code, the running dev server, the live production
> deployment, the Supabase project (`aqydpibnvlhcjcwosrti`), the docs, and four
> independent audit passes. Every claim below names the command or file that
> proves it. Where a doc and a probe disagree, the probe wins.

## 0. Verdict

**Soft/closed beta: ready today.** Core generation, design, downloads, clipboard
copy, history, and the paid checkout configuration all work.

**Public "we are launched": 2–4 focused days.** Four things stand between here
and an honest launch:

1. Production is a stale build (six commits behind, including a security fix).
2. The paid Library feature is switched off in production.
3. One identity weakness is live: the server trusts a bare Passport UUID and
   never checks the secret the client sends.
4. No one has recorded a completed paid fulfillment end to end, and the Passport
   recovery path is manual.

None of these are rewrites. Three are one env var / one deploy / one guard.

---

## 1. The branches (what each one is doing)

| Branch                   |  Commits | Status               | What it is                                                                                                                                                                                                          |
| ------------------------ | -------: | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main` (= `origin/main`) |      449 | **Production**       | Last commit `62f15f2` (2026-11-02 07:15 +1100). Built to production on 2026-11-01T20:15Z (same instant, UTC).                                                                                                       |
| `passport-card`          | 450 (+1) | Unmerged             | `0dcf360` — Passport modal real icon + trim, shared card parity doc. Cosmetic.                                                                                                                                      |
| `analysis/deep-dive`     | 455 (+6) | **Launch candidate** | `0dcf360` + cross-app token rejection (`69d1122`), History payload summarization (`f1fd783`), 44px banner hit area (`3276c4f`), History icon follow (`2cfebe5`), fmt (`25186ae`). Includes 170+ lines of new tests. |
| `feat/qrbuddy-passport`  |      367 | **Stale ancestor**   | Oct 14 snapshot; `git merge-base --is-ancestor feat/qrbuddy-passport main` = YES. Fully merged. Not a third line of work.                                                                                           |

So there is one live line, one cosmetic branch, and one integration branch
carrying real fixes. The integration branch is the one to ship.

---

## 2. What is verified working

| Check                                               | Result                                                                                                                                    | Evidence                                           |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Unit suite                                          | **137 passed, 0 failed, 1 ignored**                                                                                                       | `deno task test:unit`                              |
| Lint                                                | clean                                                                                                                                     | `deno lint` → `Checked 237 files`                  |
| Typecheck                                           | clean                                                                                                                                     | `deno check …`                                     |
| CI                                                  | green                                                                                                                                     | `gh run list` — latest `success` 2026-11-01T20:15Z |
| Build                                               | green locally                                                                                                                             | `deno task build`                                  |
| Production routes                                   | `/`, `/es`, `/privacy`, `/terms`, `/developers`, `/v1/ping`, `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/version.json` all **200** | curl sweep                                         |
| Health                                              | database up, ~154 ms                                                                                                                      | `GET …/functions/v1/health`                        |
| Payments configured                                 | `GET …/functions/v1/create-checkout` → `{"available":true}`                                                                               | live probe                                         |
| PNG download                                        | 929,956 bytes, magic `89504e47`, valid PNG                                                                                                | Playwright QA                                      |
| SVG download                                        | 61,135 bytes, valid `<svg>`                                                                                                               | Playwright QA                                      |
| Copy PNG                                            | clipboard contains `image/png`; “Copied PNG” pill                                                                                         | Playwright QA                                      |
| Modal keyboard trap                                 | 36 Tabs, 0 escapes; Shift+Tab wraps; Escape closes                                                                                        | Playwright QA                                      |
| Double-submit guards                                | dynamic QR, upload, checkout, email, sync import                                                                                          | code review                                        |
| Design system audit                                 | no `#fff`/`#000`, no red/rose, canonical/head, robots/sitemap, security headers, rate gates                                               | `tests/audit_test.ts`                              |
| `file_buckets` live RLS                             | **only** “Service role can do everything” (`auth.role() = 'service_role'`)                                                                | live `pg_policies` query                           |
| `api_keys`, `scan_log_rollups`, `share_stats_daily` | tables exist and contain rows                                                                                                             | live REST checks                                   |
| `cleanup-expired`                                   | calls `purge_old_scan_logs`; rollups exist (3 scans, Aug)                                                                                 | code + live table                                  |

---

## 3. Launch blockers, verified

### B1. Production is a stale build (P0, cheapest to fix)

Live `/version.json`:

```json
{
  "commit": null,
  "buildId": "x9scdcrrhmxy",
  "sourceHash": "58f6…",
  "built": "2026-11-01T20:15:37Z"
}
```

`built` 2026-11-01T20:15Z = `main` HEAD `62f15f2` (2026-11-02 07:15 +1100). Six
commits are **not** live: `0dcf360`, `69d1122`, `f1fd783`, `3276c4f`, `2cfebe5`,
`25186ae`.

The most important one is `69d1122` (**reject Passport tokens stamped for
another app**). All four SoftStack apps sign with the same secret, so a TalkType
token carries a valid QRBuddy signature. Until functions are redeployed, a token
minted for another app can open QRBuddy's paid gates. This is a licensing bypass
sitting in git, not in production.

`commit: null` is expected on the Deno lane (no `.git` in the archive);
`sourceHash` is the real identity. The docs' claim that `/version.json` includes
a commit is false on this lane.

### B2. The paid Library is switched off in production (P0, product decision)

`FEATURE_PLUS_LIBRARY` is unset. Consequences, verified:

- `GET …/functions/v1/library` → `404 {"error":"FEATURE_DISABLED"}`.
- `create-dynamic-qr` only attaches codes to a Passport when the flag is true
  (`supabase/functions/create-dynamic-qr/index.ts:262`).
- The client hides Library tools when the flag is off (`utils/auth.ts:21-38`,
  `components/LibraryDrawer.tsx:136`, `components/HistoryDrawer.tsx:191`).

The offer sells “100 editable links … 90-day Field Report … a key acts as your
Passport.” While the flag is off, that is not operationally true. Either flip it
on (runbook `docs/DEPLOY-RUNBOOK.md:79-118`) and redeploy `create-dynamic-qr`,
`library`, `library-stats`; or launch free/static-only and stop selling the
server library.

### B3. `x-passport-id` is a bare capability; the secret is never checked (P0 security)

`supabase/functions/_shared/auth.ts:36-52` accepts `x-passport-id` as a UUID and
returns a user immediately. It never verifies the
`Authorization: Bearer <secret>` the client also sends (`utils/api.ts:172-175`,
`utils/passport.ts:334-335`).

**Verified live** (2026-11-05):

```
GET /functions/v1/api-keys         (no auth)            → 401
GET /functions/v1/api-keys         (random UUID header) → 200 {"success":true,"keys":[]}
GET /functions/v1/library-stats    (random UUID header) → 200 (empty series)
```

Anyone who knows a Passport UUID is that Passport. UUIDs are stored in
`dynamic_qr_codes.user_id` and `library_entitlements.user_id`; a database dump
or a leaked sync URL therefore becomes full account access. The secret in the
client is security theatre.

Practical severity: UUIDs are random 122-bit values, so blind guessing is
infeasible. The risk is disclosure, not guessing. Fixes, in increasing effort:

- **Minimum:** require the secret header _and_ verify it against a stored hash.
  There is no stored hash today, so this needs a small `passport_secrets` table
  and a lazy “bind on first use” step.
- **Better:** issue a short-lived signed identity token (HS256 with
  `SOFTSTACK_PASSPORT_SECRET`) at Passport creation, and verify that token
  instead of the raw UUID.
- **Honest alternative:** document that the UUID _is_ the credential and stop
  sending a secret that the server ignores.

Do not claim “cryptographic Passport” while the server accepts a bare UUID.

### B4. Passport buyers do not receive the paid entitlement (P0 fulfillment gap)

`supabase/functions/create-checkout/index.ts` excluded Passport-provider users:

```ts
const verifiedAuthUserId = user && user.app_metadata?.provider !== "passport"
  ? user.id
  : null;
```

`square-webhook` only fulfills `library_entitlements` when `checkout.user_id`
exists (`square-webhook/index.ts:128`). So a Passport buyer pays and gets the
license token (client unlocks UI), but no server library entitlement. With the
Library flag off this is invisible; with the flag on it becomes “I paid and my
library is empty.”

**Fixed on this branch** (`verifiedAuthUserId = user?.id ?? null`). Verified
live that `supporter_checkouts.user_id` and `library_entitlements.user_id` have
**no foreign keys**, so a Passport UUID is storable. Redeploy `create-checkout`
and `square-webhook` to take effect.

### B5. No recorded paid fulfillment end to end (P0 proof)

`GET create-checkout` says configured; `supporter_checkouts` is empty (`[]`).
There is no evidence of a completed A$49 payment, a declined checkout, a
duplicate webhook, or a pass restored on a second device.
`docs/ETHICAL_PAYMENT_SETUP.md:62-71` explicitly calls a successful checkout
page insufficient. Run the sandbox paths and record the result.

### B6. Passport recovery is manual; `send-recovery` does not exist (P0 support)

`docs/ACCOUNTS-RECOVERY-PLAN.md:107-122` calls for a new `send-recovery` edge
function. `supabase/functions/` has no such directory. The Passport lives in
`localStorage`; clearing storage or losing a device means manual support.
Implement P0 or put a hard “save your key” gate in front of purchase and
document the manual path.

### B7. The repo contains a migration that would open an anonymous file-read hole (P1 landmine)

`supabase/migrations/20251201000000_remediate_rls.sql:9-11` creates:

```sql
CREATE POLICY "Anyone can create bucket"
  ON file_buckets FOR INSERT WITH CHECK (true);
```

No later migration drops it. **Production is currently safe**: the live
`pg_policies` query returns only “Service role can do everything” on
`file_buckets`. So this is a _repo_ landmine, not a live hole: replaying
migrations from scratch (`supabase db push` / a fresh project) would let the
anon key insert a row with an arbitrary `content_metadata.storage_path`, and
`download-from-bucket` trusts that path with the service role
(`download-from-bucket/index.ts:242,317`).

Action: delete the policy from that migration (or replace `WITH CHECK` with
`auth.role() = 'service_role'`), then reconcile migration history.

### B8. Migration history does not match production (P1 operational risk)

`supabase migration list` reports the three 2026-11-02 migrations as **not
applied**. In production they are: `api_keys` and `scan_log_rollups` exist with
rows. They were applied out of band. A future `supabase db push` will try to
replay them; `create table if not exists` / `create or replace` make that mostly
idempotent, but nobody can tell what is applied from the CLI. Reconcile with
`supabase migration repair` before the launch deploy.

### B9. `upload-file` returned 500 for a caller error (P1)

`GET …/upload-file` and `POST {}` both returned
`500 {"error":"An unexpected error occurred…"}`. Root cause:
`await req.formData()` throws outside a guard (`upload-file/index.ts:53`).

**Fixed on this branch**: non-multipart/empty requests now return
`400 {"error":"Expected multipart/form-data with a file"}`.

### B10. `upload-file` skipped the MIME blocklist for single files (P1)

Extension blocking existed, but `file.type` was only checked for multi-file
(image/audio). A `.txt` labelled `application/x-msdownload` passed.

**Fixed on this branch**: every upload now checks `BLOCKED_MIME_TYPES` before
storage. `get-file` serves with `Content-Disposition: attachment`
(`get-file/index.ts:338-339`), which lowers exploitability, but the upload
should not accept it.

### B11. `deno task check` was red locally (P1 hygiene)

Only because untracked `.playwright-tour/shots/*.json` were not formatted and
`.playwright-tour/` was neither ignored nor excluded. CI was unaffected (the
files are untracked), but the local gate and any accidental commit would break.

**Fixed on this branch**: `.gitignore` and `deno.json` now exclude
`.playwright-tour/`.

---

## 4. P1 UX/state bugs (do not ship without these)

### U1. Editable/Static has three sources of truth (P1)

- In-flow switch keys off `editUrl` (`islands/SmartInput.tsx:1141`).
- Behavior tab keys off `isDynamic` (`components/CreateModal.tsx:1123`).
- Card badge keys off `isDynamic` (`islands/QRCanvas.tsx:821`).
- `activateDynamicBase` only flips the flag, never creates a short link
  (`CreateModal.tsx:367-373`).
- `disableDynamicBase` never clears `editUrl` or restores the source URL
  (`CreateModal.tsx:375-389`).

Repro A: type URL → Behavior → “Editable + Stats” → close. Card shows
`editable`, in-flow switch still says Static, no short code exists.

Repro B: URL → in-flow Editable → wait for `live` → Behavior → Static → close.
Behavior says Static, in-flow says Editable · live, QR still encodes the short
link. “Static” did not stop the redirect.

Fix: one source of truth (prefer `editUrl` presence). `disableDynamicBase` must
clear `editUrl` and restore `staticSourceUrl` exactly like the in-flow Static
button (`SmartInput.tsx:1156-1164`).

### U2. Typing in the URL silently drops the editable link (P1)

`SmartInput.tsx:533-541` clears `editUrl`, `isDynamic`, and `staticSourceUrl` on
every keystroke. After “Editable · live”, typing one character removes Manage,
reverts the badge, and leaves the short code orphaned. Fix: lock the input
behind an explicit “detach editable link” action, or warn.

### U3. Collapsing an active Behavior accordion wipes its settings (P1)

- Roulette: `CreateModal.tsx:1231-1233`
- Intro page: `:1290-1291`
- Scan/date limits: `:1326-1329`

Opening a panel, configuring it, then collapsing destroys the config. One click
does two jobs (show/hide + on/off). Fix: collapse only hides; put an explicit
“Turn off” on the active badge.

### U4. Design-tab focus is invisible once a field has content (P1 a11y)

`components/create-modal/DesignTab.tsx:209,266` use `focus:outline-none`; the
wrapper is already `border-2 border-[#1e1714]` when filled, so the only cue
disappears. Stamps, Reset, banner swatch, and clear buttons also lack
`focus-visible` rings. WCAG 2.4.7 failure in the main styling flow.

### U5. Local dev cannot call shared-CORS functions (P1 dev)

`_shared/cors.ts:19-21` gates dev origins on `DENO_DEPLOYMENT_ID`; the deployed
function answered `Access-Control-Allow-Origin: https://qrbuddy.app` for
`http://localhost:8004`. Pricing shows “Checkout opens soon”; dynamic QR and
uploads fail locally. Production origins are fine. Fix: key dev allowlist off an
explicit `APP_ENV`, or run Supabase locally.

---

## 5. P2 polish and correctness

- **Contrast:** accent badges on `#fffef7` are below 4.5:1 — sunset **3.49**,
  ocean 3.64, forest 3.73, candy 3.43, matrix 2.51, brutal 1.90. Affected:
  `5 free` badge (`SmartInput.tsx:1149`), `editable` tag (`QRCanvas.tsx:829`),
  footer Passport pill (`PricingModal.tsx:919`, `qr-pop` #ff4d8d). History
  delete ✕ is `amber-500` on white text ≈ **2.12:1** (`HistoryDrawer.tsx:419`),
  below the 3:1 non-text minimum.
- **Tap targets:** CreateModal header/close `w-10 h-10` = 40×40
  (`CreateModal.tsx:1431,1454,1474`); tabs `min-h-[40px]` (`:1520`); Design
  Reset `min-h-[32px]` (`DesignTab.tsx:112`); clear-centre-mark `w-8 h-8`.
- **Copy/voice (house law):** “Your QR History” / “Tu Historial de QRs”
  (`HistoryDrawer.tsx:187`), “Abrir Tu Biblioteca” (`:200`), “¿Seguro que
  quieres borrar…?” (`:458`), “¡Crea algunos QRs…” (`:326`), “you@example.com”
  (`PricingModal.tsx:781`). Imperative prose: “Create some QRs to populate
  history!” (`:327`), “Try again or contact support” (`PricingModal.tsx:352`),
  “Add a destination link first” (`SmartInput.tsx:520`).
- **Mixed Spanish:** “Franja: **accent**” / “**accent**. Cambiar estilo”
  (`DesignTab.tsx:273-278`) — theme names untranslated. “Editable + Stats” is
  identical in both branches (`CreateModal.tsx:1201`). Dynamic QR toast is
  English-only + emoji (`useDynamicQR.ts:134-140`).
- **Dead copy/UI:** `SHEET_HEADINGS.sub` is defined but never rendered
  (`CreateModal.tsx:39-73,1421`); `ChoiceRow` badges never render outside the
  chevron branch (`ChoiceRow.tsx:189-201`); custom palettes label as “Sunset”
  (`DesignTab.tsx:52-54`); monogram does not restore (`:47`); custom colours
  closes the sheet and never reopens it (`:130-135`); History empty-state
  promises every QR is recorded, but static QRs are only recorded on download
  (`QRCanvas.tsx:487-501`).
- **Unreachable validation:** `validateURL` returns true for any non-empty
  string (`SmartInput.tsx:463-466`), so the amber shake / `aria-invalid` /
  `#input-error` never fire.
- **Scan warning** is visual-only, no `role="alert"` (`QRCanvas.tsx:846-855`).
- **Tabs** have `role="tab"` but no `role="tablist"`/`tabpanel`
  (`CreateModal.tsx:1517-1520`).
- **History rows** nest `<a>` and `<button>` inside `role="button"` — ARIA
  violation (`HistoryDrawer.tsx:350,391,413`).
- **Native `confirm()`** for wipe (`HistoryDrawer.tsx:456`) — blocking OS
  dialog, breaks the visual language.
- **`get-file-metadata`** returns `files[].path` to the public
  (`get-file-metadata/index.ts:153`). `FileSlideshow` uses `path` to build the
  download URL (`FileSlideshow.tsx:227,548`), so removing it needs a
  download-endpoint change; note as P2 info leak.
- **PIN page** shows `Code pcjktv` with no explanation (`routes/r.tsx:103`).
  Label it “Locked code”/“Reference”.
- **Locker keypad** “Ready for upload” uses a teal/blue gradient that clashes
  with the warm palette (`BucketQR.tsx:622`).
- **Save pill overlaps the matrix by 26px** on both mobile and desktop
  (measured), despite the design note “hangs 12px below”
  (`QRCanvas.tsx:774-807`). Verify a real phone scan of the on-screen code.
- **Design preview** lacks the export card's `border-4`
  (`DesignPreview.tsx:20-45` vs `QRCanvas.tsx:694-702`).
- **`tour2.mjs`** matched `/Save PNG/` but the accessible name is “Download QR
  code as PNG” (`QRCanvas.tsx:787-791`), producing a phantom failure.

---

## 6. Architecture notes (post-launch debt, not launch blockers)

- **God components:** `components/CreateModal.tsx` 1,649 lines,
  `islands/VerticalStudio.tsx` 1,620, `islands/SmartInput.tsx` 1,287,
  `components/QRReader.tsx` 1,221, `supabase/functions/redirect-qr/index.ts`
  1,178, `components/LibraryDrawer.tsx` 1,165, `components/OwnerStrip.tsx`
  1,114, `islands/FileSlideshow.tsx` 1,111.
- **Dead files:** `components/KofiModal.tsx`, `components/modal/ModalShell.tsx`,
  `islands/modal/ModalShell.svelte`, `islands/modal/modal-shell.css`,
  `utils/qr-ascii.ts`.
- **Duplication:** `routes/es/index.tsx` is a near-copy of `routes/index.tsx`;
  `routes/es/*` verticals duplicate `routes/for/*`. English top-level verticals
  are 301s to `/for/*`; Spanish equivalents are full pages. Routing asymmetry
  must be handled by SEO/hreflang.
- **Mixture of emoji glyphs and monochrome `StageGlyph`** across Content /
  Behavior rows vs the toolbar.
- **Retention:** `scan_logs` purge exists and has run (rollups present), but the
  CLI history does not show the migration. Reconcile.
- **Rate limiting** is durable and fail-closed on 21/24 functions; the three
  without it are secret/HMAC-gated or public liveness. Good.
- **CORS** is an explicit whitelist with credentials; no wildcard. Good.
- **Webhook** has HMAC verification, amount/currency/location matching, and
  idempotent minting. Good.

---

## 7. The launch checklist

### Night before

- [ ] Decide B2: flip `FEATURE_PLUS_LIBRARY=true` **or** launch free/static only
      and remove the server-library promise from the paid copy.
- [ ] If flipping: redeploy `create-dynamic-qr`, `library`, `library-stats`;
      verify anonymous create is refused and a Passport create appears in
      `/library`.
- [ ] Merge `analysis/deep-dive` → `main` (brings `69d1122` security fix,
      History summaries, hit areas, tests, and the fixes in this branch).
- [ ] Redeploy the 10 functions that import `_shared/license.ts`
      (`create-dynamic-qr`, `create-bucket`, `create-upload-url`,
      `finalize-upload`, `upload-file`, `upload-to-bucket`, `update-file`,
      `update-dynamic-qr`, `email-passport`, `square-webhook`) plus
      `create-checkout` (Passport entitlement fix) and `upload-file` (400 + MIME
      fix).
- [ ] Reconcile Supabase migration history; delete the permissive
      `Anyone can create bucket` policy from the repo migration.
- [ ] Run one real payment end to end in sandbox: paid, declined, duplicate
      webhook, pass restore on a second device.
- [ ] Run the physical smoke test: print a gradient QR, scan in dim light, pair
      a phone, make a real media drop, open the Field Report, export CSV.
- [ ] Add error monitoring (Sentry/GlitchTip) or a log drain + alert.
- [ ] Confirm the `cleanup-expired` cron schedule (docs say 17:00 UTC daily;
      `supabase/cron.sql` is an older hourly example).

### Deploy

```sh
cd ~/Projects/active/apps/qrbuddy
# never deploy a stale snapshot
rm -rf _fresh && deno task build
git status                 # must be clean
source ~/.config/api_keys
deno deploy --prod --org pibulus --app qrbuddy --token "$DENO_DEPLOY_TOKEN_NEW"
```

Respect the **15 deploys/hour** plan ceiling; pushes to `main` may also spend it
via the Git integration. Check the dashboard before assuming quota.

### Verify

```sh
curl -s https://qrbuddy.app/version.json
for p in / /es /batch /developers /stats /v1/ping /sitemap.xml /robots.txt; do
  curl -s -o /dev/null -w "$p %{http_code}\n" "https://qrbuddy.app$p";
done
curl -s https://aqydpibnvlhcjcwosrti.supabase.co/functions/v1/health
curl -s https://aqydpibnvlhcjcwosrti.supabase.co/functions/v1/create-checkout
curl -s -o /dev/null -w "library %{http_code}\n" \
  https://aqydpibnvlhcjcwosrti.supabase.co/functions/v1/library
```

Expected: `version.json` has a fresh `built` and the new `sourceHash`;
`/library` is 404 only if you chose free/static-only (otherwise 401 for
anonymous and 200 with a Passport); `create-checkout` is `{"available":true}`.

### Immediately after

- [ ] Watch the first 20 Passport creations and the first 5 scans.
- [ ] Confirm `upload-file` returns 400 (not 500) for a bad request.
- [ ] Confirm a Passport checkout writes `supporter_checkouts.user_id` and a
      `library_entitlements` row.
- [ ] Keep the rollback: `FEATURE_PLUS_LIBRARY=false` plus redeploy.

---

## 8. What changed on this branch

- `supabase/functions/upload-file/index.ts` — non-multipart/empty requests
  return 400; every upload checks `BLOCKED_MIME_TYPES`.
- `supabase/functions/create-checkout/index.ts` — Passport UUIDs are carried
  through checkout so paid Passport buyers can receive the library entitlement.
- `.gitignore` / `deno.json` — `.playwright-tour/` excluded so the local
  `deno task check` gate is honest.

Not changed (deliberately): the `x-passport-id` verification model (needs a
cryptographic design decision), the RLS migration (needs a migration + history
repair), the Library flag (a product decision), and the UX state bugs (need a
focused branch and a real device pass).

---

## 9. The one-paragraph answer

QRBuddy is a real product with a coherent design language, a deep feature set,
green tests, and a working core. It is not launch-ready because the production
build is stale, the paid Library is switched off, no one has proven a paid
fulfillment, and the Passport identity is a bare UUID the server never verifies.
Fix those four, run the phone/print/payment smoke, and it is a credible public
launch. Until then it is an excellent closed beta.
