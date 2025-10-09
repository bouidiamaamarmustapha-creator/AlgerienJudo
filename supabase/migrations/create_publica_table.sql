/*
  # Create publica table

  1. New Tables
    - `publica`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `image_url` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `publica` table
    - Add policy for authenticated users to create, read, update, and delete their own data
*/

CREATE TABLE IF NOT EXISTS publica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE publica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable CRUD for authenticated users only"
  ON publica
  FOR ALL
  TO authenticated
  USING (auth.uid() = auth.uid());
