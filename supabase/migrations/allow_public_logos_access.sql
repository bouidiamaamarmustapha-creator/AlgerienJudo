/*
  # Allow public access to logos bucket

  1. Security
    - Allow public uploads to the `logos` bucket
    - Allow public reads from the `logos` bucket
*/

CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');
