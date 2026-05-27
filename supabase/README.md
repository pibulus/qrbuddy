# Supabase Backend for QRBuddy

QRBuddy uses Supabase for dynamic QR redirects, destructible file shares, file
lockers, cleanup, and private file storage. The Fresh app should only know the
Supabase URL and anon key; service-role access stays inside Supabase Edge
Functions.

## Current Shape

- Project ref in production: `aqydpibnvlhcjcwosrti`
- Private storage bucket: `qr-files`
- Bootstrap schema/RPC script: `supabase/setup.sql`
- Incremental schema history: `supabase/migrations/`
- Edge functions: 13 in `supabase/functions/`

Functions:

- `upload-file`, `get-file`, `get-file-metadata`
- `create-bucket`, `get-bucket-status`, `upload-to-bucket`,
  `download-from-bucket`
- `create-dynamic-qr`, `get-dynamic-qr`, `update-dynamic-qr`, `redirect-qr`
- `cleanup-expired`, `health`

## Setup

```bash
supabase link --project-ref YOUR_PROJECT_REF

# New project bootstrap:
# Run supabase/setup.sql in the SQL Editor, or use migrations when the remote
# history is aligned with this repo.
supabase db push

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

Deploy all QRBuddy functions:

```bash
for func in supabase/functions/*/; do
  supabase functions deploy "$(basename "$func")" --project-ref YOUR_PROJECT_REF
done
```

## Auth Boundary

- Browser/Fresh requests send `Authorization: Bearer <anon key>` and `apikey`.
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

# Integration tests, when env is configured
deno task test
```

See `tests/README.md` for the current test files and caveats.
