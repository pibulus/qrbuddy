-- QRBuddy Destructible Files Setup
-- Run this in Supabase SQL Editor

-- Create destructible_files table
CREATE TABLE IF NOT EXISTS destructible_files (
  id UUID PRIMARY KEY,
  file_name TEXT NOT NULL,
  original_name TEXT,
  size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed BOOLEAN DEFAULT FALSE
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

-- ==============================================================================
-- DYNAMIC QR CODES - EDITABLE REDIRECTS (NO TRACKING)
-- ==============================================================================

-- Create dynamic_qr_codes table for privacy-first editable redirects
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
  routing_mode TEXT DEFAULT 'simple',  -- 'simple' | 'time' | 'device' | 'round-robin'
  routing_config JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups by short code
CREATE INDEX idx_short_code ON dynamic_qr_codes(short_code);
CREATE INDEX idx_owner_token ON dynamic_qr_codes(owner_token);

-- Set up Row Level Security
ALTER TABLE dynamic_qr_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can do everything on dynamic_qr_codes" ON dynamic_qr_codes
  FOR ALL
  USING (auth.role() = 'service_role');

-- ==============================================================================
-- FILE BUCKETS - PERSISTENT STORAGE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS file_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_code TEXT UNIQUE NOT NULL,
  owner_token TEXT NOT NULL,

  -- Bucket configuration
  bucket_type TEXT NOT NULL DEFAULT 'file', -- 'file', 'text', 'link'
  style TEXT NOT NULL DEFAULT 'sunset', -- QR style chosen by creator
  is_password_protected BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  is_reusable BOOLEAN DEFAULT TRUE, -- persistent vs one-time
  delete_on_download BOOLEAN DEFAULT FALSE, -- empty content after download

  -- Current content
  content_type TEXT, -- 'file', 'text', 'link'
  content_data TEXT, -- file_id, text content, or URL
  content_metadata JSONB, -- filename, size, etc.

  -- State
  is_empty BOOLEAN DEFAULT TRUE,
  last_filled_at TIMESTAMPTZ,
  last_emptied_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  download_started_at TIMESTAMPTZ,
  creator_ip TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_buckets_bucket_code ON file_buckets(bucket_code);
CREATE INDEX IF NOT EXISTS idx_file_buckets_owner_token ON file_buckets(owner_token);
CREATE INDEX IF NOT EXISTS idx_file_buckets_creator_ip ON file_buckets(creator_ip);
CREATE INDEX IF NOT EXISTS idx_file_buckets_last_accessed_at ON file_buckets(last_accessed_at);

-- RLS Policies
ALTER TABLE file_buckets ENABLE ROW LEVEL SECURITY;

-- Only service role can access buckets (all access via edge functions)
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

  IF NOT v_bucket.is_reusable
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
