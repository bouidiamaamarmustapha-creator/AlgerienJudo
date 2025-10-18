/*
      # Add license_number and registration_date to members table

      1. Modified Tables
        - `members`
          - Added `license_number` (text)
          - Added `registration_date` (date)
      2. Security
        - No security changes.
    */

    ALTER TABLE members
    ADD COLUMN IF NOT EXISTS license_number text,
    ADD COLUMN IF NOT EXISTS registration_date date;
