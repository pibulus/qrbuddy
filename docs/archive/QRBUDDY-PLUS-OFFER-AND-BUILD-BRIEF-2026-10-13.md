# QRBuddy Plus: proposed offer and first build package

13 October 2026. Baseline inspected: `f9384e2`, clean `main` before this
document. This is a concrete recommendation for the next release, not the
current offer or an instruction to change production pricing immediately. It
supersedes the earlier recommendation to make media retention the sole paid
proposition.

## The commercial decision

Keep QRBuddy a general-purpose QR generator. Sell the convenience and capacity
needed when making and managing QR codes becomes regular work. Its compact,
accessible interface is the product advantage; the paid benefits need to give
that advantage a purchase trigger.

Proposed name: **QRBuddy Plus**. Proposed launch price:
**A$59 for 365 days**, paid
once, manual renewal. One paid plan. This is a test price, not an established
optimum. The current A$49 constant is an implementation detail, not a reason to
keep that price. At A$59, 1,000 annual purchases produce A$59,000 gross before
fees, infrastructure, support and tax; that is arithmetic, not a demand
forecast.

The short proposition: **Brand it once. Make the whole set. Update it later.**

| Capability                                               | Free                                               | Plus launch target                                             |
| -------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Static codes, styles, logos, framed PNG/SVG, last design | Existing complete experience                       | Same                                                           |
| New editable codes                                       | Up to 5 per recoverable library                    | Up to 100 per recoverable library                              |
| Individual destination edits and current basic stats     | Included                                           | Included                                                       |
| Saved named brand designs                                | Remember the last design                           | Up to 20 named designs                                         |
| Batch production                                         | One at a time                                      | Up to 50 URL rows per batch; preview, PNG/SVG ZIP and manifest |
| Management                                               | List, find, rename, recover, edit individual codes | Collections and multi-select workflow                          |
| Existing file/share functionality                        | Existing published limits                          | Preserve existing larger-file and supported branding benefits  |

The 5/100 limits are total current codes, not hourly or annual creation credits.
Bulk dynamic creation also consumes available library capacity. Static batches
do not. These are starting allowances to test, not measured optimal limits.

Longer hosted-media retention and richer cross-code reporting can expand Plus
later. Neither belongs in the launch promise until actually implemented and
verified. Custom domains, teams, APIs and new routing modes are deferred.

An occasional user can finish for free. A designer handling several clients, a
school making a set of labels, or an owner managing many products has clear
reasons to buy. Those examples describe repeat work, not a niche restriction.

## Evidence and tradeoffs

Official pricing checked on this date:

