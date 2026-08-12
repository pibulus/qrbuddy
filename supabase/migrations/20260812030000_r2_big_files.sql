-- R2 big-files (supporter perk): presigned-upload grants + deferred reaping.
--
-- pending_uploads: create-upload-url writes a grant BEFORE the browser PUTs
-- to R2; finalize-upload verifies the object (exists + size matches) and only
-- then creates the real destructible_files / file_buckets record. Rows that
-- never finalize are reaped (with their orphaned R2 objects) by
-- cleanup-expired after 24h.
--
-- r2_reap_queue: R2-backed downloads hand the browser a ~60s presigned GET,
-- so the object can't be deleted inline at claim time like Supabase storage
-- blobs are — deletion is queued (+1h) and executed by cleanup-expired.

create table if not exists public.pending_uploads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('destructible', 'bucket')),
  storage_key text not null,
  declared_size bigint not null,
  filename text not null,
  mimetype text,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.r2_reap_queue (
  storage_key text primary key,
  reap_after timestamptz not null
);

-- Service-role only: clients never touch these tables directly (same
-- lockdown pattern as the file-transfer RPCs — RLS on, zero policies,
-- grants revoked from the public API roles).
alter table public.pending_uploads enable row level security;
alter table public.r2_reap_queue enable row level security;
revoke all on table public.pending_uploads from anon, authenticated;
revoke all on table public.r2_reap_queue from anon, authenticated;
