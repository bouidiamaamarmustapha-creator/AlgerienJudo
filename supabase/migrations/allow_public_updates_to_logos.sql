/*
  # Allow Public Updates in league-logos Bucket

  This migration creates a new storage policy that allows public (anonymous) users to update files in the `league-logos` bucket.

  1.  **New Policy Details**
      - **Policy Name**: "Allow public updates"
      - **Table**: `storage.objects`
      - **Action**: `UPDATE`
      - **Role**: `anon` (public)
      - **Using Expression**: `bucket_id = 'league-logos'`

  2.  **Reasoning**
      - This policy enables users, including those not authenticated, to modify or replace existing league logos. This is useful for scenarios where a league might need to update its logo through a public-facing interface.
      - The policy is scoped specifically to the `league-logos` bucket to prevent unauthorized updates in other storage buckets.
*/

-- Drop the policy if it exists to ensure the script is re-runnable.
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;

-- Create the policy to allow anonymous updates in the 'league-logos' bucket.
CREATE POLICY "Allow public updates"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'league-logos');
