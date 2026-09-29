-- Enforce expiry under the same row lock as the scan limit. The edge handler's
-- earlier read can race with the expiry boundary, so the counter must reject
-- a QR that expires while a scan is waiting for its row lock.
CREATE OR REPLACE FUNCTION increment_scan_count(p_short_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scan_count INTEGER;
  v_max_scans  INTEGER;
  v_is_active  BOOLEAN;
  v_expires_at TIMESTAMPTZ;
  v_new_count  INTEGER;
BEGIN
  SELECT scan_count, max_scans, is_active, expires_at
    INTO v_scan_count, v_max_scans, v_is_active, v_expires_at
    FROM dynamic_qr_codes
    WHERE short_code = p_short_code
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;  -- QR does not exist
  END IF;

  IF NOT v_is_active THEN
    RETURN -1;  -- QR already exploded
  END IF;

  -- clock_timestamp() reflects the time after acquiring the row lock. NOW()
  -- is fixed at transaction start and could be stale after waiting for a lock.
  IF v_expires_at IS NOT NULL AND v_expires_at <= clock_timestamp() THEN
    RETURN -1;  -- QR has expired
  END IF;

  IF v_max_scans IS NOT NULL AND v_scan_count >= v_max_scans THEN
    RETURN -1;  -- scan limit already reached
  END IF;

  UPDATE dynamic_qr_codes
  SET scan_count = scan_count + 1
  WHERE short_code = p_short_code
  RETURNING scan_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_scan_count(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(TEXT)
  TO service_role;
