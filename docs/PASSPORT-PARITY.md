# Passport parity — evidence, the one spec, and the prompt that fixes it

> Written 2026-11-02. Everything in §1 was measured, not remembered. This is the
> canonical document for the Passport across TalkType, ZipList and QRBuddy.

## 1. Evidence: they are not the same, and never were

Five files are called "the passport" in TalkType and ZipList. Measured today:

| File                    | TalkType | ZipList | Differing lines |
| ----------------------- | -------- | ------- | --------------- |
| `MembershipCard.svelte` | 1019     | 1023    | **1872**        |
| `identityUtils.js`      | 319      | 422     | **685**         |
| `passportSkins.js`      | 369      | 306     | **569**         |
| `passportPalettes.js`   | 166      | 152     | **256**         |
| `passportAvatar.js`     | 145      | 152     | **199**         |

QRBuddy has **no card component at all** — no `MembershipCard`, no holofoil, no
skin system. Its passport is `utils/passport.ts`: a random UUID and a random
secret in `localStorage`.

The good news: for the same input hash, all three currently produce the same
`Fizzy Penguin / fizzy-penguin-wanders-quietly` and the same
`Mango / oily /
soft / bottts` skin. The **algorithms agree today**. They are
three copies with no shared source and no drift check, which is exactly why they
will not agree next year — and why every "it's the same" claim so far has been
true only by luck.

The real identity break is elsewhere: identity is derived from the **code**, and
every app mints its own code from its own secret with its own namespace
(`talktype-vault-id:` vs `ziplist-vault-id:`). So one person buying two apps
gets two codes and therefore two passports. That is not a rendering bug; it is
the design.

## 2. The one spec

**A Passport is a person. A stamp is an app.**

- One passport: one code, one name, one phrase, one card, one skin.
- Stamps are entitlements: `talktype`, `ziplist`, `qrbuddy`. You buy a stamp; it
  lands on the passport already held.
- No bundles. Stamps are added one at a time, whenever someone wants the next
  app.
- Adding a stamp never renames anybody and never re-renders a different card.

### 2.1 Code

`SS-XXXX-XXXX-XXXX` = HMAC-SHA256(`softstack-passport-code:<seed>`, issuer
secret), uppercase hex, first 12 chars, grouped by 4.

Deterministic: the same seed mints the same code anywhere, so two concurrent
callers are a no-op instead of a race.

### 2.2 Identity

`vaultHash = SHA-256('softstack-passport-id:' + canonicalCode)` →
`generateMemberIdentity(vaultHash)` → name, phrase, avatar, skin.

One namespace for every app, so the same passport looks the same everywhere.

**Identity is issued once and stored.** The passport record keeps
`{ code, name, phrase, avatarKey, createdAt }`. Derivation is the _fallback_ for
records without a stored identity, and the migration path for legacy `TT-`/`ZL-`
codes. Nobody is ever renamed by a code change.

### 2.3 Stamps

Stamps live in the signed token and in the per-app store:

```json
{
  "sub": "<passport id>",
  "stamps": ["talktype"],
  "tier": "passport",
  "exp": 1790000000
}
```

HS256, verified statelessly with the shared issuer secret. Each app checks its
own name in `stamps`. Adding a stamp is a re-issue of the token with one more
entry; the passport identity is untouched.

### 2.4 Storage

Per app, as now: each app records the passport it redeemed and its own stamp. No
shared database, no new service, no central call on the hot path.

### 2.5 Sync

Unchanged: `softstack:sync:v2`, PBKDF2 100k, HKDF split, per-app prefix
(`sync_`, `zl_p`, `qr_`). The passport is shared; app data never is.

### 2.6 Card

Exactly one `MembershipCard` implementation and exactly one PNG renderer
(`passportCard.js`, built 2026-11-02). Same skins, same palettes, same avatar
collections, same renderer output for the same passport — in the app, in the
modal, and in the email.

## 3. The module

```
softstack-passport/
  code.js        mint · normalize · compare        (from TalkType licenseCrypto)
  identity.js    generateMemberIdentity + namespace
  skins.js       passportSkins + passportPalettes + passportAvatar
  token.js       HS256 issue/verify + stamps
  store.js       record shape + term/expiry
  card.js        the PNG renderer
  card/          MembershipCard.svelte (single copy, app-agnostic props)
  sync.js        re-export of softstack-sync
  index.js
```

