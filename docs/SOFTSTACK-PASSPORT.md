# SoftStack Passport — one code, one name, every app

> The plan for making the Passport a real cross-app identity, extracted from
> TalkType's working implementation. Supersedes §5 of
> `ACCOUNTS-RECOVERY-PLAN.md`. Written 2026-11-02 from the code, not memory.

## 1. How TalkType's passport actually works

Six pieces. They are small, and every one of them already works in production.

**a. The code is derived, not stored.**
`generateLicenseCode(seed)` = HMAC-SHA256(`talktype-license:<seed>`, secret),
formatted `TT-XXXX-XXXX-XXXX`. Two concurrent callers holding the same checkout
id mint a byte-identical code, so races are harmless no-ops.
→ `talktype/src/lib/server/supporter/licenseCrypto.js`

**b. The identity is a pure function of the code.**
`vaultHashForCode(code)` = SHA-256(`talktype-vault-id:<code>`), which seeds
`generateMemberIdentity()` → member name, 4-word phrase, avatar, skin palette.
No secret, no network, no lookup. Any device with the code can draw the whole
passport offline, and it looks identical every time.
→ `licenseCrypto.js`, `src/lib/cartridges/identityUtils.js`

**c. The entitlement is a signed token.**
HS256 JWT, claims `{ tier, exp, v }`, verified statelessly by HMAC. No session
table on the hot path.
→ `issueSupporterToken()` / `verifySupporterToken()`

**d. The store is per-app and boring.**
`codeHash → { term, entitlements, email stamps }` in the app's own storage
adapter. Only needed for the things that must survive: expiry, email-sent
stamps, revocation.
→ `src/lib/server/supporter/licenseStore.js`, `licenseTerm.js`

**e. The sync is already a shared module.**
`softstack:sync:v2` salt, `softstack:sync:room:v2` / `:key:v2` labels, PBKDF2
100k, then HKDF splits room id from AES-GCM key. The app passes a prefix
(`sync_` in TalkType, `zl_p` in ZipList) so two apps on one relay never collide.
→ `talktype/src/lib/softstack-sync/syncCrypto.js`, `ziplist/src/lib/services/realtime/syncCrypto.js`

**f. Recovery is a link plus a passkey.**
`/u/<code>` sets the code on the new device; the 4-word phrase stays the
human-readable secret. Email carries both, never the subject line.
→ `supporterEmail.js`, `routes/u/[code]/+page.svelte`

## 2. Why the same person gets three passports today

Only two lines differ between apps, and they are the two that decide identity:

| | TalkType | ZipList | QRBuddy |
|---|---|---|---|
| Code minted from | HMAC(`talktype-license:`) | HMAC(`ziplist-contributor-license:`) | `crypto.randomUUID()` |
| Identity namespace | `talktype-vault-id:` | `ziplist-vault-id:` | n/a — random secret in `localStorage` |
| Entitlements | one app | one app | none |

Because the namespaces differ, *the same person with the same words gets a
different name in each app*. Because the codes differ, they cannot be the same
passport even if the namespaces matched. QRBuddy is worse than both: its
identity is random and only exists on the device that made it.

Everything else is already shared or trivially shareable: the sync crypto, the
identity generator, the card component, and now the card renderer.

## 3. The design

One code. One identity. Per-app entitlements. No shared database.

**Code** — `SS-XXXX-XXXX-XXXX` = HMAC(`softstack-license:<seed>`, issuer secret).
Same derivation as TalkType, one shared secret, one namespace for everyone.

**Identity** — SHA-256(`softstack-vault-id:<code>`) → name, phrase, avatar,
skin. One person, one name, one card, in every app, forever.

**The rule that makes migration safe: identity is issued once and stored, not
recomputed.** At mint time the passport record keeps `{ name, phrase, avatarSeed }`.
New codes derive it; legacy `TT-`/`ZL-` codes keep whatever they had, because it
is written down. No one's name ever changes underneath them, and namespaces can
evolve without a rename storm. Derivation stays as the fallback for codes with
no stored record.

**Entitlements** — carried in the signed token:

```json
{ "sub": "<code hash>", "apps": ["talktype", "qrbuddy"], "tier": "passport", "exp": 1790000000 }
```

Each app verifies the same signature and checks its own name in `apps`. A bundle
is one code with three names in the array. A single-app purchase is one name.
No central call on the hot path.

