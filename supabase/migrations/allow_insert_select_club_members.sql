/*
    # Allow Insert and Select on club_members Table

    1. Purpose
      - Configures policies to allow authenticated users to insert and select data from the `club_members` table.
      - Checks if the policies exist before creating them.

    2. SQL Commands
      - `CREATE POLICY IF NOT EXISTS "Allow insert into club_members"`: Creates a policy allowing authenticated users to insert data into the `club_members` table if it doesn't already exist.
      - `CREATE POLICY IF NOT EXISTS "Allow select from club_members"`: Creates a policy allowing public to select data from the `club_members` table if it doesn't already exist.

    3. Security Considerations
      - This configuration allows authenticated users to insert data into the `club_members` table.
      - This configuration allows public to select data from the `club_members` table.
    */

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert into club_members' AND tablename = 'club_members') THEN
        CREATE POLICY "Allow insert into club_members"
        ON public.club_members
        FOR INSERT
        TO authenticated
        WITH CHECK (TRUE);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select from club_members' AND tablename = 'club_members') THEN
        CREATE POLICY "Allow select from club_members"
        ON public.club_members
        FOR SELECT
        TO public
        USING (TRUE);
      END IF;
    END$$;
