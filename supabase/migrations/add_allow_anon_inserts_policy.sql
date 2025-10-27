/*
      # Add "Allow anon inserts" policy to members table

      1. Modified Tables
        - `members`
          - Added policy "Allow anon inserts" to allow inserts from the frontend anon key.
      2. Security
        - Added policy for authenticated users to be able to insert members.
    */

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow anon inserts' AND tablename = 'members') THEN
        CREATE POLICY "Allow anon inserts"
          ON members
          FOR INSERT
          TO authenticated
          WITH CHECK (TRUE);
      END IF;
    END $$;
