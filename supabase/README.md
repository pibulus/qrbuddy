# Supabase Backend for QRBuddy

QRBuddy uses Supabase for dynamic QR redirects, destructible file shares, file
lockers, cleanup, and private file storage. The Fresh app should only know the
Supabase URL and anon key; service-role access stays inside Supabase Edge
Functions.

## Current Shape

- Project ref in production: `aqydpibnvlhcjcwosrti`
- Private storage bucket: `qr-files`
- Schema source of truth: ordered migrations in `supabase/migrations/`
- `supabase/setup.sql`: historical one-shot snapshot; do not use it to bootstrap
  or update production
- Edge function entry points: `supabase/functions/*/index.ts`; `_shared/` holds
  helper modules and is not deployable as a function

Functions:

- Shares: `upload-file`, `get-file`, `get-file-metadata`, `update-file`,
  `share-beacon`
- Lockers: `create-bucket`, `get-bucket-status`, `upload-to-bucket`,
  `download-from-bucket`
- Dynamic QRs: `create-dynamic-qr`, `get-dynamic-qr`, `update-dynamic-qr`,
  `redirect-qr`
- Supporter passes: `create-checkout`, `square-webhook`, `get-license`
- R2 uploads: `create-upload-url`, `finalize-upload`
- Operations: `cleanup-expired`, `health`

## Setup

```bash
supabase link --project-ref YOUR_PROJECT_REF

# Review which migrations are applied, then preview pending changes.
supabase migration list --linked
supabase db push --linked --dry-run

# Apply only after confirming the linked project is the intended target.
supabase db push --linked --yes

supabase secrets set \
  SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  APP_URL=https://qrbuddy.app
```

## Deploy Functions

Deploy one function while iterating:

```bash
supabase functions deploy get-file --project-ref YOUR_PROJECT_REF
```

Deploy all QRBuddy functions, skipping `_shared`. Public product functions have
`verify_jwt = false` in `supabase/config.toml`; keep those blocks in place so
browser publishable keys can call the functions.

```bash
PROJECT_REF=YOUR_PROJECT_REF
for directory in supabase/functions/*/; do
  name=$(basename "$directory")
  [ "$name" = "_shared" ] && continue
  supabase functions deploy "$name" --project-ref "$PROJECT_REF"
done
```

Production `cleanup-expired` currently runs daily at **17:00 UTC**. The
checked-in `supabase/cron.sql` is an older hourly example, not the live
schedule; confirm the actual scheduler on each operations review. Cleanup is
eventually consistent, so deletion timing depends on the last successful run.

## Auth Boundary

- Browser/Fresh requests send `apikey` for Supabase publishable keys. Legacy JWT
  anon keys also get `Authorization: Bearer <jwt>`.
- Public product edge functions disable Supabase's platform JWT gate and enforce
  QRBuddy authorization inside handlers with owner tokens, bucket
  PINs/passwords, short codes, and rate limits.
- Edge functions create Supabase clients with `SUPABASE_SERVICE_ROLE_KEY`.
- Internal download RPCs are granted to `service_role` only.
- Owner tokens and locker PIN/password checks happen in edge functions before
  database/storage mutations.

## File Semantics

- Single destructible downloads consume a use when the server starts returning
  the file.
- Finite multi-file shares are downloaded as one zip; direct sub-file downloads
  are rejected before the share is claimed.
- File lockers can be reusable, one-shot, or reusable-but-empty-on-download.
- Password-protected locker downloads use POST body auth, not query-string
  passwords.

## Smoke Checks

```bash
# Health
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/health" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Offline unit tests; this task has no network permission.
deno task test:unit
```

See `tests/README.md` for the offline suite, opt-in live integration tests, and
their project/credential boundaries.
