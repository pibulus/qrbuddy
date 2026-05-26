-- Harden file transfer claims against concurrent upload/download races.

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS download_started_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION claim_destructible_file_download(p_file_id UUID)
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
AS $$
DECLARE
  v_file destructible_files%ROWTYPE;
  v_max_downloads INTEGER;
  v_new_download_count INTEGER;
  v_will_expire BOOLEAN;
BEGIN
  SELECT * INTO v_file
  FROM destructible_files
  WHERE destructible_files.id = p_file_id
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
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
    UPDATE destructible_files
    SET download_started_at = NOW()
    WHERE destructible_files.id = v_file.id;
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

CREATE OR REPLACE FUNCTION finalize_destructible_file_download(p_file_id UUID)
RETURNS TABLE (
  max_downloads INTEGER,
  download_count INTEGER,
  will_expire BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file destructible_files%ROWTYPE;
  v_max_downloads INTEGER;
  v_new_download_count INTEGER;
  v_will_expire BOOLEAN;
BEGIN
  SELECT * INTO v_file
  FROM destructible_files
  WHERE destructible_files.id = p_file_id
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

  UPDATE destructible_files
  SET
    download_count = v_new_download_count,
    accessed = v_will_expire,
    download_started_at = NULL
  WHERE destructible_files.id = v_file.id;

  RETURN QUERY SELECT
    v_max_downloads,
    v_new_download_count,
    v_will_expire;
END;
$$;

DROP FUNCTION IF EXISTS claim_bucket_download(TEXT, TEXT);

CREATE OR REPLACE FUNCTION claim_bucket_download(
  p_bucket_code TEXT,
  p_password_hash TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  bucket_code TEXT,
  bucket_type TEXT,
  style TEXT,
  is_password_protected BOOLEAN,
  password_hash TEXT,
  is_reusable BOOLEAN,
  delete_on_download BOOLEAN,
  content_type TEXT,
  content_data TEXT,
  content_metadata JSONB,
  is_empty BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket file_buckets%ROWTYPE;
BEGIN
  SELECT * INTO v_bucket
  FROM file_buckets
  WHERE file_buckets.bucket_code = p_bucket_code
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_bucket.is_empty THEN
    RETURN;
  END IF;

  IF (NOT v_bucket.is_reusable OR v_bucket.delete_on_download)
    AND v_bucket.download_started_at IS NOT NULL
    AND v_bucket.download_started_at > (NOW() - INTERVAL '1 minute')
  THEN
    RETURN;
  END IF;

  UPDATE file_buckets
  SET download_started_at = NOW()
  WHERE file_buckets.id = v_bucket.id;

  RETURN QUERY SELECT
    v_bucket.id,
    v_bucket.bucket_code,
    v_bucket.bucket_type,
    v_bucket.style,
    v_bucket.is_password_protected,
    v_bucket.password_hash,
    v_bucket.is_reusable,
    v_bucket.delete_on_download,
    v_bucket.content_type,
    v_bucket.content_data,
    v_bucket.content_metadata,
    v_bucket.is_empty;
END;
$$;
