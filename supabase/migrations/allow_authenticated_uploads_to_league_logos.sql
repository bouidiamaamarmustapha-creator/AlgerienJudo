/*
      # Allow Authenticated Uploads to league-logos

      This migration adds a new Row Level Security (RLS) policy to the `storage.objects` table to permit authenticated users to upload files.

      1.  **Security Changes**
          - Creates a new policy: "Allow uploads to league-logos".
          - This policy grants `INSERT` permissions on `storage.objects`.
          - Access is restricted to users with the `authenticated` role.
          - The operation is limited to the `league-logos` bucket.

      2.  **Purpose**
          - This enables the functionality for league members to upload their logos through the application.
    */

    -- Enable RLS on storage.objects if not already enabled.
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Allow insert/upload to 'league-logos' bucket for authenticated users
    CREATE POLICY "Allow uploads to league-logos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'league-logos');
