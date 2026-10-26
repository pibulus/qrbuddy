-- Passport Field Report: Deep 90-day aggregated analytics for Dynamic QR Codes.
-- Aggregates coarse tallies in PostgreSQL; never stores or exposes raw IPs or per-visitor rows.
CREATE OR REPLACE FUNCTION public.dynamic_qr_analytics(p_qr_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $$
  WITH recent_90d AS (
    SELECT
      scanned_at,
      device_type,
      os,
      lower(coalesce(browser, 'other')) AS browser,
      nullif(nullif(btrim(country), ''), 'Unknown') AS country,
      nullif(nullif(btrim(city), ''), 'Unknown') AS city,
      floor(extract(epoch FROM (now() - scanned_at)) / 86400)::int AS age,
      extract(hour FROM (scanned_at AT TIME ZONE 'UTC'))::int AS utc_hour
    FROM public.scan_logs
    WHERE qr_id = p_qr_id
      AND scanned_at > now() - interval '90 days'
      AND scanned_at <= now()
  ), recent_7d AS (
    SELECT *
    FROM recent_90d
    WHERE age >= 0 AND age < 7
  ), days_7 AS (
    SELECT d, (SELECT count(*) FROM recent_7d WHERE age = 6 - d) AS n
    FROM generate_series(0, 6) d
  ), days_30 AS (
    SELECT d, (SELECT count(*) FROM recent_90d WHERE age = 29 - d) AS n
    FROM generate_series(0, 29) d
  ), hour_series AS (
    SELECT h, (SELECT count(*) FROM recent_90d WHERE utc_hour = h) AS n
    FROM generate_series(0, 23) h
  ), city_counts AS (
    SELECT
      COALESCE(NULLIF(city, ''), country) AS name,
      count(*)::int AS count
    FROM recent_90d
    WHERE COALESCE(NULLIF(city, ''), country) IS NOT NULL
      AND COALESCE(NULLIF(city, ''), country) <> ''
    GROUP BY 1
    ORDER BY count DESC, name ASC
    LIMIT 5
  ), country_counts AS (
    SELECT
      country AS code,
      count(*)::int AS count
    FROM recent_90d
    WHERE country IS NOT NULL
      AND country <> ''
    GROUP BY 1
    ORDER BY count DESC, code ASC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'available', true,
    'sparkline', (SELECT jsonb_agg(n ORDER BY d) FROM days_7),
    'sparkline_30d', (SELECT jsonb_agg(n ORDER BY d) FROM days_30),
    'total_30d', (SELECT count(*)::int FROM recent_90d WHERE age >= 0 AND age < 30),
    'total_90d', (SELECT count(*)::int FROM recent_90d),
    'last_scan', (SELECT max(scanned_at) FROM public.scan_logs WHERE qr_id = p_qr_id),
    'devices', (
      SELECT jsonb_build_object(
        'ios', count(*) FILTER (WHERE os = 'ios'),
        'android', count(*) FILTER (WHERE os = 'android'),
        'desktop', count(*) FILTER (WHERE os IS DISTINCT FROM 'ios' AND os IS DISTINCT FROM 'android' AND device_type = 'desktop'),
        'other', count(*) FILTER (WHERE os IS DISTINCT FROM 'ios' AND os IS DISTINCT FROM 'android' AND device_type IS DISTINCT FROM 'desktop')
      )
      FROM recent_7d
    ),
    'hours', (SELECT jsonb_agg(n ORDER BY h) FROM hour_series),
    'top_cities', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', name, 'count', count) ORDER BY count DESC, name ASC) FROM city_counts),
      '[]'::jsonb
    ),
    'top_countries', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('code', code, 'count', count) ORDER BY count DESC, code ASC) FROM country_counts),
      '[]'::jsonb
    ),
    'browsers', (
      SELECT jsonb_build_object(
        'safari', count(*) FILTER (WHERE browser = 'safari'),
        'chrome', count(*) FILTER (WHERE browser = 'chrome'),
        'firefox', count(*) FILTER (WHERE browser = 'firefox'),
        'edge', count(*) FILTER (WHERE browser = 'edge'),
        'other', count(*) FILTER (WHERE browser NOT IN ('safari', 'chrome', 'firefox', 'edge'))
      )
      FROM recent_90d
    )
  );
$$;

REVOKE ALL ON FUNCTION public.dynamic_qr_analytics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dynamic_qr_analytics(uuid) TO service_role;
