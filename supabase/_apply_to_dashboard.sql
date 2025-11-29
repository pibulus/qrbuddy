-- QRBuddy Complete Schema Setup
-- Copy this entire file and run in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/xrsbhcaiicqiblhhuzzu/sql/new

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
  content_type TEXT,
  content_data TEXT,
  content_metadata JSONB,
  is_empty BOOLEAN DEFAULT TRUE,
  last_filled_at TIMESTAMPTZ,
  last_emptied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_buckets_bucket_code ON file_buckets(bucket_code);
CREATE INDEX IF NOT EXISTS idx_file_buckets_owner_token ON file_buckets(owner_token);

ALTER TABLE file_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on file_buckets" ON file_buckets
  FOR ALL
  USING (auth.role() = 'service_role');

-- ==============================================================================
-- MULTIPLE DOWNLOADS SUPPORT
-- ==============================================================================

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

UPDATE destructible_files
SET max_downloads = 1, download_count = 0
WHERE max_downloads IS NULL;

CREATE INDEX IF NOT EXISTS idx_destructible_files_accessed
ON destructible_files(accessed, download_count);

-- ==============================================================================
-- SCAN LOGS (Privacy-first analytics)
-- ==============================================================================

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
-- DONE! Schema applied successfully
-- ==============================================================================
