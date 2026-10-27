# QRBuddy launch readiness audit

> **Initial audit snapshot, before remediation.** The fixes and deployment
> evidence from the same session are in the
> [release record](./RELEASE-2026-10-13.md). Findings below describe the
> starting state; they are not a list of issues still present in production.

**Decision: HOLD the paid launch and wedding/security marketing campaigns.** The
core QR maker is usable and the backend is deployed. The immediate work is
payment configuration, truthful offers, and protection of the hosted features. A
small free pilot is reasonable, with the remaining validation limits below.

Audited 13 October 2026, local commit `d77ac3f`. Production was inspected
separately; its `/version.json` reports `commit: unknown`, so this audit does
not assert that production serves that exact commit. Two focused GPT-6 Luna
reviews covered commerce and backend security; the primary review covered
architecture, live operations, browser flows, and reconciliation of findings.
Application code was not changed, and no payment or production content fixture
was created.

## Evidence collected

| Check                   | Result and boundary                                                                                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository checks       | `deno task check` passed: formatting, lint, and the task's type checks.                                                                                                                                                                                                   |
| Production build        | `deno task build` passed; generated 31 routes and 56 islands.                                                                                                                                                                                                             |
| Focused automated tests | **43 passed, 0 failed** across logic, license, R2 signing, in-app browser detection, and peek input rejection. These do not exercise real payments or storage lifecycles.                                                                                                 |
| Live browser            | Chromium loaded the apex, www, and Deno alias with HTTP 200. Home, Create, Supporter, Spanish home, and four sales pages inspected; desktop 1440px and mobile 375px. No horizontal overflow on sampled pages.                                                             |
| Core QR flow            | Entered an example URL, downloaded a PNG, and the QR reader decoded the exported image to the original URL.                                                                                                                                                               |
| Checkout                | Live `POST create-checkout` returned **503: Payments are not configured yet**. Remote secret-name inventory contains no `SQUARE_*` settings. No purchase attempted.                                                                                                       |
| Backend                 | Health/database probe 200; all **35** local migrations match remote; all **20** edge functions ACTIVE. Active status does not prove each function's behavior.                                                                                                             |
| Cleanup                 | Active daily job at `17:00 UTC`; two recent scheduler runs succeeded, one retained HTTP response was 200, and expired file-row count was zero. This is a snapshot, not proof of every deletion path.                                                                      |
| Security configuration  | Live HSTS, CSP, frame denial, nosniff, and referrer headers present. Supabase advisor returned two warnings, no error-level findings: mutable search path on `coarse_distance_km`, and `pg_net` in public schema.                                                         |
| Discoverability         | Live robots, sitemap, and manifest returned 200. `/privacy` and `/terms` returned 404. Plain HTTP clients and the web reader received 403 from the apex while Chromium succeeded; investigate crawler access before an SEO campaign, not as evidence of a general outage. |

Browser evidence and screenshots are in
[`../.playwright-mcp/launch-audit/`](../.playwright-mcp/launch-audit/). That
directory is ignored by Git. Key captures:
[home mobile](../.playwright-mcp/launch-audit/home-mobile.png),
[home desktop](../.playwright-mcp/launch-audit/home-desktop.png),
[Create](../.playwright-mcp/launch-audit/create-mobile.png),
[Supporter](../.playwright-mcp/launch-audit/pricing-mobile.png),
[wedding page](../.playwright-mcp/launch-audit/for-weddings.png).

## Structure and main flows