Vendored into each app, Canonical copy lives in **one** repo. A hash check runs
in every app's test suite and **fails loudly** when a vendored copy stops
matching. Silent drift is the failure this whole document exists to prevent.

## 4. The prompt

Copy everything between the lines into whichever AI CLI is working on this. It
is written to be un-lieable: no claim counts without the command output.

---

You are extracting a shared Passport module used by three apps in this rig:
`~/Projects/active/apps/talktype` (SvelteKit), `~/Projects/active/apps/ziplist`
(SvelteKit) and `~/Projects/active/apps/qrbuddy` (Deno Fresh).

Read `~/Projects/active/apps/qrbuddy/docs/PASSPORT-PARITY.md` first. It is the
spec. Do not redesign it; implement it.

### Goal

One Passport implementation, vendored into all three apps, with **zero behaviour
change for existing holders**. A Passport is a person; a stamp is an app. There
are no bundles: stamps are added one at a time to the passport a person already
holds.

### Hard rules

1. **One source of truth.** All passport code lives in a single module. The
   three existing copies are deleted, not edited.
2. **Never rename an existing holder.** Identity is stored at issue; derivation
   is only a fallback. Legacy `TT-` and `ZL-` codes keep the exact name and
   phrase they show today.
3. **Stamp, don't bundle.** Adding an app adds one entry to `stamps`. It never
   changes the code, name, phrase, avatar or skin.
4. **No new infrastructure.** Storage stays per app. No shared database, no new
   service, no per-request network call added to any hot path.
5. **Sync stays per-app prefixed.** Passport shared, app data not.
6. **Evidence, not adjectives.** Every "done" claim must be accompanied by the
   command output that proves it. If you have not run it, do not claim it.

### Steps

1. Create the module with the file layout in §3. Port the code from TalkType
   (`src/lib/cartridges/*`, `src/lib/server/supporter/licenseCrypto.js`) — it is
   the reference implementation.
2. Make `MembershipCard.svelte` app-agnostic: it takes `appName`, `stampList`,
   `passport` and `skinSeed`; it stops importing app-specific services.
3. Vendor the module into all three apps. Replace the local copies. Delete the
   forks — `git rm`, do not leave them as redirects.
4. Wire stamps: TalkType and ZipList keep selling their own Passport exactly as
   now; the difference is that the code minted is `SS-`, the namespace is
   shared, and the token carries `stamps: ["<app>"]`.
5. Add the drift check: a test in each app hashing the vendored files against
   the canonical manifest, failing with the list of drifted files.
6. Add the migration path: on redeem, a legacy `TT-`/`ZL-` code is upgraded in
   place — identity written from what it already displays, stamp recorded.

### Acceptance tests — run all of these and paste the output

```sh
# 1. Every app renders the same card for the same passport
node scripts/passport-parity.mjs   # prints name/phrase/skin from all three apps

# 2. No forks left
rg -l "passportSkins|passportPalettes|identityUtils" \
  ~/Projects/active/apps/{talktype,ziplist,qrbuddy} \
  -g '!node_modules' -g '!softstack-passport'

# 3. Drift check passes (and fails when you deliberately edit one vendored file)
npm test -- --run            # talktype
npm run check                # ziplist
deno task test               # qrbuddy

# 4. Existing holders keep their name
#    golden fixture: legacy code → expected name/phrase, asserted in all three

# 5. Builds
npm run build                # talktype, ziplist
deno task build              # qrbuddy
```

### Report format

For each of the five items above: the command, its real output, and pass/fail.
Then a list of anything you could not do, with the exact blocker. Do not
summarise away a failure.

---

## 5. What "parity" will mean when this is done

- The same passport shows the same name, phrase, avatar, skin and card in
  TalkType, ZipList and QRBuddy, and in the purchase email.
- One copy of the code, enforced by a check that fails when it drifts.
- A second stamp changes one array, nothing else.
- Nobody's name changed during the migration.

## 5. Measured status after the QRBuddy email pass (2026-11-02)

