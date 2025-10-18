/*
  Add "Allow anon inserts" policy to photos table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE policyname = 'Allow anon inserts' AND tablename = 'photos'
  ) THEN
    CREATE POLICY "Allow anon inserts"
      ON photos
      FOR INSERT
      TO authenticated
      WITH CHECK (TRUE);
  END IF;
END $$;
