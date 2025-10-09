/*
      # Create members table

      1. New Tables
        - `members`
          - `id` (uuid, primary key)
          - `role` (text)
          - `blood_type` (text)
          - `last_name` (text)
          - `first_name` (text)
          - `date_of_birth` (date)
          - `place_of_birth` (text)
          - `national_id_number` (text, unique)
          - `password` (text)
          - `created_at` (timestamp)
      2. Security
        - Enable RLS on `members` table
        - Add policy for authenticated users to be able to insert members
        - Add policy for everyone to be able to read members
    */

    CREATE TABLE IF NOT EXISTS members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      role text,
      blood_type text,
      last_name text,
      first_name text,
      date_of_birth date,
      place_of_birth text,
      national_id_number text UNIQUE NOT NULL,
      password text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE members ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon inserts' AND tablename = 'members') THEN
        CREATE POLICY "Allow anon inserts"
          ON members
          FOR INSERT
          TO authenticated
          WITH CHECK (TRUE);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can read members' AND tablename = 'members') THEN
        CREATE POLICY "Everyone can read members"
          ON members
          FOR SELECT
          TO public
          USING (TRUE);
      END IF;
    END $$;
