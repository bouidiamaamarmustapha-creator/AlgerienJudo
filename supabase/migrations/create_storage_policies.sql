/*
      # Storage Policies for League Logos

      1. Purpose
        - Configures policies for the 'league-logos' storage bucket.
        - Allows authenticated users to upload objects to the 'league-logos' bucket.
        - Allows public read access to objects in the 'league-logos' bucket.

      2. SQL Commands
        - `CREATE POLICY "Allow uploads for authenticated users"`: Creates a policy allowing authenticated users to upload objects to the 'league-logos' bucket.
        - `CREATE POLICY "Allow public read"`: Creates a policy allowing public read access to objects in the 'league-logos' bucket.

      3. Security Considerations
        - This configuration allows authenticated users to upload files to the 'league-logos' bucket.
        - Public read access is granted to objects in the 'league-logos' bucket.
      */

    -- Allow all authenticated users to insert/upload
    CREATE POLICY "Allow uploads for authenticated users"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'league-logos' AND auth.role() = 'authenticated');

    -- Allow read for public
    CREATE POLICY "Allow public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'league-logos');
