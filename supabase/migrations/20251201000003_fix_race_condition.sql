-- Fix Download Race Condition
-- Add locking mechanism for single-drop buckets

-- 1. Add download_started_at to track in-progress downloads
ALTER TABLE file_buckets
ADD COLUMN IF NOT EXISTS download_started_at TIMESTAMPTZ;

-- 2. Create RPC to atomically claim a bucket for download
-- Returns the bucket if claim is successful, or null if locked/empty
CREATE OR REPLACE FUNCTION claim_bucket_download(
  p_bucket_code TEXT,
  p_password_hash TEXT DEFAULT NULL -- Optional: verify password in DB for extra speed?
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
  content_metadata JSONB,
  is_empty BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket file_buckets%ROWTYPE;
BEGIN
  -- Lock the row for update to prevent concurrent access
  SELECT * INTO v_bucket
  FROM file_buckets
  WHERE bucket_code = p_bucket_code
  FOR UPDATE SKIP LOCKED; -- Skip if already locked by another transaction

  IF NOT FOUND THEN
    RETURN; -- Bucket not found or locked
  END IF;

  -- Check if empty
  IF v_bucket.is_empty THEN
    RETURN; -- Already empty
  END IF;

  -- Check if download already started for single-use (debounce/lock)
  -- If it's single-use AND download_started_at is recent (< 1 min), deny
  IF NOT v_bucket.is_reusable AND v_bucket.download_started_at IS NOT NULL AND v_bucket.download_started_at > (NOW() - INTERVAL '1 minute') THEN
    RETURN; -- Already being downloaded
  END IF;

  -- "Claim" the download
  UPDATE file_buckets
  SET download_started_at = NOW()
  WHERE id = v_bucket.id;

  -- Return the bucket details
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
    v_bucket.content_metadata,
    v_bucket.is_empty;
END;
$$;
