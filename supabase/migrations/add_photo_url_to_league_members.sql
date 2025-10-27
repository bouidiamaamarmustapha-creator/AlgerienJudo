/*
  # Add photo_url column to league_members table

  1. Modified Tables
    - `league_members`
      - Added `photo_url` (text, nullable) - for member photos

  2. Security
    - No security changes needed as existing RLS policies will apply
*/

ALTER TABLE league_members
ADD COLUMN IF NOT EXISTS photo_url text;