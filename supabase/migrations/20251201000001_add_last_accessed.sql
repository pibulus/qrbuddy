-- Add last_accessed_at to file_buckets for retention tracking
ALTER TABLE file_buckets ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_file_buckets_last_accessed_at ON file_buckets(last_accessed_at);
