-- Media preview and Download All issue parallel requests for one share. Wait
-- for the claim transaction to finish instead of treating its locked row as
-- missing; finite shares still serialize through download_started_at below.
CREATE OR REPLACE FUNCTION public.claim_destructible_file_download(
  p_file_id UUID
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  original_name TEXT,
  size INTEGER,
  mime_type TEXT,
  files JSONB,
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
  FROM public.destructible_files
  WHERE id = p_file_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_file.expires_at <= clock_timestamp() THEN
    RETURN;
  END IF;

  v_max_downloads := COALESCE(NULLIF(v_file.max_downloads, 0), 999999);

  IF v_file.accessed
    OR (v_max_downloads < 999999 AND COALESCE(v_file.download_count, 0) >= v_max_downloads)
  THEN
    RETURN;
  END IF;

  IF v_max_downloads < 999999
    AND v_file.download_started_at IS NOT NULL
    AND v_file.download_started_at > (NOW() - INTERVAL '1 minute')
  THEN
    RETURN;
  END IF;

  IF v_max_downloads < 999999 THEN
    UPDATE public.destructible_files
    SET download_started_at = NOW()
    WHERE id = v_file.id;
  END IF;

  v_new_download_count := COALESCE(v_file.download_count, 0);
  v_will_expire := v_max_downloads < 999999
    AND (v_new_download_count + 1) >= v_max_downloads;

  RETURN QUERY SELECT
    v_file.id,
    v_file.file_name,
    v_file.original_name,
    v_file.size,
    v_file.mime_type,
    COALESCE(v_file.files, '[]'::jsonb),
    v_max_downloads,
    v_new_download_count,
    v_will_expire;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_destructible_file_download(UUID)
  TO service_role;
