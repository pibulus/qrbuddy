-- claim_bucket_download predates the unbranded column, and its RETURNS TABLE
-- silently dropped the flag — download-from-bucket saw undefined and every
-- supporter note stayed branded. Recreate with the column, then re-apply the
-- 20260526020000 lockdown (DROP resets ACLs to public-execute defaults).

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
  is_empty BOOLEAN,
  unbranded BOOLEAN
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
    v_bucket.is_empty,
    v_bucket.unbranded;
END;
$$;

-- Re-apply the RPC lockdown (mirrors 20260526020000).
ALTER FUNCTION public.claim_bucket_download(TEXT, TEXT)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  TO service_role;
