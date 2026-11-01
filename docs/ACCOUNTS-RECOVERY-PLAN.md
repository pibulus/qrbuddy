# QRBuddy — Accounts, Recovery, and What Actually Breaks

> **Superseded in part:** the cross-app passport design lives in
> `SOFTSTACK-PASSPORT.md`. Read that first for §2 and §5.
>
> Written 2026-11-02 after reading the code, not from memory. Every claim below
> names the file it came from. If a claim and the code disagree, the code wins.
> Supabase limits are from https://supabase.com/pricing, read the same day.

## 1. Where QRBuddy actually stands

More is already built than it feels like at 2am.

| Piece             | State                                                                                                                               | Evidence                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Passport identity | **Built** — random UUID + 32-hex secret + moniker + 4-word phrase + tier                                                            | `utils/passport.ts`                                                                                             |
| Device sync       | **Built** — history, edit tokens, supporter pass, encrypted with a 4-word phrase                                                    | `utils/sync-phrase.ts`                                                                                          |
| Library (server)  | **Built, flag off** — codes, quota, scan counts behind `FEATURE_PLUS_LIBRARY`                                                       | `utils/library.ts`, `utils/auth.ts`, `supabase/migrations/20261014000000_recoverable_library_and_allowance.sql` |
| Dynamic QR        | **Live** — scan → routing engine → redirect, with per-scan analytics                                                                | `supabase/functions/redirect-qr/index.ts`                                                                       |
| File storage      | **Live** — Supabase bucket `qr-files`, with an R2 path for big files                                                                | `supabase/functions/upload-to-bucket/index.ts`, `20260812030000_r2_big_files.sql`                               |
| Email             | **Wired** — `email-passport` sends your own key via Resend (domain verified), 5/hour per IP, key verified server-side, never stored | `supabase/functions/email-passport/index.ts`                                                                    |

So "accounts need to be recoverable" is not a greenfield build. It's one hole in
something mostly assembled.

## 2. The hole, precisely

The three passports look alike and are not alike.

|                                           | TalkType                              | ZipList                                          | QRBuddy                              |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| Code format                               | `TT-XXXX-XXXX-XXXX`                   | `ZL-XXXX-XXXX-XXXX`                              | random UUID                          |
| Derived from                              | HMAC(`talktype-license:seed`, secret) | HMAC(`ziplist-contributor-license:seed`, secret) | `crypto.randomUUID()`                |
| Identity reproducible from the code alone | **Yes**                               | **Yes**                                          | **No**                               |
| Secret                                    | derived, server-verifiable            | derived, server-verifiable                       | random, lives only in `localStorage` |
| Hash namespace                            | `talktype-vault-id:`                  | `ziplist-vault-id:`                              | n/a                                  |

Evidence: `talktype/src/lib/server/supporter/licenseCrypto.js`,
`ziplist/src/lib/server/contributor/licenseCrypto.js`,
`qrbuddy/utils/passport.ts`.

Two consequences:

1. **The passports are not shared across apps, and never were.** Different
   prefixes, different HMAC secrets, different hash namespaces. They share a
   visual language and a component shape, not an identity. Cross-app SSO today
   is zero.
2. **QRBuddy's passport is not recoverable.** TalkType can rebuild an identity
   from the code because the code _is_ the derivation. QRBuddy stores a random
   id and a random secret in `localStorage`; the 4-word phrase drives _sync_,
   not _account_. Clear site data, lose the phone with no sync, or switch
   browsers, and the library, codes and files are gone with no way back. That is
   the exact failure Pablo is worried about, and it is real.

## 3. What "the flag has a bill" actually meant

Correction: the flag itself is free. What it turns on is a paid-tier
conversation, because QRBuddy's entire backend is Supabase — routing, library,
files, analytics.

Free tier ceilings that matter:

- **500,000 edge function invocations/month**
- **500 MB database**
- **1 GB file storage**
- 5 GB egress
- **Free projects pause after one week of inactivity**
- 2 active projects

Pro, $25/month, spend caps on by default: 2M invocations, 8 GB disk, 100 GB
storage, 250 GB egress, **never paused**.

The pause rule is the dangerous one. A paused project does not serve redirects.
Every QR already printed on a menu, a locker, a wedding table keeps working
until the project idles — and then resolves to nothing. That is worse than a QR
that never existed, because by then it is on paper.