| Area               | Main files                                                                                                                | Flow / ownership                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell          | `routes/_app.tsx`, `_middleware.ts`, `index.tsx`, `es/index.tsx`                                                          | Fresh server rendering, public config injection, security headers, shared signals.                                                                        |
| Create/export/read | `islands/SmartInput.tsx`, `CreateModal.tsx`, `QRCanvas.tsx`, `QRReader.tsx`; `utils/qr-decode.ts`                         | Input/templates → shared signal → client QR rendering → PNG/SVG export. Reader decodes locally; URL inspection calls `/api/peek`.                         |
| Editable QRs       | `hooks/useDynamicQR.ts`, `useQRData.ts`; `routes/r.tsx`, `edit.tsx`; four dynamic QR edge functions                       | Create redirect → keep owner capability → scan through redirect service → edit with owner token. Atomic scan-count RPC.                                   |
| Shared files/media | `hooks/useFileUpload.ts`; `routes/f/[code].tsx`; `FileSlideshow.tsx`, `OwnerStrip.tsx`; upload/get/update-file functions  | Upload → share page → playback/download → owner stats/management. File shares have 30-day expiry; finite downloads use claim/finalize RPCs.               |
| Lockers/notes      | `BucketQR.tsx`, `NoteCard.tsx`; `hooks/useBucketCreator.ts`; bucket functions                                             | Reusable or finite locker, optional PIN/password, owner capability. A locker has one occupied slot; download/refill behavior differs from a shared album. |
| Local continuity   | `utils/history.ts`, `token-vault.ts`, `sync-phrase.ts`, `supporter-pass.ts`                                               | Browser history and owner tokens; manual encrypted backup/merge. Browser storage is part of the product's recovery contract.                              |
| Payment/big files  | `PricingModal.tsx`; create-checkout, square-webhook, get-license; `_shared/license.ts`; create-upload-url/finalize-upload | Square link → signed webhook → stored annual pass → browser claims pass → server verifies signature/expiry. Supporter uploads can go directly to R2.      |
| Operations         | `supabase/migrations/`, `cleanup-expired`, `deno.json`, `.github/workflows/deploy.yml`                                    | Supabase backend deployment is separate from Fresh. Git-connected Deno build is the production route. CI currently builds only.                           |

The separation is understandable. Existing owner authorization, atomic file
claims, public/private key separation, and encrypted sync are useful
foundations. There is no launch reason to rewrite the framework or reorganize
the whole app.

## Fixes before selling

### 1. P0 — Checkout cannot start (confirmed live)

The public Supporter button leads to a backend with no Square credentials.
`supabase/functions/create-checkout/index.ts:39` explicitly returns 503 when
configuration is absent; the live endpoint returned that response.

**Fix:** configure production Square access token, location, environment,
webhook signature key and exact notification URL. Confirm amount/currency
against the merchant location. Then exercise successful payment,
declined/cancelled payment, delayed webhook, duplicate webhook, closed-tab
return, and pass activation. Do not count a hosted checkout page as proof that
fulfillment works.

### 2. P1 — There are conflicting products, prices, and feature gates (confirmed)

The wedding CTA and structured offer say **$19**
(`routes/for/weddings.tsx:105,123`). The same page's shared sales component says
**$49/year USD** (`islands/VerticalStudio.tsx:290`), and its CTA opens the
shared **$49** Supporter modal (`types/pricing.ts:26`). Square's code default is
**AUD** (`supabase/functions/_shared/square.ts:31`). Actual charge currency
remains unverified because payments are not configured.

The vertical pages also sell dynamic links/audio as paid features, although the
free product includes editable QRs and file sharing. Naming varies between
Studio, Wedding, Menu, Artist, Privacy, and Supporter passes without separate
fulfillment.

**Fix:** sell the one implemented annual Supporter Pass. Use a single amount,
explicit currency, duration, name, and feature table across EN/ES, structured
data, modal and checkout. Keep genuinely free features identified as free.

### 3. P1 — The wedding offer promises a product the current flows do not deliver

The page promises a multi-guest photo collection, organizer “Download All” ZIP,
original camera resolution, and 12 months of access
(`routes/for/weddings.tsx:25,60,66–79`). The locker endpoint rejects another
upload while full (`supabase/functions/upload-to-bucket/index.ts:118`). Normal
photo-share preparation downsizes images to 2048px JPEG
(`utils/image-prep.ts:17`); it is not an original-resolution archive. Reusable
locker contents expire after 30 inactive days (`cleanup-expired/index.ts:48`),
and ordinary file shares expire after 30 days (`upload-file/index.ts:20`).
Paying does not implement the advertised wedding retention policy.

**Fix:** withdraw/rewrite this offer around existing behavior before launch.
Building a real guest album with collection permissions, aggregate storage
quota, organizer export and paid retention is a separate feature project.
Removing the unsupported promises is the smallest launch fix.

### 4. P1 — Privacy and security promises exceed the implementation (confirmed)

