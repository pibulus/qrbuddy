-- Commit the final R2-backed download and schedule object deletion together.
-- Otherwise a failed reap-queue write after finalization can strand an object.
CREATE OR REPLACE FUNCTION finalize_r2_destructible_file_download(
  p_file_id UUID,
  p_storage_key TEXT
)
RETURNS TABLE (
  max_downloads INTEGER,
  download_count INTEGER,
  will_expire BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file destructible_files%ROWTYPE;
  v_max_downloads INTEGER;
  v_new_download_count INTEGER;
  v_will_expire BOOLEAN;
BEGIN
  SELECT * INTO v_file
  FROM destructible_files
  WHERE id = p_file_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_storage_key IS NULL
    OR p_storage_key NOT LIKE 'r2/%'
    OR v_file.file_name <> p_storage_key
  THEN
    RAISE EXCEPTION 'R2 storage key does not match destructible file';
  END IF;

  v_max_downloads := COALESCE(NULLIF(v_file.max_downloads, 0), 999999);

  IF v_file.accessed
    OR (v_max_downloads < 999999 AND COALESCE(v_file.download_count, 0) >= v_max_downloads)
  THEN
    RETURN;
  END IF;

  IF v_max_downloads < 999999 AND v_file.download_started_at IS NULL THEN
    RETURN;
  END IF;

  v_new_download_count := COALESCE(v_file.download_count, 0) + 1;
  v_will_expire := v_max_downloads < 999999
    AND v_new_download_count >= v_max_downloads;

  UPDATE destructible_files
  SET
    download_count = v_new_download_count,
    accessed = v_will_expire,
    download_started_at = NULL
  WHERE id = v_file.id;

  IF v_will_expire THEN
    INSERT INTO r2_reap_queue (storage_key, reap_after)
    VALUES (p_storage_key, clock_timestamp() + INTERVAL '1 hour')
    ON CONFLICT (storage_key) DO UPDATE
    SET reap_after = GREATEST(r2_reap_queue.reap_after, EXCLUDED.reap_after);
  END IF;

  RETURN QUERY SELECT
    v_max_downloads,
    v_new_download_count,
    v_will_expire;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_r2_destructible_file_download(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_r2_destructible_file_download(UUID, TEXT)
  TO service_role;