**Storage** — stays per-app. Each app records the entitlement it redeemed. There
is no shared licence database to run, and nothing to keep in sync.

**Sync** — untouched. The prefix already keeps apps out of each other's rooms.

**Recovery** — one email, sent from whichever app the purchase happened in, with
the shared passport card and the `/u/<code>` door. Buying the second app with
the same email should *offer* to attach to the existing passport, not mint a new
one.

## 4. What moves where

Extract into a single canonical module, vendored into each app the way the rig
already vendors `softstack-sync` and the SOUL files:

```
softstack-passport/
  code.js       mint · normalize · verify        (from TalkType licenseCrypto)
  identity.js   derive-or-load identity          (from identityUtils + namespace)
  token.js      HS256 issue/verify + app claims   (from licenseCrypto)
  store.js      per-app record shape + term       (from licenseStore/licenseTerm)
  card.js       the passport PNG renderer         (built 2026-11-02)
  sync.js       re-export of softstack-sync
```

Vendored copies drift — that is a known fleet wound. So the repo gets a
`passport:sync` script plus a hash check in each app's test suite that fails
when a vendored copy stops matching the canonical one. Silent drift is the bug
this whole document exists to prevent.

## 5. Migration

1. Ship `softstack-passport` alongside the existing code. No behaviour change.
2. New purchases mint `SS-` codes with entitlements. Old codes keep working.
3. On redeem, a legacy code is upgraded in place: entitlement written, identity
   stored from what it already shows. Nobody wakes up with a new name.
4. QRBuddy adopts it at launch, so it never has a legacy population at all.

## 6. The money, done properly

Correction to what I said earlier: **$25 is Supabase's Pro list price, not a
product price.** Product pricing already exists and is not a subscription:

- TalkType Passport — A$59, 365 days (`talktype/src/lib/config/pricing.js`)
- ZipList Passport — A$29, once-off (`ziplist/src/lib/config/pricing.js`)
- QRBuddy Passport — A$49, 365 days (`docs/QRBUDDY-HOMEWORK-AND-MONEY-PLAYBOOK.md`)

Cost side, read from the providers' own pages today:

| | Free | Paid |
|---|---|---|
| Supabase edge invocations | 500k/mo | 2M/mo ($25 Pro, never paused) |
| Supabase DB / storage | 500 MB / 1 GB | 8 GB / 100 GB |
| Deno Deploy requests | 1M/mo | 5M/mo ($20 Pro) |
| Deno KV | 1M reads, 500k writes | 5M / 2.5M |
| R2 | 10 GB stored, **egress free** | $0.015/GB-mo, egress still free |

**The current shape is the expensive one.** Every scan is 1 Deno request *plus*
1 Supabase edge invocation *plus* a DB read *plus* an analytics write. The
binding limit is Supabase's 500k invocations — about 16,000 scans/day.

**The fix is small.** A redirect only changes when someone edits a QR, so serve
it from Deno KV: scan = 1 Deno request + 1 KV read, Supabase out of the hot
path. Analytics become a counter in KV flushed hourly instead of a row per scan.

At 400 businesses × 40 scans/day (480k scans/month):

| Shape | Monthly |
|---|---|
| Today, Supabase in the hot path | $25–45 (breaks at 500k) |
| KV redirects + R2 files + Deno Pro | **$20** |
| Same, with Supabase Pro for the dashboard | $45 |

Against 400 × A$49 = A$19,600 a year, that is noise. Against zero users it is
$0–45, which is why it stays free until there is revenue.

Two rules that stop the "massive bill" scenario entirely:

1. **Spend caps on** at both providers. The bill cannot run away.
2. **Retention on `scan_logs`.** Rows currently accumulate forever; at 480k
   scans/month that is ~96 MB/month and the database is a clock.

## 7. Decisions I am taking by default

- Identity is stored at issue, derived only as fallback. (Protects existing
  users' names, makes migration a non-event.)
- Entitlements live in the token, not in a central service. (No new bill, no new
  single point of failure.)
- R2 is the default file store; Supabase Storage is the fallback.
- Redirects move to Deno KV before QRBuddy sells a single Passport.
- Sync keeps its per-app prefix. Passport is shared; app data is not.

## 8. The one thing that needs a human

Whether a Passport is **one app** (A$49) or **a bundle** at a higher price, with
upgrades in between. That is a pricing decision, not a technical one — the token
shape supports either without code changes.
