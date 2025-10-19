/*
    # Allow Public Read Access to Logos

    1. Purpose
      - Configures a policy to allow public read access to objects in the 'logo' and 'club-logos' storage buckets.

    2. SQL Commands
      - `CREATE POLICY "Allow public read access to logos"`: Creates a policy allowing public read access to objects in the 'logo' and 'club-logos' buckets.

    3. Security Considerations
      - This configuration allows public read access to files in the 'logo' and 'club-logos' buckets.
      - Ensure that only non-sensitive files are stored in these buckets.
    */

    CREATE POLICY "Allow public read access to logos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'logo' or bucket_id = 'club-logos');
