-- Library-level scan stats.
--
-- dynamic_qr_analytics() answers "what did THIS code do in the last 7 days".
-- A business needs the other question: "what did my whole shelf of codes do
-- this month, and which one is carrying the load" — which is the reason
-- somebody opens the app in month two.
--
-- One call, one round trip, pre-aggregated in SQL. Nothing here scans more than
-- the caller's own codes, and the window is capped so a typo cannot ask for
-- five years of rows.

create or replace function public.library_scan_stats(
  p_user_id uuid,
  p_days int default 30
)
returns jsonb
language sql
stable
set search_path = pg_catalog
as $$
  with bounds as (
    select greatest(1, least(coalesce(p_days, 30), 90)) as days
  ),
  owned as (
    select
      id,
      short_code,
      coalesce(nullif(title, ''), short_code) as label
    from public.dynamic_qr_codes
    where user_id = p_user_id
  ),
  scoped as (
    select s.qr_id, s.scanned_at, s.os, s.device_type, s.country
    from public.scan_logs s
    join owned o on o.id = s.qr_id
    where s.scanned_at > now() - (select days from bounds) * interval '1 day'
      and s.scanned_at <= now()
  ),
  series as (
    select
      d::date as day,
      count(s.qr_id) as scans
    from generate_series(
      current_date - ((select days from bounds) - 1),
      current_date,
      interval '1 day'
    ) d
    left join scoped s on s.scanned_at::date = d::date
    group by 1
    order by 1
  ),
  per_code as (
    select
      o.short_code,
      o.label,
      count(s.qr_id) as scans
    from owned o
    left join scoped s on s.qr_id = o.id
    group by o.short_code, o.label
    order by count(s.qr_id) desc, o.short_code
    limit 5
  ),
  countries as (
    select coalesce(nullif(country, ''), 'unknown') as country, count(*) as scans
    from scoped
    group by 1
    order by count(*) desc
    limit 8
  )
  select jsonb_build_object(
    'available', true,
    'days', (select days from bounds),
    'total_scans', (select count(*) from scoped),
    'codes_tracked', (select count(*) from owned),
    'last_scan', (select max(scanned_at) from scoped),
    'series',
      (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'scans', scans) order by day), '[]'::jsonb) from series),
    'top_codes',
      (select coalesce(jsonb_agg(jsonb_build_object('short_code', short_code, 'label', label, 'scans', scans)), '[]'::jsonb) from per_code),
    'devices', jsonb_build_object(
      'ios', (select count(*) from scoped where os = 'ios'),
      'android', (select count(*) from scoped where os = 'android'),
      'desktop', (select count(*) from scoped where os = 'desktop' and os is distinct from 'ios' and os is distinct from 'android'),
      'other', (select count(*) from scoped where coalesce(os, '') not in ('ios', 'android', 'desktop'))
    ),
    'countries',
      (select coalesce(jsonb_agg(jsonb_build_object('country', country, 'scans', scans)), '[]'::jsonb) from countries)
  );
$$;

revoke all on function public.library_scan_stats(uuid, int) from public, anon, authenticated;
grant execute on function public.library_scan_stats(uuid, int) to service_role;

comment on function public.library_scan_stats(uuid, int) is
  'Rolled-up scan stats for every code owned by one Passport, capped at a 90-day window.';
