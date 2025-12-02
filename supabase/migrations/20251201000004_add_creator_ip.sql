-- Add creator_ip column to file_buckets to track usage limits
ALTER TABLE file_buckets 
ADD COLUMN creator_ip TEXT;

-- Index for fast counting
CREATE INDEX idx_file_buckets_creator_ip ON file_buckets(creator_ip);

-- Comment
COMMENT ON COLUMN file_buckets.creator_ip IS 'IP address of the creator, used for rate limiting (max 3 active buckets per IP)';
