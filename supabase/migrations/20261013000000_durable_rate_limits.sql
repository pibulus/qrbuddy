CREATE TABLE public.edge_rate_limit_counters (
  key_hash text PRIMARY KEY CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  reset_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0)
);

CREATE INDEX edge_rate_limit_counters_reset_at_idx
  ON public.edge_rate_limit_counters (reset_at);

ALTER TABLE public.edge_rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.edge_rate_limit_counters
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_max_requests integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset_at timestamptz;
BEGIN
  IF p_key_hash IS NULL
    OR p_key_hash !~ '^[0-9a-f]{64}$'
    OR p_window_seconds IS NULL
    OR p_window_seconds < 1
    OR p_window_seconds > 86400
    OR p_max_requests IS NULL
    OR p_max_requests < 1
    OR p_max_requests > 100000
  THEN
    RAISE EXCEPTION 'invalid rate limit arguments';
  END IF;

  -- Each call removes at most 100 expired keys. Under ongoing traffic the
  -- table converges without an unbounded request-time delete.
  WITH expired AS (
    SELECT key_hash
    FROM public.edge_rate_limit_counters
    WHERE reset_at <= v_now
    ORDER BY reset_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM public.edge_rate_limit_counters AS counters
  USING expired
  WHERE counters.key_hash = expired.key_hash;

  INSERT INTO public.edge_rate_limit_counters AS counters (
    key_hash,
    window_started_at,
    reset_at,
    request_count
  )
  VALUES (
    p_key_hash,
    v_now,
    v_now + make_interval(secs => p_window_seconds),
    1
  )
  ON CONFLICT (key_hash) DO UPDATE SET
    window_started_at = CASE
      WHEN counters.reset_at <= v_now THEN v_now
      ELSE counters.window_started_at
    END,
    reset_at = CASE
      WHEN counters.reset_at <= v_now
        THEN v_now + make_interval(secs => p_window_seconds)
      ELSE counters.reset_at
    END,
    request_count = CASE
      WHEN counters.reset_at <= v_now THEN 1
      ELSE LEAST(counters.request_count + 1, p_max_requests + 1)
    END
  RETURNING counters.request_count, counters.reset_at
  INTO v_count, v_reset_at;

  RETURN jsonb_build_object(
    'request_count', v_count,
    'reset_at', v_reset_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, integer, integer)
  TO service_role;
