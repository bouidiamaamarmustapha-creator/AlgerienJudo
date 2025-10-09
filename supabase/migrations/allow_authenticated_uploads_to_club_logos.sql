/*
    # Allow Authenticated Uploads to club-logos Bucket

    1. Purpose
      - Configures a policy to allow authenticated users to upload objects to the 'club-logos' storage bucket.
      - Checks if the policy exists before creating it.

    2. SQL Commands
      - `CREATE POLICY IF NOT EXIST "Allow authenticated uploads to club_logo"`: Creates a policy allowing authenticated users to upload objects to the 'club-logos' bucket if it doesn't already exist.

    3. Security Considerations
      - This configuration allows authenticated users to upload files to the 'club-logos' bucket.
    */

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads to club_logo' AND tablename = 'objects') THEN
        CREATE POLICY "Allow authenticated uploads to club_logo"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'club-logos');
      END IF;
    END$$;
