/*
      # Configure storage policies for club-logos bucket

      1. Security
        - Allow authenticated users to upload into the "club-logos" bucket
        - Allow authenticated users to upload into the "club-logos" bucket based on user id
        - Allow anyone to view files in the "club-logos" bucket
    */

    -- Allow authenticated users to upload into the "club-logos" bucket
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads to club-logos' AND tablename = 'objects') THEN
        create policy "Allow authenticated uploads to club-logos"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'club-logos');
      END IF;
    END$$;

    -- Allow authenticated users to upload into the "club-logos" bucket based on user id
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads to club-logos based on user id' AND tablename = 'objects') THEN
        CREATE POLICY "Allow authenticated uploads to club-logos based on user id"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'club-logos' AND
          auth.uid() = owner
        );
      END IF;
    END$$;

    -- Allow anyone to view files in the "club-logos" bucket
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read from club-logos' AND tablename = 'objects') THEN
        create policy "Allow public read from club-logos"
        on storage.objects
        for select
        to public
        using (bucket_id = 'club-logos');
      END IF;
    END$$;
