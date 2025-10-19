/*
      # Correct Storage Upload Policy Name

      This migration corrects the name of the Row Level Security (RLS) policy for file uploads to the `league-logos` bucket.

      1.  **Security Changes**
          - Drops the previous policy named "Authenticated upload".
          - Creates a new policy named "Allow authenticated uploads" with the same underlying logic.

      2.  **Purpose**
          - To align the policy name with the final desired naming convention.
    */

    -- Drop the previous policy to rename it
    DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;

    -- Create the new policy with the corrected name, ensuring it doesn't already exist
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated uploads' AND polrelid = 'storage.objects'::regclass) THEN
        CREATE POLICY "Allow authenticated uploads"
        ON storage.objects
        FOR INSERT
        WITH CHECK (bucket_id = 'league-logos' AND auth.role() = 'authenticated');
      END IF;
    END $$;
