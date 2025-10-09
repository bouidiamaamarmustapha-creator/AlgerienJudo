/*
      # Allow Anonymous Upload and Read for League Logos

      1. Purpose
        - Configures policies for the 'league-logos' storage bucket to allow anonymous users to upload and read files.
        - Allows anonymous users to upload objects to the 'league-logos' bucket.
        - Allows anonymous users to read objects in the 'league-logos' bucket.

      2. SQL Commands
        - `CREATE POLICY "Allow anon upload"`: Creates a policy allowing anonymous users to upload objects to the 'league-logos' bucket.
        - `CREATE POLICY "Allow anon read"`: Creates a policy allowing anonymous users to read objects in the 'league-logos' bucket.

      3. Security Considerations
        - This configuration allows anonymous users to upload and read files in the 'league-logos' bucket.
        - Ensure appropriate security measures are in place to prevent abuse.
      */

    CREATE POLICY "Allow anon upload"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (bucket_id = 'league-logos');

    CREATE POLICY "Allow anon read"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = 'league-logos');
