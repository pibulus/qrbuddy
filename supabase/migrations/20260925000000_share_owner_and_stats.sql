-- "It's mine": file shares get an owner and stats that help.
--
-- owner_token: the person who made the share can rename it, re-theme it,
-- add/remove items. Same model as dynamic_qr_codes.owner_token — lives in
-- the device's token vault, never in the share URL.
--
-- stats: lifetime tallies. share_stats_daily: a per-day ledger (90 days) so
-- the owner sees today / this week / all time. Tallies only — no IPs, no
-- user agents, no per-visitor rows. "People" is counted against a
-- daily-salted hash that cannot be joined across days.

ALTER TABLE destructible_files
  ADD COLUMN IF NOT EXISTS owner_token TEXT,
  ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS destructible_files_owner_token_idx
  ON destructible_files (owner_token) WHERE owner_token IS NOT NULL;

COMMENT ON COLUMN destructible_files.stats IS
  'Lifetime tallies: {views, countries{}, cities{}, devices{}, os{}, hours[24], days[7], items{}, dwell_s, dwell_n, completions, shares, downloads, referred}';

CREATE TABLE IF NOT EXISTS share_stats_daily (
  file_id UUID REFERENCES destructible_files(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  views INTEGER DEFAULT 0,
  people INTEGER DEFAULT 0,      -- distinct daily hashes seen today
  returns INTEGER DEFAULT 0,     -- views whose hash was already seen today
  seen_hashes TEXT[] DEFAULT '{}', -- today's hashes; salted per day, pruned with the row
  countries JSONB DEFAULT '{}'::jsonb,
  cities JSONB DEFAULT '{}'::jsonb,
  devices JSONB DEFAULT '{}'::jsonb,
  hours INTEGER[] DEFAULT array_fill(0, ARRAY[24]),
  items JSONB DEFAULT '{}'::jsonb,
  dwell_s INTEGER DEFAULT 0,
  dwell_n INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  referred INTEGER DEFAULT 0,    -- arrived with a referrer (pasted link) vs a scan
  PRIMARY KEY (file_id, day)
);

CREATE INDEX IF NOT EXISTS share_stats_daily_day_idx ON share_stats_daily(day);

ALTER TABLE share_stats_daily ENABLE ROW LEVEL SECURITY;

-- Service role only, like scan_logs. Nothing for anon — the owner reads
-- stats through get-file-metadata with their token.
CREATE POLICY "Service role manages share stats" ON share_stats_daily
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- One call, one row, atomic. Merges a view (or an engagement batch) into
-- both the daily ledger and the lifetime tallies. Service-role only.
CREATE OR REPLACE FUNCTION record_share_activity(
  p_file_id UUID,
  p_day DATE,
  p_hour INTEGER,
  p_hash TEXT,           -- NULL for engagement-only batches
  p_country TEXT,
  p_city TEXT,
  p_device TEXT,
  p_os TEXT,
  p_referred BOOLEAN,
  p_items JSONB,         -- {"<item id>": plays}
  p_dwell_s INTEGER,
  p_completed BOOLEAN,
  p_shares INTEGER,
  p_downloads INTEGER
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
BEGIN
  INSERT INTO share_stats_daily (file_id, day)
  VALUES (p_file_id, p_day)
  ON CONFLICT (file_id, day) DO NOTHING;

  SELECT seen_hashes, hours INTO v_seen, v_hours
  FROM share_stats_daily
  WHERE file_id = p_file_id AND day = p_day
  FOR UPDATE;

  IF v_is_view THEN
    v_returning := p_hash = ANY(v_seen);
    IF NOT v_returning THEN
      v_seen := array_append(v_seen, p_hash);
    END IF;
    v_hours[p_hour + 1] := COALESCE(v_hours[p_hour + 1], 0) + 1;
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

  -- Lifetime tallies mirror the same increments (no hashes here — lifetime
  -- "people" is not honestly knowable without following someone).
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

-- Same lockdown as the file-transfer RPCs: public roles cannot call it.
REVOKE ALL ON FUNCTION record_share_activity(UUID, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, INTEGER, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_share_activity(UUID, DATE, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, INTEGER, BOOLEAN, INTEGER, INTEGER) TO service_role;
