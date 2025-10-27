/*
  # Allow Public Inserts into league-logos Bucket

  This migration creates a new storage policy that allows public (anonymous) users to upload files to the `league-logos` bucket.

  1.  **New Policy Details**
      - **Policy Name**: "Allow public inserts"
      - **Table**: `storage.objects`
      - **Action**: `INSERT`
      - **Role**: `anon` (public)
      - **Check Expression**: `bucket_id = 'league-logos'`

  2.  **Reasoning**
      - This policy is necessary to allow users, including those who might not be authenticated, to upload league logos. This is a common requirement for public-facing forms where users submit images.
      - The policy is scoped specifically to the `league-logos` bucket to prevent unauthorized uploads to other storage buckets.
*/

-- Drop the policy if it exists to ensure the script is re-runnable.
DROP POLICY IF EXISTS "Allow public inserts" ON storage.objects;

-- Create the policy to allow anonymous inserts into the 'league-logos' bucket.
CREATE POLICY "Allow public inserts"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'league-logos');
