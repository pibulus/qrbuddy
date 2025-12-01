-- Add creator_ip column to destructible_files to track usage limits
ALTER TABLE destructible_files 
ADD COLUMN creator_ip TEXT;

-- Index for fast counting
CREATE INDEX idx_destructible_files_creator_ip ON destructible_files(creator_ip);

-- Comment
COMMENT ON COLUMN destructible_files.creator_ip IS 'IP address of the creator, used for rate limiting (max 3 active files per IP)';
