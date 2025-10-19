/*
  # Add photos_url, club_id, and league_id to members table

  1. Modified Tables
    - `members`
      - Added `photos_url` (text, nullable) - for member photos
      - Added `club_id` (bigint, nullable) - references clubs table
      - Added `league_id` (bigint, nullable) - references leagues table
  2. Security
    - No security changes needed as existing RLS policies will apply
*/

ALTER TABLE members
ADD COLUMN IF NOT EXISTS photos_url text,
ADD COLUMN IF NOT EXISTS club_id bigint REFERENCES public.clubs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS league_id bigint REFERENCES public.leagues(id) ON DELETE SET NULL;