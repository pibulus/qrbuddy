-- Supporter pass checkouts (Square rail). One row per checkout attempt;
-- the webhook flips status to 'paid' and mints the license exactly once.
-- Service-role only — public roles get nothing, matching the RPC lockdown
-- posture from 20260526020000.

create table if not exists public.supporter_checkouts (
  checkout_id uuid primary key,
  provider text not null default 'square',
  provider_order_id text unique,
  payment_id text,
  status text not null default 'pending'
    check (status in ('pending', 'paid')),
  license text,
  amount integer,
  currency text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.supporter_checkouts enable row level security;

-- No RLS policies on purpose: only service-role edge functions touch this
-- table. Belt and braces on the grants too.
revoke all on table public.supporter_checkouts from anon, authenticated;