| Piece                  | TalkType                           | ZipList              | QRBuddy                                      | Parity                                         |
| ---------------------- | ---------------------------------- | -------------------- | -------------------------------------------- | ---------------------------------------------- |
| Code format            | `TT-XXXX-XXXX-XXXX`                | `ZL-XXXX-XXXX-XXXX`  | random UUID                                  | **No**                                         |
| Code derived from seed | yes                                | yes                  | no                                           | **No**                                         |
| Identity from code     | `talktype-vault-id:`               | `ziplist-vault-id:`  | random name/secret                           | **No**                                         |
| Token claims           | tier + app                         | tier + app           | `tier`, `stamps: ["qrbuddy"]` (new), exp     | **Shape aligned, secret/namespace not shared** |
| Passport email         | code + phrase + `/u/<code>` + card | code + phrase + link | key + phrase + name + one-click restore link | **Yes (recovery content)**                     |
| Email delivery         | Resend                             | Resend               | Resend (`email-passport`)                    | **Yes**                                        |
| Email rate limit       | per-request limiter                | 5/min                | 5/hour per IP                                | **Equivalent intent**                          |
| Sync                   | `softstack:sync:v2`, app prefix    | same                 | same                                         | **Yes**                                        |
| Card component         | `MembershipCard.svelte`            | its fork             | none                                         | **No**                                         |
| Skin/palette/avatar    | shared algorithms, forked files    | fork                 | none                                         | **No**                                         |

So: recovery now behaves the same in all three (email carries what a person
needs), and QRBuddy's token is shaped for stamps. The identity is still not
shared — that is the `SS-` module migration in §3/§4, and it cannot be faked by
copying email HTML.

## 6. Executed 2026-11-02 — identity parity is live

No app has legacy holders, so the cut was clean rather than migrational.

**Canonical module:** `~/Projects/active/_shared-modules/passport/` (`code.js`,
`identity.js`, `index.js`, `test-vectors.json`, `manifest.json`). Vendored
byte-for-byte into TalkType `src/lib/softstack-passport`, ZipList
`src/lib/softstack-passport` and QRBuddy `utils/softstack-passport`.

| Piece          | Now                                                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Code           | `SS-XXXX-XXXX-XXXX` from HMAC(`softstack-passport-code:<seed>`) in all three                                                  |
| Identity       | SHA-256(`softstack-passport-id:<code>`) → same name/phrase/avatar/skin everywhere                                             |
| Member id      | The `SS-` code itself, not `TT-`/`ZL-`                                                                                        |
| Token          | HS256 with `stamps: ["talktype" \| "ziplist" \| "qrbuddy"]`, signed by `SOFTSTACK_PASSPORT_SECRET` in all three               |
| Recovery email | code + phrase + restore link in all three (QRBuddy adds the key and name)                                                     |
| Sync           | unchanged `softstack:sync:v2`, per-app prefixes                                                                               |
| Cards          | still two Svelte forks; QRBuddy has no MembershipCard. Same identity now feeds them, so they render the same name/phrase/skin |

Secret is set in Supabase and both Netlify production environments. Deployed:
TalkType `f3a3347`, ZipList `e7fdbad`, QRBuddy `e470f78` (function deploy; site
build followed). Vector tests pin the same code/name in all three.

## 7. Card shipped (2026-11-02)

The card extraction is done. Canonical assets in `_shared-modules/passport/`:
`skins.js`, `palettes.js`, `avatar.js`, `card.css`, `card.html.js` (pure
renderer). Vendored byte-identically into all three apps; thin wrappers own only
state and app adapters. TalkType and ZipList card forks are deleted; QRBuddy
renders the same card through Preact.

Live verification with the vector passport (`SS-03D2-9722-1310`): all three show
`Glitch Walrus` / `glitch-walrus-ripples-harbourside` / `Grape Soda` / the same
skin, at 343×216 on desktop. Differences are intentional: the kicker word and
the per-app QR payload.

QRBuddy's card (DiceBear included) is dynamically imported only when the
Passport modal opens, so the home bundle does not pay the ~163 KB chunk. Per-app
deploys: TalkType `5fd4cd5`, ZipList `24f1df2`, QRBuddy `25edb53`.

**One residual:** the canonical module repo has no remote yet — recoverable via
local history, not off-machine. Add a private GitHub remote when convenient.
