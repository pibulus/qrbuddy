# Dynamic QRs, media and owner flow audit — 13 October 2026

Follow-up to the [launch audit](./LAUNCH-READINESS-2026-10-13.md) and
[release record](./RELEASE-2026-10-13.md). Starting application: `32e46e9`. This
pass exercised real, small, explicitly labelled audit shares against the QRBuddy
backend. Earlier page-load checks did **not** prove media delivery.

## Decision

The repaired core flows are suitable for a small free pilot. Keep paid checkout
closed under the existing purchase/recovery gates. Do not sell these features as
an unlimited album host, a permanent music service, or precise marketing
analytics. Physical phone playback/scanning and a real Square purchase remain
unverified.

## What the features actually do

| Feature             | Flow and limits                                                                                                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editable QR         | Link → Create → Behavior → Editable → explicit Create editable link → save/print. The public redirect stays stable while its destination changes. History restores the private edit capability on the same browser. Owner visits to the public redirect count.                           |
| Link rotation       | Each counted visit advances the sequence; looping is optional. The sequence follows the lifetime scan index, including visits before a routing change. This is separate from an audio playlist. Device/time routing is also present in the edit page.                                    |
| Slideshow           | Paperclip/drop multiple photos → automatic image prep → title/download options → create → Open/Copy/Sticker. Up to 10 items, 5 MB each after prep, 30-day share expiry. Photos can be resized/re-encoded; this is not original-resolution archival storage.                              |
| Playlist            | Select multiple audio files through the same input → title/options → create. Recipient taps a track or native Play; subsequent tracks advance automatically and stop at the end. Same 10-item/5-MB-per-item limits. A 500-MB Supporter single-file allowance does not enlarge playlists. |
| Owner management    | The browser vault remembers the owner key. Open from History → manage title, theme, append/remove same-kind media, see stats, save sticker. These changes preserve the public URL. Limited-download payloads are frozen.                                                                 |
| File page in Create | “Share a file” is a separate one-file locker flow, with optional PIN and download page metadata. It is not the multi-photo/audio authoring entry point. Its retention is 30 days without access.                                                                                         |
| Media stats         | Best-effort page opens, coarse device/location context, item display/play-start events, last-item completion, share actions and download requests. Includes owner opens. Today’s visitor estimate groups networks per UTC day; it is not a count of human identities.                    |

## Confirmed problems fixed

| Severity | Finding and fix                                                                                                                                                                                                                                                                                                              | Main files                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| P1       | Real media downloads returned **503**: `claim_destructible_file_download` used bare `id`, ambiguous with its output variable (PostgreSQL 42702). Qualified table columns; retained finite claim locking. Tested unlimited, finite, duplicate and exhausted claims in a rolled-back transaction; applied the migration.       | `20261013030000_qualify_file_claim_columns.sql`                                         |
| P1       | A temporary dynamic-QR database lookup failure was treated as missing and redirected home. Return retryable 503; distinguish missing records. Media metadata and dynamic owner lookup now distinguish database errors too.                                                                                                   | `redirect-qr`, `get-dynamic-qr`, `get-file-metadata`                                    |
| P2       | Mobile playlist card clipped the track list; overlay arrows covered audio controls. Let audio cards size to content and use the track list for navigation. The selected first track did not start on tap because changing `autoPlay` on a mounted element does not initiate playback; explicitly play it in the tap handler. | `FileSlideshow.tsx`                                                                     |
| P2       | Share Copy button had white text on white; desktop showed two Copy buttons. Set text colour and show the second action only when native sharing is available.                                                                                                                                                                | `ShareActions.tsx`                                                                      |
| P2       | Old image-prep/decode work could change a replacement selection; a new drop during upload could be silently cleared on success. Guard async results with a selection generation and block replacement during an in-flight upload.                                                                                            | `SmartInput.tsx`                                                                        |
| P2       | Unsupported batches looked ready until upload failed. Reject over 10 items, unsupported batch types and oversized audio at selection time. Mixed image/audio packs remain supported; the earlier agent suggestion that all mixed batches were invalid was corrected during review.                                           | `SmartInput.tsx`                                                                        |
| P2       | Editable/file modes could coexist misleadingly. Clear dynamic state when choosing/creating file flows, keep file behavior guidance in its Content flow, and guard duplicate editable creation synchronously.                                                                                                                 | `CreateModal.tsx`, `SmartInput.tsx`, `useDynamicQR.ts`                                  |
| P2       | Owner name editing and native audio keys could navigate media. Ignore shortcuts originating in editable/interactive controls. Preserve correct item metadata when reducing a share to one item; count single-audio completion.                                                                                               | `FileSlideshow.tsx`                                                                     |
| P2       | Media stats called page opens “scans”; the scan/link split used the cross-origin beacon’s Referer, not the visitor’s arrival source. Remove that split and app-source claims. Remove misleading weekly unique-person and “heard everything/saw every photo” claims; label play starts and download requests accurately.      | `share-stats.ts`, `FileSlideshow.tsx`                                                   |
| P2       | Failed owner stats could render “No scans yet”; stats had no refresh control. Surface unavailable/loading states, Retry/Refresh, and a compact measurement explanation. Reject failed ledger queries instead of substituting an empty ledger.                                                                                | `OwnerStrip.tsx`, `get-file-metadata`                                                   |
| P2       | An exhausted QR could still say Active and show negative remaining. Derive exhausted/expired status and clamp remaining. Analytics could say Never for an older visit and silently truncate after the API row cap. Aggregate in SQL; report last retained visit, analytics unavailable state and normalized chart heights.   | `QRStatusCard.tsx`, `AnalyticsDashboard.tsx`, `20261013020000_dynamic_qr_analytics.sql` |
| P3       | File-page copy implied indefinite retention; optional PIN keyboard handling was always active. State retention and enable the keypad listener only when PIN protection is selected. Dynamic history now starts with its destination as title instead of an opaque short URL.                                                 | `MediaHubForm.tsx`, `useDynamicQR.ts`                                                   |

