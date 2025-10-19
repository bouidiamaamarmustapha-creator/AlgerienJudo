/*
      # Allow insert for anon on league_members table

      1. Security
        - Allow insert for anon on `league_members` table
    */

    CREATE POLICY "Allow anon insert" ON league_members FOR
    INSERT TO anon WITH CHECK (true);
