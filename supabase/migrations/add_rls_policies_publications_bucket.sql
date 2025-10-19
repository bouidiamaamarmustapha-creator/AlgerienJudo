/*
  # Add RLS policies for publications bucket

  1. Security
    - Add policy to allow authenticated users to upload to the publications bucket
    - Add policy to allow anyone to read from the publications bucket
*/

-- Allow uploads if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow uploads' AND tablename = 'objects') THEN
        CREATE POLICY "Allow uploads" ON storage.objects
        FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'publications');
    END IF;
END$$;

-- Allow read if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read' AND tablename = 'objects') THEN
        CREATE POLICY "Allow read" ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'publications');
    END IF;
END$$;
