# QRBuddy as a business — capability audit

> Written 2026-11-02 from the code. Every "have" below names the file that
> proves it. This is the honest gap list between a delightful QR toy and
> something a locker manufacturer signs off on.

## 1. What QRBuddy actually has

More than the marketing suggests. This is a real dynamic-QR engine already.

| Capability                                                   | State                 | Evidence                                                                        |
| ------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| Dynamic QR (editable destination, same printed code)         | **Live**              | `supabase/functions/redirect-qr/index.ts`                                       |
| Sequential routing (A, B, C rotation)                        | **Live**              | `redirect-qr` `routing_mode === "sequential"`                                   |
| Device routing (iOS / Android split)                         | **Live**              | `routing_mode === "device"`                                                     |
| **Time-of-day routing** (scanner's local timezone)           | **Live**              | `hourInTimeZone()` in `redirect-qr`                                             |
| Roulette routing                                             | **Live**              | `isRouletteMode` in `redirect-qr`                                               |
| Scan caps (`max_scans`) and expiry                           | **Live**              | `EditQRForm.tsx:251`, `enforce_dynamic_expiry_in_scan_counter`                  |
| Landing/splash page per code (title, subtitle, button)       | **Partial**           | `components/extras/SplashSettings.tsx`                                          |
| File drop with expiry, download caps, themes, unbranded      | **Live**              | `routes/f/[code].tsx`, `file_buckets` migrations                                |
| Library: list, search, quota bar, per-code scan count        | **Live**              | `components/LibraryDrawer.tsx` (1088 lines)                                     |
| Scan analytics captured (device, OS, browser, country, city) | **Captured, thin UI** | `scan_logs` insert in `redirect-qr`; UI shows only `scan_count`                 |
| Sync of library + history across devices                     | **Live**              | `utils/sync-phrase.ts`                                                          |
| SVG export, print guide, GS1 Digital Link                    | **Live**              | `utils/svg-export.ts`, `routes/guide/printing.tsx`, `utils/gs1-digital-link.ts` |

That list is genuinely strong. Time-of-day routing and per-device routing are
the features agencies charge monthly for.

## 2. What an industrial buyer asks for, that is missing

A meat manufacturer does not ask for a mixtape. They ask, in this order:

**1. Batch.** "I have 400 cartons. Here is a spreadsheet." There is **no
CSV/batch generation anywhere**. `batch` only appears in marketing copy. One QR
at a time, by hand, is the ceiling today — and it is the single biggest reason a
serious buyer walks.

**2. Batch download.** After generating 400 codes, they need a print sheet: PDF
or SVG, laid out, labelled with the row data, ready for the label printer. Only
single-code SVG export exists (`utils/svg-export.ts`).

**3. Export of their own data.** No CSV export of the library. A buyer's asset
register lives in a spreadsheet, and if they cannot get their codes out they
will not put them in.

**4. Dashboard and stats that answer a question.** The data is captured —
`scan_logs` has device, OS, browser, country, city, timestamp per scan — but the
UI surfaces a single integer per code. No time series, no breakdown, no export,
no "which branch got scanned most this month".

**5. PIN / access control.** Already exists — an earlier audit missed it by
grepping the wrong routes. Buckets carry `password_hash`, set in `create-bucket`
and verified server-side in `download-from-bucket`, `get-bucket-status` and
`upload-to-bucket`. The remaining work is surface, not security: making it
obvious in the UI and allowing a PIN on dynamic QR redirects as well as on file
lockers.

**6. Identity for the buyer, not just the code.** A Passport-authenticated API
surface exists (`x-passport-id` in `supabase/functions/_shared/auth.ts`), but
there are no customer API keys, no docs, no team seats, no audit trail and no
per-customer custom domain (`go.acme.com/line-4`). These are what turn 400
one-off codes into a contract.

## 3. Priority, by what actually unlocks revenue

| Order | Thing                                             | Why it gates money                                                                 |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1     | CSV in → 400 codes → PDF/SVG sheet out            | The entire "business with a spreadsheet" market                                    |
| 2     | CSV export of library                             | Without it, their codes are hostage — the exact thing we criticise competitors for |
| 3     | Stats dashboard: time series + breakdown + export | The reason people keep paying attention after month one                            |
| 4     | PIN-protected lockers                             | Makes "locker" an honest word                                                      |
| 5     | API + custom domain                               | Turns a purchase into an integration                                               |
| 6     | Team seats / audit log                            | Turns an integration into a contract                                               |

Everything above is additive to what exists. Nothing here is a rewrite.

## 4. The maths, without fantasy

Pricing already set: A$49 per app, 365 days, once-off, no subscription.

- **A$50k/year needs ~1,000 Passports sold.** That is a real business, and it is
  not a viral fantasy — it is 3 sales a day.
- **Infra at 1,000 businesses** (40 scans/day each = 1.2M scans/month), with
  redirects on Deno KV and files on R2: **~$45/month**. Spend caps on, so the
  bill cannot run away.
- **Gross margin** at that volume is north of 95%.

The wedge is not "we have more features than Bitly". It is **one-time price, no
hostage bill, and the code on the carton keeps working** — which is exactly the
thing the extractive market cannot say. But it only lands if the batch and
dashboard story is real, because the buyer with 400 cartons is the one who cares
most about never being held hostage.

## 5. What this means for launch

The Passport and recovery work (`SOFTSTACK-PASSPORT.md`,
`ACCOUNTS-RECOVERY-PLAN.md`) makes QRBuddy _trustworthy_. Batch + dashboard +
export makes it _sellable to a business_. Both are needed before a real launch,
and batch is the one that converts.

## 6. Decisions taken 2026-11-02 (and why)

**Tiers: yes, three — but one price per app, never a bundle.** Free (5 dynamic
codes, static forever, badge), Pro A$49/yr, Business A$199/yr, plus a A$22
one-time "own this one code forever" at the moment of download. The one-time
tier exists because the research is unambiguous: 4 of 5 activated users paid $15
once when the offer appeared _inside_ the creation flow, while a signup wall
lost 70% of people before their first code. Annual is a renewal, not a
subscription — nothing auto-charges, which is the whole pitch against the
$35/month incumbents.

**Dashboard: yes, and it is one page.** Paid users need one screen they can
leave open: their codes, what each one did this week, export, and the settings
that matter (PIN, domain, API key). Not a suite of tabs. The Library drawer
becomes that page rather than gaining a sibling.

**No signup wall, ever.** The Passport stays the front door; email is the
recovery key, not the gate. That is the structural edge over every competitor
that makes you register before you see a code.

**Two voices, one brand.** Maker surfaces stay playful. Money surfaces — batch,
stats, print, billing — get calmer and denser: bigger tap targets, real column
headers, no decorative noise between a person and their numbers. Delight where
it earns attention; quiet where someone is doing their job.
