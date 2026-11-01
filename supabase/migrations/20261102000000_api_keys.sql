-- API keys for Business Passport holders.
--
-- A key is shown exactly once, at creation. Only its SHA-256 hash is stored,
-- so a database leak cannot be replayed as a working key. Revoking is a
-- timestamp, never a delete, so an audit trail survives.
--
-- Scope is deliberately narrow: a key acts as the Passport it was minted from,
-- which means it inherits that Passport's library and quota. It is not a
-- separate user and never gets service-role powers.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key_hash text not null unique,
  prefix text not null,
  name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_key_hash_idx on public.api_keys (key_hash);

alter table public.api_keys enable row level security;

-- No anon or authenticated policies: keys are read and written only by the
-- api-keys edge function using the service role. Anyone reaching this table
-- directly has already made a mistake.
revoke all on public.api_keys from anon, authenticated;

comment on table public.api_keys is
  'Hashed API keys. Plaintext is never stored; only key_hash.';
