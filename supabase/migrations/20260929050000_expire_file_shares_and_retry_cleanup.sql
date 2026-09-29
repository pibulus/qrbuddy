-- Make file-share retention explicit. Existing and new shares keep a
-- 30-day lifetime, matching the cleanup policy already in place.
ALTER TABLE public.destructible_files
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.destructible_files
SET expires_at = COALESCE(created_at, now()) + INTERVAL '30 days'
WHERE expires_at IS NULL;

ALTER TABLE public.destructible_files
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '30 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS destructible_files_expires_at_idx
  ON public.destructible_files (expires_at);

COMMENT ON COLUMN public.destructible_files.expires_at IS
  'When the share stops accepting downloads; new shares expire after 30 days.';

-- Direct downloads and ZIP exports both claim through this RPC, so the expiry
-- guard applies even when a caller bypasses the public share page.
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
  FOR UPDATE SKIP LOCKED;

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

-- Queue every payload path in the same transaction that consumes the final
-- download. A storage outage after the response can no longer strand files.
CREATE OR REPLACE FUNCTION public.finalize_destructible_file_download(
  p_file_id UUID
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
  v_paths TEXT[];
  v_reap_after TIMESTAMPTZ := clock_timestamp() + INTERVAL '1 hour';
BEGIN
  SELECT * INTO v_file
  FROM public.destructible_files
  WHERE id = p_file_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
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

  UPDATE public.destructible_files
  SET
    download_count = v_new_download_count,
    accessed = v_will_expire,
    download_started_at = NULL
  WHERE id = v_file.id;

  IF v_will_expire THEN
    SELECT COALESCE(
      array_agg(DISTINCT NULLIF(item->>'path', '')) FILTER (
        WHERE NULLIF(item->>'path', '') IS NOT NULL
      ),
      ARRAY[]::TEXT[]
    ) INTO v_paths
    FROM jsonb_array_elements(COALESCE(v_file.files, '[]'::jsonb)) AS entry(item);

    IF cardinality(v_paths) = 0 THEN
      v_paths := ARRAY[v_file.file_name];
    END IF;

    INSERT INTO public.file_storage_reap_queue (storage_path, reap_after)
    SELECT DISTINCT path, v_reap_after
    FROM unnest(v_paths) AS queued(path)
    WHERE path IS NOT NULL AND path <> ''
    ON CONFLICT (storage_path) DO UPDATE
    SET reap_after = GREATEST(
      public.file_storage_reap_queue.reap_after,
      EXCLUDED.reap_after
    );
  END IF;

  RETURN QUERY SELECT
    v_max_downloads,
    v_new_download_count,
    v_will_expire;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_destructible_file_download(UUID)
  TO service_role;
REVOKE ALL ON FUNCTION public.finalize_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_destructible_file_download(UUID)
  TO service_role;
