-- Add files column to destructible_files for multi-file support
-- This column will store an array of file metadata objects:
-- [{ id, path, name, size, type }, ...]

ALTER TABLE destructible_files
ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN destructible_files.files IS 'Array of file metadata for multi-file shares';
