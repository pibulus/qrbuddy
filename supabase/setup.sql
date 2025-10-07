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
