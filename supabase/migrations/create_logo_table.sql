/*
      # Create logo table

      1. New Tables
        - `logo`
          - `id` (bigint, primary key, generated always as identity)
          - `logo_url` (text, not nullable)
          - `created_at` (timestamp)
      2. Security
        - Enable RLS on `logo` table
        - Add policy for public read
        - Add policy for public insert
        - Add policy for public update
    */

    CREATE TABLE IF NOT EXISTS logo (
      id bigint generated always as identity primary key,
      logo_url text not null,
      created_at timestamptz default now()
    );

    -- Enable Row Level Security
    ALTER TABLE logo ENABLE ROW LEVEL SECURITY;

    -- Allow everyone to read
    DROP POLICY IF EXISTS "Public read logo" ON logo;
    CREATE POLICY "Public read logo"
      ON logo FOR SELECT
      USING (TRUE);

    -- Allow inserts
    DROP POLICY IF EXISTS "Public insert logo" ON logo;
    CREATE POLICY "Public insert logo"
      ON logo FOR INSERT
      WITH CHECK (TRUE);

    -- Allow updates
    DROP POLICY IF EXISTS "Public update logo" ON logo;
    CREATE POLICY "Public update logo"
      ON logo FOR UPDATE
      USING (TRUE);
