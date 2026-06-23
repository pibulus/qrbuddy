-- Fix atomic scan-count race condition
-- The old increment_scan_count() blindly incremented without checking max_scans.
-- Two concurrent scans could both see scan_count=4 when max_scans=5, both pass
-- the pre-check, and both get incremented (resulting in 6, exceeding the limit).
--
-- This rewrite moves the limit check inside the RPC, using SELECT ... FOR UPDATE
-- to serialise concurrent scans. Returns -1 when the limit is already reached
-- so the edge function can redirect to /boom.

CREATE OR REPLACE FUNCTION increment_scan_count(p_short_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scan_count INTEGER;
  v_max_scans  INTEGER;
  v_is_active  BOOLEAN;
  v_new_count  INTEGER;
BEGIN
  SELECT scan_count, max_scans, is_active
    INTO v_scan_count, v_max_scans, v_is_active
    FROM dynamic_qr_codes
    WHERE short_code = p_short_code
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN -1;  -- QR does not exist
  END IF;

  IF NOT v_is_active THEN
    RETURN -1;  -- QR already exploded
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

-- Lock it down so only service_role can execute (same as other RPCs)
REVOKE ALL ON FUNCTION public.increment_scan_count(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_scan_count(TEXT)
  TO service_role;
