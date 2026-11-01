# Deploy runbook — what is blocked and the exact commands to unblock it

> Written 2026-11-02 after five `deno deploy` attempts in one night all returned
> "You have exceeded the deployment limit of 15 per hour for your plan".
> Everything below is copy-pasteable.

## 1. The blocker, stated plainly

The Fresh app (batch page, `/developers`, `/api` proxy, `/stats`, CSV export,
cover-page branding) is committed and builds locally, but **none of it is
live**. `https://qrbuddy.app/version.json` still reports an older build and
`/batch`, `/developers`, `/stats` all 404.

The Supabase side is live: `api_keys`, `library_scan_stats`, `library-stats`,
and the PIN enforcement in `redirect-qr` are all deployed and verified.

Why the limit keeps biting even across hours: `deno deploy` counts deploys per
org per hour, and pushes to `main` may also trigger a deploy through Deno
Deploy's git integration — so a busy evening spends the budget before the CLI
even runs. Check the Deploy dashboard's recent activity before assuming the
quota is wrong.

## 1b. The stale-snapshot trap (cost an hour on 2026-11-02)

Symptom: a brand-new route under `routes/api/` returned Cloudflare **520** and
`x-deno-error 500` in production while `routes/api/peek.ts` kept working — and
the same route was fine locally.

Cause: `_fresh/` is gitignored but the CLI uploads it. A deploy whose source
carried a **new `fresh.gen.ts` next to an old `_fresh` snapshot** ships a
manifest naming routes that are not in the bundle, and the request dies before
any handler runs. Rebuilding first is the fix, and it is now part of the routine
below.

## 1c. The /api and /v1 proxy failure (open, 2026-11-02)

Symptom matrix, measured against production and the *.deno.net preview host:

| Path                              | Old file?    | Result                                         |
| --------------------------------- | ------------ | ---------------------------------------------- |
| `/api/peek`, `/api/download-file` | yes          | works (400 / 302)                              |
| `/api/health`, `/api/api-keys`    | added later  | 520 on the domain, connection reset on preview |
| `/v1/[fn]`, `/v1/ping`            | new folder   | 520 / 500                                      |
| `/stats`, `/batch`, `/developers` | new, at root | 200                                            |

Ruled out: route shape (literal handler and factory both fail), imports
(self-contained file fails too), the manifest (`fresh.gen.ts` lists them
correctly), Cloudflare (the preview host fails the same way), and a stale
`_fresh` (rebuilt before deploy, no change).

Next thing to try: deploy with `--ignore _fresh` so the platform builds its own
snapshot instead of reusing the uploaded one, and compare. Until then the docs
name the verified base URL (the Supabase functions host) and `qrbuddy.app/v1`
stays staged but unpromised.

## 2. Deploy

```sh
cd ~/Projects/active/apps/qrbuddy
rm -rf _fresh && deno task build   # never deploy a stale snapshot
git status                     # must be clean
source ~/.config/api_keys
deno deploy --prod --org pibulus --app qrbuddy --token "$DENO_DEPLOY_TOKEN_NEW"
```

Verify — all four must be 200, and version.json must name the current commit:

```sh
curl -s https://qrbuddy.app/version.json
for p in /batch /developers /stats; do curl -s -o /dev/null -w "$p %{http_code}\n" "https://qrbuddy.app$p"; done
curl -s -X POST https://qrbuddy.app/v1/api-keys \
  -H "x-passport-id: $(uuidgen | tr 'A-Z' 'a-z')" \
  -H "content-type: application/json" -d '{"name":"post-deploy"}' | head -c 120
```

If the last command prints a `qb_…` key, the API proxy is live end to end.
Revoke it afterwards from `/developers`.

## 3. Turning the library on — the decision, not a chore

`FEATURE_PLUS_LIBRARY` is off. Until it is on, codes created through the app are
not attached to a Passport, `/library` refuses, and the documented rule "a key
acts as your Passport" is architecturally true but not operationally true.

What flips when it goes on:

- creation requires a Passport (or API key) instead of being anonymous;
- the 5 free / 100 Plus quota starts applying through
  `create_library_dynamic_qr`;
- codes get `user_id`, so `/library`, `/stats` and `library_scan_stats` have
  data;
- the Library drawer becomes the dashboard it was designed to be.

Command (Management API, no dashboard clicking):

```sh
source ~/.config/api_keys
curl -s -X PATCH \
  "https://api.supabase.com/v1/projects/aqydpibnvlhcjcwosrti/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "content-type: application/json" \
  -d '{"FEATURE_PLUS_LIBRARY":"true"}'
```

Then redeploy the functions that read the flag (`create-dynamic-qr`, `library`,
`library-stats` are already flag-aware) and keep one rollback in your pocket:

```sh
# rollback
curl -s -X PATCH "https://api.supabase.com/v1/projects/aqydpibnvlhcjcwosrti/secrets" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "content-type: application/json" -d '{"FEATURE_PLUS_LIBRARY":"false"}'
```

**Do this with the app open**, not blind: the first anonymous create after the
flip should now be refused with `SIGNIN_REQUIRED`, and the first Passport create
should appear in `/library`. If both are not true within five minutes, roll
back.

## 4. What is queued next, in order

1. **Merge the two batch paths.** `SmartInput`'s static ZIP batch and `/batch`'s
   dynamic batch are two half-doors. One page, one mental model.
2. **Canva submission** — `docs/CANVA-APP.md` §5 is the only step left, and it
   needs a human login.
3. **Custom domain for the API** (`go.brand.com`) — the biggest B2B trust
   upgrade left. Cloudflare for SaaS + one CNAME per customer.
4. **`scan_logs` retention** — rows currently accumulate forever; 90 days raw
   plus monthly rollups keeps the free database from becoming a clock.