Music claims “zero telemetry” (`routes/for/music.tsx:55`); menus claim zero
tracking (`routes/for/menus.tsx:55`); lockers claim zero logs/analytics and
erasure with “zero traces” (`routes/for/lockers.tsx:25,55`). In reality there
are site beacons, dynamic scan logs (`redirect-qr/index.ts:240`), and share
analytics with country/city/device, engagement and daily visitor hashes
(`share-beacon/index.ts:85`, `_shared/visitor.ts`). Deletion can be
queued/retried; it is not evidence of immediate forensic erasure. Encrypted
text/sync and TLS do not make every uploaded file end-to-end encrypted.

**Fix:** describe the actual data use and retention; distinguish encryption in
transit, encrypted notes/backups, and hosted file access. Remove absolute
erasure, privacy-compliance, and sensitive-document assurances that have not
been verified. Publish a readable privacy notice and terms, linked from the
footer and purchase flow. Cover processors, expiry/deletion, local
ownership/recovery, acceptable use, refunds and support. These are product
launch requirements; this audit is not a jurisdiction-specific legal review.

The menus page's “500+ independent venues switched” claim
(`routes/for/menus.tsx:120`) also needs real evidence or removal. Competitor
price and behavior claims were not independently substantiated in this audit.

### 5. P1 — Rate limits are not durable abuse or PIN protections (confirmed design)

`supabase/functions/_shared/rate-limit.ts:14` stores counters in an
isolate-local Map. Cold starts and parallel instances do not share those
counters. This affects public request throttles and failed-PIN attempts; the UI
explicitly supports four-digit locker PINs
(`islands/extras/LockerSettings.tsx:171`). Existing database caps help some free
paths, but do not make this limiter global.

**Fix:** use the existing database for atomic counters on sensitive/costly
paths: PIN attempts keyed by locker plus caller, upload/create admission, and
checkout creation. Retain a reasonable paid safety ceiling and operator budget
alerts. Test across concurrent instances; do not advertise a four-digit PIN as
strong protection for sensitive documents. This finding was not exploited
against users.

### 6. P1 for the 500 MB offer — R2 accepts bytes before the size check

The upload grant validates a declared size, but signs an ordinary PUT
(`_shared/r2.ts:84`). Actual size is checked at finalization
(`finalize-upload/index.ts:154`). A valid pass can upload an oversized object
and omit finalization; abandoned grants are only cleanup candidates after 24
hours (`cleanup-expired/index.ts:352`). The live daily schedule can extend that
delay. This is a paid-path storage exposure, not an anonymous upload bypass.

**Fix:** enforce the byte ceiling at the upload boundary and add durable
admission limits for outstanding uploads/retained bytes. Verify abandoned,
oversized, interrupted and duplicate finalization paths before advertising bulk
big files. If that work is deferred, defer this paid feature too.

### 7. P1 operational gate — A buyer needs a recovery and refund path

Passes are stored in localStorage (`utils/supporter-pass.ts:26`), with manual
copy/paste and encrypted backup available. Losing both browser state and backup
has no self-service recovery route. The checkout table has no customer account
or email reference (`20260812000000_supporter_checkouts.sql:6`). Refund copy
says 30 days (`PricingModal.tsx:282`), but no refund event revokes a signed
annual token (`square-webhook/index.ts:60`, `_shared/license.ts:91`).

**Fix:** provide an explicit pass-backup step on activation and a documented
support procedure to recover from Square payment evidence. Confirm that
`pablo@qrbuddy.app` receives mail and that a refund can be performed. Decide
whether refunded access continues; if it must end, introduce pass
identity/revocation. This does not require a customer account system for launch.

## Next fixes and polish