- [Hovercode](https://hovercode.com/pricing/) offers 3 free dynamic codes and
  100 on Pro, with branding, domain and analytics benefits; bulk creation is in
  a higher tier. This supports capacity plus workflow as a market model.
- [QRCodeChimp](https://www.qrcodechimp.com/pricing) offers 10 free dynamic
  codes and 50 on Starter, with different scan allowances and analytics tiers.
- [QRCode Monkey](https://www.qrcode-monkey.com/) provides free design and
  vector exports while promoting professional editing and management tools.

Those pages establish advertised offers, not company profitability or QRBuddy
conversion rates. The competitive inference is that familiar paid QR utility can
be packaged in QRBuddy's more approachable interface.

Local code establishes several dependencies:

- `create-dynamic-qr/index.ts` currently allows 10 creations/hour free and
  100/hour with a valid pass, per IP. It has no per-library total allowance.
- `utils/history.ts` is a local 50-item history, not a durable paid library.
- `_shared/license.ts` has tier/version/issued/expiry claims but no stable
  purchaser or library identifier. A browser pass alone cannot reliably count a
  customer's codes across devices or tie together renewals.
- `utils/sync-phrase.ts` restores from an encrypted backup plus its phrase. A
  phrase alone does not fetch a remote backup. Basic existing backup and
  owner-token recovery must remain available.
- `islands/Analytics.tsx` reports generation after typing and accepts an
  `upgrade=success` query as a conversion signal. Neither proves a sale.
- `types/pricing.ts` and `_shared/square.ts` still describe/enforce A$49.

Introducing a free total allowance changes the offer for future creation. It
must be stated plainly, not described as an existing restriction. Do not
silently paywall codes people already made. Do not deploy a creation cap before
Plus is usable and purchasable.

For the recoverable library, recommend passwordless email sign-in only when
someone chooses new editable codes or saved work. Keep the static generator
instant and account-free. This deliberately changes the current blanket "Zero
accounts" positioning: say "No sign-up for static codes" once true in the
released flow. Existing owner links continue working without signing in.
Recovery is a basic service for both plans, not a paid rescue fee.

## Code and pass lifecycle contract

- Give all pre-launch codes an explicit legacy designation. Existing redirects,
  editing and configured behavior remain intact; importing them requires owner
  proof and does not consume the new allowance. Timestamp guessing by a client
  must not grant legacy status.
- A free library can hold 5 non-legacy editable codes; an active Plus library
  can hold 100. Prevent concurrent requests from overshooting. IP throttles
  remain separate abuse controls, not a substitute for per-library accounting.
- On Plus expiry, existing redirects and individual editing continue, subject to
  owner-set expiry/scan limits and normal service availability. No inserted ads,
  payment splash, or expiry imposed just because a pass ended.
- A lapsed library already above 5 keeps its codes but cannot create additional
  ones until renewed or genuinely below the free allowance. Hiding/archiving a
  code does not release capacity while its redirect is still active.
- Plus expiry stops new batch jobs and paid collection/brand-design changes.
  Existing data stays readable and exportable; individual QR downloads remain
  available. Do not silently destroy saved designs or collection membership.
- Renewal extends from `max(now, paid_through)` for the same library. It is not
  a new identity and does not reset limits or erase existing data. Preserve any
  already purchased Supporter benefits; verify the paid ledger when migrating.
- State the service dependency honestly. No absolute "permanent hosting"
  promise. Legacy self-destruct/owner-set expiry behavior still applies.

Keeping codes usable after expiry means code capacity alone will not guarantee
renewal. Repeat batch/design/management utility must earn renewal. Measure that
rather than assuming recurring revenue from every first purchase.

## Conversion and first customers

Replace "Supporter" with "Plus" when the complete new offer ships. Keep the
existing compact modal and footer pill. Add contextual entry points when a
person tries to create a sixth code, save a named brand design, or make a batch.
Explain the benefit and price before checkout, retain entered work, and leave
the free generator usable. Do not interrupt every ordinary download.

Proposed offer copy, only after all listed benefits work:

> QRBuddy Plus
>
> Brand it once. Make the whole set. Update it later.
>
> 100 editable codes · 20 saved designs · batches of up to 50
>
> A$59 for 365 days. No automatic renewal.

First acquisition work should show those exact jobs: a short real demo of a
branded batch and a later destination update, plus a focused bulk-generator page
alongside the existing menu and printing pages. Publish claims only for working
features. Invite people already making several codes for work to try their real
task; log the purchase trigger and objection. Outreach is a human task unless
separately authorized; do not autonomously post or message people.

Track a small funnel: successful export initiation, successful dynamic creation,
returning use, contextual offer impression/click, checkout start,
server-confirmed settled purchase, successful recovery and refund. Do not log
entered URLs, emails, owner keys, checkout bearer IDs or media contents in
analytics. Count unique settled purchases from the payment ledger, not URL
parameters or repeated client claims. Show denominators and compare triggers; do
not confuse traffic with buyers. Aim for the first 20 actual buyers, then
inspect what they used.

If people do not see an offer, fix discovery. If interested people abandon
checkout, inspect checkout and trust. If qualified repeat users can do their
whole task free and see no benefit, revisit the allowance/package. Change price
after learning the objection; do not start with discount codes or invented
urgency.

## Build sequence

1. **Recoverable library and quota foundation:** identity, ownership migration,
   durable listing, stable entitlements and atomic allowance enforcement behind
   an off-by-default release flag. Use the first prompt below.
2. **The paid workflow:** named designs, collections and bounded batch creation
   with recovery from partial failures. Reuse current export rendering. Test a
   complete repeat-user task with the proposed offer visible in a local build.
3. **Sell the finished package:** align price/product/terms in both languages,
   repair conversion telemetry, prove checkout, renewal, recovery and lapse;
   enable the new offer and free allowance together. Real payment verification
   and external configuration remain explicit release steps, not mock evidence.

### Paste-ready first implementation prompt

```text
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.
Read CLAUDE.md and docs/QRBUDDY-PLUS-OFFER-AND-BUILD-BRIEF-2026-10-13.md.
Implement only package 1: a recoverable editable-code library and the allowance
foundation, behind an off-by-default rollout flag. This is implementation, not
another commercial audit. Baseline inspected was f9384e2 on main. Inspect current
status first, preserve all existing work, and report any baseline drift.

PRODUCT CONTRACT
- Instant static generation/design/export remains account-free and unchanged.
- New library flow uses passwordless email sign-in through Supabase Auth.
  Present it when choosing saved editable work, not on first page load. Keep
  entered destination/design across sign-in and errors. Existing owner-token
  edit routes and old backup imports remain usable without an account.
- Follow current official Supabase guidance for email OTP, server verification
  and production email delivery. Start with
  https://supabase.com/docs/guides/auth/auth-email-passwordless .
  Do not claim local configuration or mocked email proves production delivery.
- Free total allowance 5; active Plus 100. Use stable library identity and
  atomic database operations. Prevent overshoot from parallel requests,
  duplicate retries and multiple browsers. Use request idempotency.
- Legacy codes are grandfathered; a verified owner token is required to claim
  one. Import must be idempotent, preserve original identity/settings and not
  steal another library's ownership or consume new allowance.
- Lapsed owners retain redirects and individual edits. If above the free limit,
  creation stops, not scans. Archiving a live code cannot free a quota slot.
- The library lists and finds codes reliably beyond the old 50-item history
  cap and on a second browser. Provide a usable title and individual edit entry.
  Keep Time Machine local history separate and readable; do not reinterpret
  it as the authoritative ownership database.
- Define stable server entitlements and bind new checkout attempts to the
  verified library identity. Fulfillment must be idempotent and early renewal
  must extend the existing paid-through date. Preserve A$49/current product
  copy and checkout-disabled behavior in this package; A$59 is a later rollout.
- Do not identify a purchaser by the current pass text or its iat/exp claims.
  Verify legacy paid records before migrating an old pass, preserve purchased
  benefits, and report any manual-recovery case. No production test entitlement
  endpoint or browser-controlled tier flag.

SCOPE AND INTEGRATION
- Focus on new migrations/library/auth helpers, create/get/update dynamic QR
  functions, a compact library/sign-in island, and minimal wiring in existing
  CreateModal/history/owner flows. Payment helper changes are limited to stable
  identity, entitlement and renewal plumbing, not price or activation changes.
- Inspect utils/api.ts and api-request.ts: existing Authorization headers are
  for anon requests. Add deliberate authenticated requests without breaking
  existing file/locker/public endpoints or trusting unsigned client claims.
- Server authorization and database grants/RLS must prevent library A from
  reading, modifying, claiming or spending library B's objects/entitlement.
  Do not expose owner bearer tokens in analytics, logs or library responses.
- Keep new behavior off by default on client AND server; with the flag off,
  existing creation/checkout behavior must remain unchanged. No public free cap
  until the later paid launch is ready. With it on, direct anonymous POSTs must
  not bypass the new allowance. Do not change the redirect hot path to require
  sign-in or a valid subscription on every scan.
- Preserve QRBuddy's compact cream cards, chunky controls, mobile sheets and
  current hierarchy. No dashboard redesign or sign-in wall for static use.
  Explain expiry/capacity using plain product language. No we/us in UI copy.
- No brand-kit/batch/media-retention implementation in this package. No custom
  domains, teams, APIs or new pricing tiers. Do not wipe localStorage, reset the
  database, commit, push, deploy, activate checkout, purchase, or email real
  people. Use local/staging test identities and a captured local mail flow.

VERIFICATION AND HANDOFF
- Use local/staging migrations and real local database assertions for races:
  4 of 5 slots + 2 simultaneous creates -> exactly one new code; retried request
  -> same result; a forged tier fails; a second library cannot access the first.
- Verify legacy import, duplicate import, conflicting claim, >50-item listing,
  expired pass with retained edits/scans, renewal without duplicate extension,
  flag-off backward compatibility, and reset storage followed by real recovery.
- Browser check the actual create -> sign-in -> library -> edit flow at 320px
  and desktop, plus Spanish and a second browser context. Show the auth failure
  and retry path without losing the prepared QR. Keep private fixtures private.
- Run deno task check, deno task test:unit, deno task build and any new focused
  integration suite. Existing offline tests do not prove database authorization.
- Return scoped diffs, commands and results, real screenshots, remaining
  provider/email/payment setup, migration and rollback notes. Distinguish real
  local Auth/database evidence from mocked UI evidence and production proof.
  Record results in docs/PLUS-LIBRARY-RESULTS-2026-10-13.md. Leave changes
  uncommitted for review. Do not announce Plus as sellable after package 1.
```
