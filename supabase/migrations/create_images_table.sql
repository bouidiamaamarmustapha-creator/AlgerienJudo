/*
      # Create images table

      1. New Tables
        - `images`
          - `id` (uuid, primary key)
          - `image_url` (text, nullable)
          - `description` (text, nullable)
          - `created_at` (timestamp)
      2. Security
        - Enable RLS on `images` table
        - Add policy for authenticated users to be able to insert images
        - Add policy for everyone to be able to read images
    */

    CREATE TABLE IF NOT EXISTS images (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      image_url text,
      description text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE images ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can insert images"
      ON images
      FOR INSERT
      TO authenticated
      WITH CHECK (TRUE);

    CREATE POLICY "Everyone can read images"
      ON images
      FOR SELECT
      TO public
      USING (TRUE);
