-- Add support for multiple downloads before self-destruct

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS max_downloads INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

-- Update existing rows to have default values
UPDATE destructible_files
SET max_downloads = 1, download_count = 0
WHERE max_downloads IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_destructible_files_accessed
ON destructible_files(accessed, download_count);

-- Comments for clarity
COMMENT ON COLUMN destructible_files.max_downloads IS
'Maximum number of downloads before self-destruct. NULL or 0 = unlimited.';

COMMENT ON COLUMN destructible_files.download_count IS
'Current number of downloads. File self-destructs when download_count >= max_downloads.';
