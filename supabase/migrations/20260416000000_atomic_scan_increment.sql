-- Atomic scan count increment for sequential QR routing
-- Prevents race condition where concurrent scans read same count

CREATE OR REPLACE FUNCTION increment_scan_count(p_short_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE dynamic_qr_codes
  SET scan_count = scan_count + 1
  WHERE short_code = p_short_code
  RETURNING scan_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;
