# Allow select for anon on athletes table

## Description
- Allow select for anon on `athletes` table

CREATE POLICY "Allow anon select" ON athletes FOR
SELECT TO anon USING (true);