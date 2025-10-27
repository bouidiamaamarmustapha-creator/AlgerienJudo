/*
      # Create policies for club_members table

      1. Security
        - Add policy for public to insert
        - Add policy for public to select
    */

    CREATE POLICY "Allow public insert into club_members"
    ON club_members
    FOR INSERT
    TO public
    WITH CHECK (TRUE);

    CREATE POLICY "Allow public read on club_members"
    ON club_members
    FOR SELECT
    TO public
    USING (TRUE);
