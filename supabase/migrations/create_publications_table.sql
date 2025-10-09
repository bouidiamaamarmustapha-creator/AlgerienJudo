/*
  # Create publications table and policies

  1. New Tables
    - `publications`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, nullable)
      - `photo_url` (text, nullable)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `publications` table
    - Add policy for anonymous users to be able to insert publications
    - Add policy for everyone to be able to read publications
*/

CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  photo_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon inserts"
  ON publications
  FOR INSERT
  TO anon
  WITH CHECK (TRUE);

CREATE POLICY "Everyone can read publications"
  ON publications
  FOR SELECT
  TO public
  USING (TRUE);
