-- Add delete_on_download column to file_buckets table
-- This enables "Ping Pong" mode where content is deleted after download, but the bucket persists.

ALTER TABLE file_buckets
ADD COLUMN IF NOT EXISTS delete_on_download BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN file_buckets.delete_on_download IS 'If true, content is deleted after download (Ping Pong mode). If false, content persists.';
