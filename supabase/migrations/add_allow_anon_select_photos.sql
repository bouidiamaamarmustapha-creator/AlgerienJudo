/*
  Add "Allow anon select" policy to photos table
*/
CREATE POLICY "Allow anon select"
  ON photos
  FOR SELECT
  TO authenticated
  USING (true);
