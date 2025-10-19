/*
      # Allow Insert and Select on club-logos Bucket

      1. Security
        - Allow inserting (saving) into club-logos bucket
        - Allow reading files from club-logos
    */

    -- Allow inserting (saving) into club-logos bucket
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow insert into club-logos' AND tablename = 'objects') THEN
        create policy "allow insert into club-logos"
        on storage.objects
        for insert
        to public
        with check (bucket_id = 'club-logos');
      END IF;
    END$$;

    -- Allow reading files from club-logos
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow select from club-logos' AND tablename = 'objects') THEN
        create policy "allow select from club-logos"
        on storage.objects
        for select
        to public
        using (bucket_id = 'club-logos');
      END IF;
    END$$;
