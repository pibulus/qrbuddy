-- Add theme column to destructible_files
-- Stores the visual theme (e.g., 'sunset', 'b&w') chosen by the uploader

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'sunset';

COMMENT ON COLUMN destructible_files.theme IS 'Visual theme for the file download page';
