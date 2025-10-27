/*
      # Add insert policy on club_members

      1. Security
        - Add policy for authenticated users to insert new members
    */

    CREATE POLICY "Allow insert for authenticated"
    ON club_members
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
