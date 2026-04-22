-- Migration: Add isPublic field to productions
-- Date: 2026-04-01
-- Description: Allow productions to be marked as public and shared between studios

-- Add isPublic column to productions table
ALTER TABLE productions ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of public productions
CREATE INDEX IF NOT EXISTS productions_is_public_idx ON productions(is_public) WHERE is_public = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN productions.is_public IS 'When true, this production can be used by other studios to create sessions. Takes remain isolated per studio.';
