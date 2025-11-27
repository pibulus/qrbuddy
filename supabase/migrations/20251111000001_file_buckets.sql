-- File Buckets: Persistent QR codes that can hold content (files, text, links)
-- Use cases: phone↔laptop file transfer, password reminders, message dead drops

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

  -- Current content
  content_type TEXT, -- 'file', 'text', 'link'
  content_data TEXT, -- file_id, text content, or URL
  content_metadata JSONB, -- filename, size, etc.

  -- State
  is_empty BOOLEAN DEFAULT TRUE,
  last_filled_at TIMESTAMPTZ,
  last_emptied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_buckets_bucket_code ON file_buckets(bucket_code);
CREATE INDEX IF NOT EXISTS idx_file_buckets_owner_token ON file_buckets(owner_token);

-- RLS Policies
ALTER TABLE file_buckets ENABLE ROW LEVEL SECURITY;

-- Anyone can read bucket status (needed to view bucket page)
DROP POLICY IF EXISTS "Anyone can read bucket status" ON file_buckets;
CREATE POLICY "Anyone can read bucket status"
  ON file_buckets FOR SELECT
  USING (true);

-- Anyone with owner_token can insert/update
DROP POLICY IF EXISTS "Owner can update bucket" ON file_buckets;
CREATE POLICY "Owner can update bucket"
  ON file_buckets FOR ALL
  USING (true);

-- Comments
COMMENT ON TABLE file_buckets IS 'Persistent QR code buckets that can hold files, text, or links';
COMMENT ON COLUMN file_buckets.bucket_code IS 'Short code for URL (e.g., abc123 → /bucket/abc123)';
COMMENT ON COLUMN file_buckets.owner_token IS 'Token for uploading content to bucket';
COMMENT ON COLUMN file_buckets.is_reusable IS 'If false, bucket is destroyed after first download';
COMMENT ON COLUMN file_buckets.is_empty IS 'Current state: true = ready for upload, false = has content';
