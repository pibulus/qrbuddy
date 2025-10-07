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