| Priority        | Finding and evidence                                                                                                                                                                                                      | Smallest useful action                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 release gate | Live `version.json` still says `unknown`; `scripts/stamp-version.ts` has insufficient build provenance. CI only runs a build (`.github/workflows/deploy.yml`).                                                            | Stamp the source commit from the actual build context; verify it after deploy. Run checks and the 43 safe tests in CI. Keep integration tests pointed at staging/local services.                |
| P2              | Bot User-Agent bypasses scan consumption (`redirect-qr/index.ts:132`). Repeated preview requests reveal the destination while leaving the remaining scan count unchanged; it does **not** reopen an already exhausted QR. | For finite links return a neutral preview without the destination, or count destination-bearing requests. Do not treat a QR scan counter as protection against copying an already revealed URL. |
| P2              | Closed History drawer remains a modal with focusable controls (`HistoryDrawer.tsx:139`). Live keyboard check reached sync/close buttons at negative screen coordinates.                                                   | Unmount or apply `inert`/appropriate hidden state while closed; preserve focus restoration when opening/closing. Test keyboard and screen-reader behavior.                                      |
| P2              | Spanish home has `html lang="en"` and English Create, Save, History and related flows (`routes/_app.tsx:22`, shared islands).                                                                                             | Set route language and finish shared-control translations, or label Spanish availability honestly as partial.                                                                                   |
| P2              | Saving a PNG also copies to clipboard and can show “Failed to copy URL” after a successful save (`QRCanvas.tsx:197`). Reproduced when clipboard permission was unavailable.                                               | Make save confirmation reflect download success; separate optional copying.                                                                                                                     |
| P2              | Mobile footer reads visually as “AboutSolutions”; several small secondary targets are below 44px.                                                                                                                         | Add spacing to the footer segments; enlarge history/modal secondary controls. Keep the compact branded design.                                                                                  |
| P2              | Three analytics integrations are present in live responses; injected Cloudflare Insights violates the app CSP. Some quick navigation runs also aborted WASM fetches.                                                      | Remove redundant injected analytics or deliberately align the policy. Recheck WASM on a stationary page; navigation-aborted requests alone are not a demonstrated scan failure.                 |
| P2              | Production cleanup is daily; checked-in `supabase/cron.sql` describes hourly.                                                                                                                                             | Choose/document the schedule and deletion lag, monitor failed deletions and queue age. Existing successful runs should be preserved.                                                            |
| P3              | Supabase advisor warnings and stale architecture counts in CLAUDE.md. Lockfile disabled in `deno.json`; some backend imports float within major versions.                                                                 | Set the SQL function search path, review extension placement, update docs, and pin dependency resolution for repeatable releases. No dependency vulnerability is claimed here.                  |

## Requirements to change the decision to SHIP

1. **Offer:** one implemented product/price/currency across all sales surfaces;
   unsupported wedding and privacy claims removed; footer policies and support
   contact available. Check Square merchant, receipt and tax settings for the
   intended sales setup.
2. **Payment:** a test-mode purchase proves webhook fulfillment, replay safety,
   delayed completion, recovery and refund handling; then an authorized live
   purchase proves the real production route. Verify the charged
   amount/currency.
3. **Hosted flows in staging:** dynamic create → scan → edit → scan
   limit/expiry; protected locker bad PIN/good PIN → download → refill; single
   file and finite multi-file ZIP; slideshow and playlist; concurrent final
   download; R2 boundary, interruption, retry and cleanup; owner access after
   backup/import on a fresh browser. Verify rejected operations do not consume
   uses or lose data.
4. **Cost/abuse:** durable PIN/admission counters; controlled pending/retained
   storage; budget alerts and an operator procedure to disable new uploads while
   keeping existing downloads available. Document how abusive content is
   reported and removed.
5. **Devices/accessibility:** actual iPhone Safari and installed web app,
   Android camera scan, clipboard/share/download, HEIC upload, audio
   continuation and keyboard/focus checks. Print and scan every offered preset,
   including logos and framed exports at the sizes recommended in the printing
   guide.
6. **Release/operations:** deployed commit visible; correct
   migrations/functions; monitored cleanup; backup/restore procedure and
   protected signing-key backup; rollback instructions; CI checks/test failures
   block release. Recheck live headers and asset loading after the final build.

These are outstanding acceptance checks, not claims that these flows fail. This
audit did not run production stress tests, inspect real customers' data, perform
a settled payment, exercise the full storage lifecycle, test real phones, or
prove recovery from provider outages/backups.

## Suggested launch scope

Lead with the finished strength: attractive, useful QR codes, local PNG/SVG
exports, editable links, and clearly time-limited sharing. Sell one Supporter
Pass for the verified higher limits and branding benefits. Use real examples of
a menu link, a short-lived mixtape, and a file handoff. Present the 30-day
boundary before someone prints a hosted file link onto long-lived packaging.

Keep the existing visual character. The useful UX work is a clearer free/paid
boundary, calm recovery instructions, visible retention, and accessible
controls. Separate vertical pass names, a new dashboard, and additional product
tiers would increase the launch surface without fixing the current blockers.
