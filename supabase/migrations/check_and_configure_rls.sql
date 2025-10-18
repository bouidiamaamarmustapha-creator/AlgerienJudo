/*
      # Check and Configure RLS for members table

      1. Check RLS Status
        - Checks if Row Level Security (RLS) is enabled on the `members` table.

      2. Create Policy for INSERT from anon key
        - Creates a policy allowing INSERT operations for the 'anon' role.

      3. Double-check RLS is still enabled
        - Re-enables RLS on the `members` table to ensure it is active.

      4. Optional: Temporary test (Disable RLS)
        - Provides SQL to disable RLS for temporary testing purposes (ONLY for development).

      5. Verify
        - Provides instructions to verify the configuration by adding a member via the Add Member page.
    */

    -- Check if RLS is enabled
    select relrowsecurity from pg_class
    join pg_namespace on pg_class.relnamespace = pg_namespace.oid
    where relname = 'members';

    -- Allow all inserts for anon key
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert for anon' AND tablename = 'members') THEN
        CREATE POLICY "Allow insert for anon" ON members FOR INSERT TO anon WITH CHECK (TRUE);
      END IF;
    END $$;

    -- Double-check that RLS is still enabled:
    alter table members enable row level security;

    -- Optional: Temporary test
    -- If you just want to confirm your form works, you can disable RLS completely:
    -- alter table members disable row level security;
    -- This ensures the table allows inserts from any client. Only use this for development/testing.

    -- 4️⃣ Verify
    -- Go to your Add Member page.
    -- Fill the form:
    -- Role: Federation President
    -- Blood Type: AB+
    -- Last Name: maamar
    -- First Name: bouidia
    -- DOB: 1988-05-22
    -- POB: mascara
    -- NID: 111111111111111111
    -- Password: (your password)
    -- Confirm Password: (same password)
    -- Click Add Member.
    -- The member should now be inserted successfully.
