-- Stats people actually enjoy: which app carried the link, what languages
-- scan it, how far it travelled. Still tallies — a language tag, a referrer
-- host bucket, a rounded distance. Nothing per-visitor.

ALTER TABLE destructible_files
  ADD COLUMN IF NOT EXISTS origin_lat NUMERIC(5, 1),   -- where it was made,
  ADD COLUMN IF NOT EXISTS origin_lon NUMERIC(5, 1);   -- rounded to ~10 km

ALTER TABLE share_stats_daily
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS apps JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS farthest_km INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS farthest_place TEXT;

-- Great-circle distance in km between two rounded points. Immutable, pure.
CREATE OR REPLACE FUNCTION coarse_distance_km(
  lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC
) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN NULL
    ELSE ROUND(
      2 * 6371 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
      ))
    )::INTEGER
  END
$$;

-- Replace the activity RPC with the wider signature. Drop the old overload
-- first so callers can't hit an ambiguous name.
DROP FUNCTION IF EXISTS record_share_activity(UUID, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, INTEGER, BOOLEAN, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION record_share_activity(
  p_file_id UUID,
  p_day DATE,
  p_hour INTEGER,
  p_hash TEXT,
  p_country TEXT,
  p_city TEXT,
  p_device TEXT,
  p_os TEXT,
  p_referred BOOLEAN,
  p_items JSONB,
  p_dwell_s INTEGER,
  p_completed BOOLEAN,
  p_shares INTEGER,
  p_downloads INTEGER,
  p_lang TEXT,
  p_app TEXT,
  p_lat NUMERIC,
  p_lon NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_view BOOLEAN := p_hash IS NOT NULL;
  v_seen TEXT[];
  v_returning BOOLEAN := FALSE;
  v_hours INTEGER[];
  v_origin_lat NUMERIC;
  v_origin_lon NUMERIC;
  v_km INTEGER;
  v_place TEXT;
BEGIN
  INSERT INTO share_stats_daily (file_id, day)
  VALUES (p_file_id, p_day)
  ON CONFLICT (file_id, day) DO NOTHING;

  SELECT seen_hashes, hours INTO v_seen, v_hours
  FROM share_stats_daily
  WHERE file_id = p_file_id AND day = p_day
  FOR UPDATE;

  SELECT origin_lat, origin_lon INTO v_origin_lat, v_origin_lon
  FROM destructible_files WHERE id = p_file_id;

  IF v_is_view THEN
    v_returning := p_hash = ANY(v_seen);
    IF NOT v_returning THEN
      v_seen := array_append(v_seen, p_hash);
    END IF;
    v_hours[p_hour + 1] := COALESCE(v_hours[p_hour + 1], 0) + 1;
    v_km := coarse_distance_km(v_origin_lat, v_origin_lon, p_lat, p_lon);
    v_place := COALESCE(p_city, p_country);
  END IF;

  UPDATE share_stats_daily SET
    views = views + (CASE WHEN v_is_view THEN 1 ELSE 0 END),
    people = people + (CASE WHEN v_is_view AND NOT v_returning THEN 1 ELSE 0 END),
    returns = returns + (CASE WHEN v_returning THEN 1 ELSE 0 END),
    seen_hashes = v_seen,
    hours = v_hours,
    countries = CASE WHEN v_is_view AND p_country IS NOT NULL
      THEN jsonb_set(countries, ARRAY[p_country], to_jsonb(COALESCE((countries->>p_country)::int, 0) + 1))
      ELSE countries END,
    cities = CASE WHEN v_is_view AND p_city IS NOT NULL
      THEN jsonb_set(cities, ARRAY[p_city], to_jsonb(COALESCE((cities->>p_city)::int, 0) + 1))
      ELSE cities END,
    devices = CASE WHEN v_is_view AND p_device IS NOT NULL
      THEN jsonb_set(devices, ARRAY[p_device], to_jsonb(COALESCE((devices->>p_device)::int, 0) + 1))
      ELSE devices END,
    languages = CASE WHEN v_is_view AND p_lang IS NOT NULL
      THEN jsonb_set(languages, ARRAY[p_lang], to_jsonb(COALESCE((languages->>p_lang)::int, 0) + 1))
      ELSE languages END,
    apps = CASE WHEN v_is_view AND p_app IS NOT NULL
      THEN jsonb_set(apps, ARRAY[p_app], to_jsonb(COALESCE((apps->>p_app)::int, 0) + 1))
      ELSE apps END,
    farthest_km = CASE WHEN v_km IS NOT NULL AND v_km > farthest_km THEN v_km ELSE farthest_km END,
    farthest_place = CASE WHEN v_km IS NOT NULL AND v_km > farthest_km THEN v_place ELSE farthest_place END,
    referred = referred + (CASE WHEN v_is_view AND p_referred THEN 1 ELSE 0 END),
    items = (
      SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) FROM (
        SELECT k, SUM(v::int) AS v FROM (
          SELECT key AS k, value::text AS v FROM jsonb_each(items)
          UNION ALL
          SELECT key, value::text FROM jsonb_each(COALESCE(p_items, '{}'::jsonb))
        ) merged GROUP BY k
      ) agg
    ),
    dwell_s = dwell_s + COALESCE(p_dwell_s, 0),
    dwell_n = dwell_n + (CASE WHEN COALESCE(p_dwell_s, 0) > 0 THEN 1 ELSE 0 END),
    completions = completions + (CASE WHEN p_completed THEN 1 ELSE 0 END),
    shares = shares + COALESCE(p_shares, 0),
    downloads = downloads + COALESCE(p_downloads, 0)
  WHERE file_id = p_file_id AND day = p_day;

  UPDATE destructible_files SET stats = jsonb_build_object(
    'views', COALESCE((stats->>'views')::int, 0) + (CASE WHEN v_is_view THEN 1 ELSE 0 END),
    'referred', COALESCE((stats->>'referred')::int, 0) + (CASE WHEN v_is_view AND p_referred THEN 1 ELSE 0 END),
    'countries', CASE WHEN v_is_view AND p_country IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'countries', '{}'::jsonb), ARRAY[p_country], to_jsonb(COALESCE((stats->'countries'->>p_country)::int, 0) + 1))
      ELSE COALESCE(stats->'countries', '{}'::jsonb) END,
    'cities', CASE WHEN v_is_view AND p_city IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'cities', '{}'::jsonb), ARRAY[p_city], to_jsonb(COALESCE((stats->'cities'->>p_city)::int, 0) + 1))
      ELSE COALESCE(stats->'cities', '{}'::jsonb) END,
    'devices', CASE WHEN v_is_view AND p_device IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'devices', '{}'::jsonb), ARRAY[p_device], to_jsonb(COALESCE((stats->'devices'->>p_device)::int, 0) + 1))
      ELSE COALESCE(stats->'devices', '{}'::jsonb) END,
    'os', CASE WHEN v_is_view AND p_os IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'os', '{}'::jsonb), ARRAY[p_os], to_jsonb(COALESCE((stats->'os'->>p_os)::int, 0) + 1))
      ELSE COALESCE(stats->'os', '{}'::jsonb) END,
    'languages', CASE WHEN v_is_view AND p_lang IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'languages', '{}'::jsonb), ARRAY[p_lang], to_jsonb(COALESCE((stats->'languages'->>p_lang)::int, 0) + 1))
      ELSE COALESCE(stats->'languages', '{}'::jsonb) END,
    'apps', CASE WHEN v_is_view AND p_app IS NOT NULL
      THEN jsonb_set(COALESCE(stats->'apps', '{}'::jsonb), ARRAY[p_app], to_jsonb(COALESCE((stats->'apps'->>p_app)::int, 0) + 1))
      ELSE COALESCE(stats->'apps', '{}'::jsonb) END,
    'farthest_km', CASE WHEN v_km IS NOT NULL AND v_km > COALESCE((stats->>'farthest_km')::int, 0)
      THEN v_km ELSE COALESCE((stats->>'farthest_km')::int, 0) END,
    'farthest_place', CASE WHEN v_km IS NOT NULL AND v_km > COALESCE((stats->>'farthest_km')::int, 0)
      THEN v_place ELSE stats->>'farthest_place' END,
    'hours', CASE WHEN v_is_view
      THEN jsonb_set(COALESCE(stats->'hours', '{}'::jsonb), ARRAY[p_hour::text], to_jsonb(COALESCE((stats->'hours'->>p_hour::text)::int, 0) + 1))
      ELSE COALESCE(stats->'hours', '{}'::jsonb) END,
    'days', CASE WHEN v_is_view
      THEN jsonb_set(COALESCE(stats->'days', '{}'::jsonb), ARRAY[EXTRACT(DOW FROM p_day)::int::text], to_jsonb(COALESCE((stats->'days'->>(EXTRACT(DOW FROM p_day)::int::text))::int, 0) + 1))
      ELSE COALESCE(stats->'days', '{}'::jsonb) END,
    'items', (
      SELECT COALESCE(jsonb_object_agg(k, v), '{}'::jsonb) FROM (
        SELECT k, SUM(v::int) AS v FROM (
          SELECT key AS k, value::text AS v FROM jsonb_each(COALESCE(stats->'items', '{}'::jsonb))
          UNION ALL
          SELECT key, value::text FROM jsonb_each(COALESCE(p_items, '{}'::jsonb))
        ) merged GROUP BY k
      ) agg
    ),
    'dwell_s', COALESCE((stats->>'dwell_s')::int, 0) + COALESCE(p_dwell_s, 0),
    'dwell_n', COALESCE((stats->>'dwell_n')::int, 0) + (CASE WHEN COALESCE(p_dwell_s, 0) > 0 THEN 1 ELSE 0 END),
    'completions', COALESCE((stats->>'completions')::int, 0) + (CASE WHEN p_completed THEN 1 ELSE 0 END),
    'shares', COALESCE((stats->>'shares')::int, 0) + COALESCE(p_shares, 0),
    'downloads', COALESCE((stats->>'downloads')::int, 0) + COALESCE(p_downloads, 0)
  )
  WHERE id = p_file_id;
END;
$$;

REVOKE ALL ON FUNCTION record_share_activity(UUID, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_share_activity(UUID, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, INTEGER, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT, NUMERIC, NUMERIC) TO service_role;