## Verification and evidence boundaries

- Live UI creation of a two-image slideshow, two-audio playlist and editable QR;
  returned owner keys persisted in the browser vault. Each fixture was labelled
  as audit data. No customer shares were edited.
- Built candidate app served through a browser routing override at the normal
  origin, backed by the live API: rename without shortcut interference,
  slideshow navigation, real image delivery, ZIP download, sticker export, stats
  failure/Retry, upload failure preserving the selected files, and blocked
  replacement during upload.
- Playback: tap first track → actual audio playback → automatic next track →
  ended/stopped. Owner removal from two tracks to one leaves the remaining track
  playable; append and theme changes keep the URL. History Manage reopens the
  actual owner page. Chromium viewport widths 320/375/1440 checked for overflow.
- A separate guest browser had no owner controls. Actual images loaded;
  slideshow auto-advanced and wrapped; manual navigation paused it.
- Controlled image-prep completion order: resolve selection A while selection B
  is still pending; B stays disabled until its own prep completes.
- Editable QR: change destination and follow the same public link; save rotating
  URLs and observe their sequence; lower the limit below the existing count, see
  Exhausted/zero remaining, then observe recipient `/boom`.
- SQL analytics probe inserted 1,005 recent logs in a transaction and verified
  all were counted; an eight-day-old visit remained the last visit while its
  seven-day activity was zero. Public roles cannot execute the aggregation RPC.
  Probe data and SQL definitions were rolled back before normal migration.
- `deno task check`, Fresh build and offline tests passed: **54 passed, 0
  failed, 1 ignored**. The ignored local-Supabase test was not counted as proof.
  Browser assertions above provide the feature evidence; the existing unit suite
  does not cover all these interactions.
- Browser fault injection was client-local. A test-script selector mismatch and
  URL-comparison bug were corrected; neither was counted as an application
  defect. The actual 503 and first-track failures were reproduced, fixed and
  exercised again.

Local, ignored artifacts are under `.playwright-mcp/feature-audit/`, including
staging/owner/guest screenshots, ZIP/PNG exports, SQL probe logs and browser
scripts. They are review evidence, not fixtures to keep online.

## Prioritized remaining improvements

1. **Make photos and music discoverable.** Add explicit “Photo slideshow” and
   “Audio playlist” choices to Create, using the existing staging flow.
   Currently the paperclip/drop route and the separate “Share a file” form are
   easy to confuse. Explain 10 items / 5 MB each before the picker, including on
   music sales pages. This is the largest remaining onboarding improvement.
2. **Ownership and retention guidance.** After creation, explain that management
   lives in this browser and point to the existing encrypted backup/recovery
   flow. Keep expiry visible before print/export. Do not promise permanent
   posters or ownership recovery without the saved capability.
3. **Reorder before publishing and from owner controls.** Simple Move up/down is
   sufficient initially. Currently order is selection/append order; users need a
   new share or awkward remove/add work to curate it. Add per-track display
   titles only if demand justifies them.
4. **Keep History titles current after rename.** Existing history rows retain
   their creation title; owner-page title is correct. Update matching local rows
   without changing their IDs or pretending to sync across other browsers.
5. **Better failure feedback in the player.** Give image/audio fetch failures an
   inline Retry and show ZIP failure inline instead of a blocking alert.
   Consider a styled retry page for temporarily unavailable share/routing
   services.
6. **Expose only useful stats first.** Opens, play starts and download requests
   are understandable. Weather/moon/context cards are optional extras, not
   attribution or conversion proof. Earlier playback tallies included track
   selection/display; historical counts cannot be retrospectively repaired.
7. **Accessibility/localization pass.** Associate all edit-form labels, check
   tablist keyboard behavior and contrast across every theme, and finish Spanish
   owner/editor/media copy. This pass exercised the primary English paths.
8. **Operational SQL smoke checks.** CI currently checks application code and
   builds. Add an isolated migrated-database check that actually calls critical
   claim/finalize/append RPCs; successful migration installation alone missed
   the live `id` ambiguity. Keep customer data outside that test.

## Remaining release requirements

- Physical iPhone/Safari and Android: camera scan → media page, actual MP3/AAC
  playback/advance, locked-screen/background behavior, native share/save, HEIC
  selection and large photos. Desktop Chromium and tiny WAVs do not prove these.
- Print and scan a branded/sticker QR, including dark/low-light conditions.
- Verify owner backup/restore on another real browser before promising recovery.
- Long-session, expiry/cleanup and large-transfer evidence remain bounded by the
  earlier release report. Device/time QR rules were source-reviewed and covered
  by existing logic tests where applicable, not end-to-end in this follow-up.
- Real Square purchase → pass issuance → restore, cancellation/refund handling
  and support email delivery remain required before enabling sales. Checkout
  stays disabled; this feature pass performed no charge.
