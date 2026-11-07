-- QRBuddy Complete Schema Setup
-- Copy this entire file and run in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/aqydpibnvlhcjcwosrti/sql/new

-- ==============================================================================
-- CORE TABLES (from init_schema)
-- ==============================================================================

-- Create destructible_files table
CREATE TABLE IF NOT EXISTS destructible_files (
  id UUID PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT,
  size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed BOOLEAN DEFAULT FALSE,
  max_downloads INTEGER DEFAULT 999999,
  download_count INTEGER DEFAULT 0,
  files JSONB DEFAULT '[]'::jsonb,
  theme TEXT DEFAULT 'sunset',
  creator_ip TEXT,
  download_started_at TIMESTAMPTZ
);

-- Create storage bucket for files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-files', 'qr-files', false)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security policies
ALTER TABLE destructible_files ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON destructible_files
  FOR ALL
  USING (auth.role() = 'service_role');

-- Storage policies (private bucket, only service role can access)
CREATE POLICY "Service role can upload files" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'qr-files' AND auth.role() = 'service_role');

CREATE POLICY "Service role can download files" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'qr-files' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete files" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'qr-files' AND auth.role() = 'service_role');

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
    OR (
      v_max_downloads < 999999
      AND COALESCE(v_file.download_count, 0) >= v_max_downloads
    )
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
    OR (
      v_max_downloads < 999999
      AND COALESCE(v_file.download_count, 0) >= v_max_downloads
    )
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

-- Dynamic QR codes table
CREATE TABLE IF NOT EXISTS dynamic_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_scans INTEGER,
  scan_count INTEGER DEFAULT 0,
  password_hash TEXT,
  owner_token TEXT UNIQUE NOT NULL,
  routing_mode TEXT DEFAULT 'simple',
  routing_config JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_short_code ON dynamic_qr_codes(short_code);
CREATE INDEX IF NOT EXISTS idx_owner_token ON dynamic_qr_codes(owner_token);

ALTER TABLE dynamic_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on dynamic_qr_codes" ON dynamic_qr_codes
  FOR ALL
  USING (auth.role() = 'service_role');

-- File buckets table
CREATE TABLE IF NOT EXISTS file_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_code TEXT UNIQUE NOT NULL,
  owner_token TEXT NOT NULL,
  bucket_type TEXT NOT NULL DEFAULT 'file',
  style TEXT NOT NULL DEFAULT 'sunset',
  is_password_protected BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  is_reusable BOOLEAN DEFAULT TRUE,
  delete_on_download BOOLEAN DEFAULT FALSE,
  content_type TEXT,
  content_data TEXT,
  content_metadata JSONB,
  is_empty BOOLEAN DEFAULT TRUE,
  last_filled_at TIMESTAMPTZ,
  last_emptied_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  download_started_at TIMESTAMPTZ,
  creator_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_buckets_bucket_code ON file_buckets(bucket_code);
CREATE INDEX IF NOT EXISTS idx_file_buckets_owner_token ON file_buckets(owner_token);
CREATE INDEX IF NOT EXISTS idx_file_buckets_creator_ip ON file_buckets(creator_ip);
CREATE INDEX IF NOT EXISTS idx_file_buckets_last_accessed_at ON file_buckets(last_accessed_at);

ALTER TABLE file_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on file_buckets" ON file_buckets
  FOR ALL
  USING (auth.role() = 'service_role');

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

-- ==============================================================================
-- MULTIPLE DOWNLOADS SUPPORT
-- ==============================================================================

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 999999,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'sunset',
ADD COLUMN IF NOT EXISTS creator_ip TEXT,
ADD COLUMN IF NOT EXISTS download_started_at TIMESTAMPTZ;

UPDATE destructible_files
SET max_downloads = 1, download_count = 0
WHERE max_downloads IS NULL;

CREATE INDEX IF NOT EXISTS idx_destructible_files_accessed
ON destructible_files(accessed, download_count);

-- ==============================================================================
-- SCAN LOGS (Privacy-first analytics)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id UUID REFERENCES dynamic_qr_codes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  device_type TEXT,
  os TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_qr_id ON scan_logs(qr_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at);

-- ==============================================================================
-- INTERNAL RPC GRANTS
-- ==============================================================================

ALTER FUNCTION public.claim_destructible_file_download(UUID)
  SET search_path = public;
ALTER FUNCTION public.finalize_destructible_file_download(UUID)
  SET search_path = public;
ALTER FUNCTION public.claim_bucket_download(TEXT, TEXT)
  SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_destructible_file_download(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_destructible_file_download(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_destructible_file_download(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_bucket_download(TEXT, TEXT)
  TO service_role;

-- ==============================================================================
-- DONE! Schema applied successfully
-- ==============================================================================
