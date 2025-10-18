/*
  # Allow anonymous access to logos bucket and ensure federation table

  1. Security
    - Allow anonymous uploads to the `logos` bucket
    - Allow anonymous reads from the `logos` bucket
    - Allow anonymous updates to the `logos` bucket
    - Allow update of logo_url in the `federation` table
    - Allow select from the `federation` table

  2. Tables
    - Ensure the `federation` table exists with columns:
      - `id` (bigint, primary key, generated always as identity)
      - `name` (text)
      - `logo_url` (text)
*/

-- Allow anonymous uploads to logos bucket
CREATE POLICY "Allow uploads to logos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos');

-- Allow anonymous select (download)
CREATE POLICY "Allow read from logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Allow update
CREATE POLICY "Allow update logos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'logos');

-- Ensure DB Table federation
CREATE TABLE IF NOT EXISTS federation (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text,
  logo_url text
);

ALTER TABLE federation ENABLE ROW LEVEL SECURITY;

-- Allow update logo_url
CREATE POLICY "Allow update logo"
ON federation
FOR UPDATE
TO public
USING (TRUE)
WITH CHECK (TRUE);

-- Allow select
CREATE POLICY "Allow select logo"
ON federation
FOR SELECT
TO public
USING (TRUE);
