-- Scan-log retention: keep 90 days of raw rows, keep the history forever.
--
-- scan_logs grows by one row per scan and nothing has ever deleted them. At
-- 480k scans/month that is ~96 MB/month against a 500 MB database, so the
-- bill arrives as a hard wall rather than a bill.
--
-- The fix keeps the useful part: rows older than the window are folded into a
-- monthly per-code rollup, then deleted. Dashboards still show "March: 12,480
-- scans"; the raw device/browser/country rows for March are simply gone, which
-- is also the privacy story we want (no long-term behavioural trail).
--
-- The whole thing is one function so it runs in a single transaction: the rows
-- that get counted are exactly the rows that get deleted.

create table if not exists public.scan_log_rollups (
  qr_id uuid not null references public.dynamic_qr_codes(id) on delete cascade,
  month date not null,
  scans integer not null default 0,
  primary key (qr_id, month)
);

alter table public.scan_log_rollups enable row level security;
revoke all on public.scan_log_rollups from anon, authenticated;

comment on table public.scan_log_rollups is
  'Monthly per-code scan counts kept after raw scan_logs are purged.';

-- The delete in purge_old_scan_logs() needs this or it becomes a full scan.
create index if not exists scan_logs_scanned_at_idx
  on public.scan_logs (scanned_at);

create or replace function public.purge_old_scan_logs(p_keep_days int default 90)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  -- Floor of 30 days keeps a careless caller from wiping a live dashboard;
  -- the ceiling keeps a typo from asking for a 10-year scan.
  keep_days int := greatest(30, least(coalesce(p_keep_days, 90), 3650));
  cutoff timestamptz := now() - (greatest(30, least(coalesce(p_keep_days, 90), 3650)) * interval '1 day');
  months_rolled int := 0;
  rows_purged int := 0;
begin
  with old_rows as (
    select
      qr_id,
      date_trunc('month', scanned_at)::date as month,
      count(*)::int as scans
    from public.scan_logs
    where scanned_at < cutoff
    group by 1, 2
  )
  insert into public.scan_log_rollups (qr_id, month, scans)
  select qr_id, month, scans from old_rows
  on conflict (qr_id, month)
    do update set scans = public.scan_log_rollups.scans + excluded.scans;

  get diagnostics months_rolled = row_count;

  delete from public.scan_logs where scanned_at < cutoff;
  get diagnostics rows_purged = row_count;

  return jsonb_build_object(
    'keep_days', keep_days,
    'cutoff', cutoff,
    'months_rolled', months_rolled,
    'rows_purged', rows_purged
  );
end;
$$;

revoke all on function public.purge_old_scan_logs(int) from public, anon, authenticated;
grant execute on function public.purge_old_scan_logs(int) to service_role;

comment on function public.purge_old_scan_logs(int) is
  'Rolls scans older than the window into scan_log_rollups, then deletes them. Idempotent.';
