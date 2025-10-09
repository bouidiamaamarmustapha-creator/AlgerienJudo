/*
      # Create photos table and policies

      1. New Tables
        - `photos`
          - `id` (uuid, primary key)
          - `image_url` (text, nullable)
          - `description` (text, nullable)
          - `created_at` (timestamp)
      2. Security
        - Enable RLS on `photos` table
        - Add policy for authenticated users to be able to insert photos
        - Add policy for everyone to be able to read photos
        - Add policy for anyone with anon key to select photos
    */

    CREATE TABLE IF NOT EXISTS photos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url text,
      description text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can insert photos"
      ON photos
      FOR INSERT
      TO authenticated
      WITH CHECK (TRUE);

    CREATE POLICY "Everyone can read photos"
      ON photos
      FOR SELECT
      TO public
      USING (TRUE);
