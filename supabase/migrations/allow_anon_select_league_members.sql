/*
      # Allow select for anon on league_members table

      1. Security
        - Allow select for anon on `league_members` table
    */

    CREATE POLICY "Allow anon select" ON league_members FOR
    SELECT TO anon USING (true);
