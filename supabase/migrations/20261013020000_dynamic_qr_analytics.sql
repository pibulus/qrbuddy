-- Aggregate in PostgreSQL so busy QRs are not truncated by the API row cap.
-- The owner-token check stays in get-dynamic-qr; only that service can call this.
CREATE OR REPLACE FUNCTION public.dynamic_qr_analytics(p_qr_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE
SET search_path = pg_catalog
AS $$
  WITH recent AS (
    SELECT scanned_at, device_type, os,
      floor(extract(epoch FROM (now() - scanned_at)) / 86400)::int AS age
    FROM public.scan_logs
    WHERE qr_id = p_qr_id
      AND scanned_at > now() - interval '7 days'
      AND scanned_at <= now()
  ), days AS (
    SELECT d, (SELECT count(*) FROM recent WHERE age = 6 - d) AS n
    FROM generate_series(0, 6) d
  )
  SELECT jsonb_build_object(
    'available', true,
    'sparkline', (SELECT jsonb_agg(n ORDER BY d) FROM days),
    'last_scan', (SELECT max(scanned_at) FROM public.scan_logs WHERE qr_id = p_qr_id),
    'devices', jsonb_build_object(
      'ios', count(*) FILTER (WHERE os = 'ios'),
      'android', count(*) FILTER (WHERE os = 'android'),
      'desktop', count(*) FILTER (WHERE os IS DISTINCT FROM 'ios' AND os IS DISTINCT FROM 'android' AND device_type = 'desktop'),
      'other', count(*) FILTER (WHERE os IS DISTINCT FROM 'ios' AND os IS DISTINCT FROM 'android' AND device_type IS DISTINCT FROM 'desktop')
    )
  ) FROM recent;
$$;

REVOKE ALL ON FUNCTION public.dynamic_qr_analytics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dynamic_qr_analytics(uuid) TO service_role;
