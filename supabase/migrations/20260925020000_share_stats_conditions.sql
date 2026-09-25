-- Conditions: what the world was like when a share got scanned — weather,
-- temperature, time of day, moon — and a fair baseline to compare against,
-- so "rainy days get 2× the scans" is only said when it's true.
--
-- weather_days: one row per ~10 km cell per UTC day, filled from Open-Meteo
-- (keyless) the first time a cell is scanned that day, with a week of
-- backfill so the baseline covers days nobody scanned. No visitor data here
-- at all — it's weather.

CREATE TABLE IF NOT EXISTS weather_days (
  cell TEXT NOT NULL,             -- "-37.8,145.0" (lat/lon rounded to 0.1°)
  day DATE NOT NULL,              -- UTC day
  hours JSONB NOT NULL,           -- 24 × ["rain","mild","night"]
  counts JSONB NOT NULL,          -- key → hours in that condition (of 24)
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cell, day)
);

CREATE INDEX IF NOT EXISTS weather_days_day_idx ON weather_days(day);

ALTER TABLE weather_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages weather" ON weather_days
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE share_stats_daily
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}'::jsonb, -- key → views
  ADD COLUMN IF NOT EXISTS cells JSONB DEFAULT '{}'::jsonb;      -- cell → views

-- Merge one view's condition keys (and its cell) into today's ledger row.
-- record_share_activity has already created the row.
CREATE OR REPLACE FUNCTION record_share_conditions(
  p_file_id UUID,
  p_day DATE,
  p_cell TEXT,
  p_keys TEXT[]
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  v_conditions JSONB;
  v_cells JSONB;
BEGIN
  SELECT conditions, cells INTO v_conditions, v_cells
  FROM share_stats_daily
  WHERE file_id = p_file_id AND day = p_day
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOREACH k IN ARRAY COALESCE(p_keys, ARRAY[]::TEXT[]) LOOP
    v_conditions := jsonb_set(
      v_conditions, ARRAY[k],
      to_jsonb(COALESCE((v_conditions->>k)::int, 0) + 1)
    );
  END LOOP;

  IF p_cell IS NOT NULL THEN
    v_cells := jsonb_set(
      v_cells, ARRAY[p_cell],
      to_jsonb(COALESCE((v_cells->>p_cell)::int, 0) + 1)
    );
  END IF;

  UPDATE share_stats_daily
  SET conditions = v_conditions, cells = v_cells
  WHERE file_id = p_file_id AND day = p_day;
END;
$$;

REVOKE ALL ON FUNCTION record_share_conditions(UUID, DATE, TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_share_conditions(UUID, DATE, TEXT, TEXT[]) TO service_role;