## 4. The viral scenario, in numbers

Today a scan costs: 1 Deno Deploy request → 1 edge function invocation → 1 DB
read → 1 fire-and-forget analytics insert → 1 302.

The analytics insert does not block the redirect (`redirect-qr/index.ts` — "fire
and forget"), which is already correct.

**Calls.** 400 businesses × 40 scans/day = 16,000/day ≈ **480k/month**. That is
the free tier, exactly. One good week and it is over the line.

**Database.** `scan_logs` rows are never purged — there is no retention job in
`supabase/migrations/`. At ~200 bytes a row, 480k scans/month ≈ 96 MB/month, so
the 500 MB free database fills in about five months of healthy traffic.

**Files.** 400 businesses × 20 MB of menus, PDFs and photos = 8 GB against a 1
GB free bucket. The R2 path exists but is the exception, not the default.

**Verdict:** 400 businesses is comfortable on Pro + R2-as-default + analytics
retention. It is a cliff on Free, and the cliff is silent.

The architectural upgrade, if traffic ever really lands: the redirect answer
only changes when someone edits the QR, so it can be answered at the edge (Deno
KV or a Cloudflare Worker) with Supabase used for edits and dashboards. That
removes the function invocation from the hot path entirely. Not needed for 400
businesses. Worth knowing it exists.

## 5. The plan

### P0 — make the account survivable (no new money, no new decisions)

- Reuse the email system just wired: `qrbuddy.app` is verified, the send-only
  key is minted.
- Add a recovery email to the passport: `recovery_email` + a verification token
  - `recovery_sent_at` on the library user row.
- New edge function `send-recovery`: given an email, mail a one-tap link that
  re-issues the passport (id + secret) on a new device. Same shape as TalkType's
  `/u/<code>`: the link is the door, the passkey stays the secret.
- Rate-limit and constant-time it: the response must not reveal whether an email
  is registered.
- Mail copy in the same voice as the TalkType/ZipList Passport mails, with the
  passport card image attached (the renderer ports directly — it takes a code, a
  name and a QR, and consumes the same seeded palette functions).

_Owner: me. Risk: low, additive, behind the same flag._

### P1 — one identity instead of two

Right now the passport has an id/secret _and_ a sync phrase that do different
things. That is a bug shaped like a feature. Decide:

- **Option A (keep random, store recoverable):** passport stays random, the
  server stores it wrapped by the verified email. Recovery = email. Cheapest, no
  migration, works with what exists.
- **Option B (derive, like TalkType):** passport identity derived from a signed
  code. Recovery = code, email is just delivery. Costs a migration for existing
  passports and a re-issue path for anyone already holding a random one.

Recommendation: **A now, B later if cross-app identity is ever wanted.** A is a
week of my time; B is a project.

### P2 — history and settings sync, done properly

Already 80% there: `utils/sync-phrase.ts` syncs history with merge. What is
missing is the same rigour TalkType and ZipList already have:

- tombstones for deletes (so a deleted QR does not resurrect from another
  device)
- per-item change timestamps
- a stable item key that is not the local array index
- settings alongside history (design preferences are already a separate sync —
  `utils/design-preferences.ts` — fold them into the same envelope)

Collapse the phrase and the passport into one secret so there is one thing to
remember and one thing to lose.

_Owner: me. Risk: medium — merge bugs are the class of bug that eats data._

### P3 — the money and the ceilings (needs Pablo)

- Supabase Pro, $25/month, **spend cap on**. Removes pausing, multiplies
  invocations 4×, storage 100×.
- Make **R2 the default** for files, not the fallback for big ones. R2 has no
  egress bill, which is the cost that actually bites on a file-sharing app.
- **Retention job for `scan_logs`** (90 days raw, monthly rollups for the
  dashboard). Without it the database is a clock.

_Owner: Pablo, one dashboard decision + one card._

## 6. Open decisions

1. Recovery by email only, or email **and** a printed recovery code?
2. Pro now, or stay Free and accept that a paused project breaks printed QRs?
3. Cross-app passport: never, or a deliberate shared issuer later?

Nothing else here is blocked on a decision. P0 and P2 are work I can start and
finish without another conversation.
