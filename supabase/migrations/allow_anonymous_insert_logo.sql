/*
      # Allow anonymous insert to logo table

      1. Security
        - Allow anonymous inserts to the `logo` table

    */

    DROP POLICY IF EXISTS "Allow insert for anon" ON logo;
    CREATE POLICY "Allow insert for anon" ON logo
    FOR INSERT
    WITH CHECK (true);
