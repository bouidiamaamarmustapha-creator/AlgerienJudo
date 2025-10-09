/*
      # Allow read for anon on league_members table

      1. Security
        - Allow read for anon on `league_members` table
    */

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read for anon' AND tablename = 'league_members') THEN
        CREATE POLICY "Allow read for anon" ON league_members FOR
        SELECT TO anon USING (true);
      END IF;
    END $$;
