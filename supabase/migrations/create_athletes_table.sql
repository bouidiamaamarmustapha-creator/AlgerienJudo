/*
      # Create athletes table

      1. New Tables
        - `athletes`
          - `id` (bigint, primary key, generated always as identity)
          - `last_name` (text, not null)
          - `first_name` (text, not null)
          - `date_of_birth` (date, not null)
          - `place_of_birth` (text, not null)
          - `role` (text, nullable)
          - `blood_type` (text, nullable)
          - `national_id_number` (text, unique, nullable)
          - `password` (text, nullable)
          - `license_number` (text, nullable)
          - `registration_date` (date, default current_date)
          - `photos_url` (text, nullable)
          - `nationality` (text, check constraint: 'Algerian' or 'Tunisian', nullable)
          - `grade` (text, check constraint: 'brown belt' or 'black belt', nullable)
          - `renewal` (int, default 0)
          - `confirmation` (boolean, default false)
          - `genres` (text, check constraint: 'Masculin' or 'Féminin', nullable)
          - `category` (text, check constraint: 'Benjamins','Minimes','Cadets','Juniors','Hopefuls','Seniors','Veterans')), nullable)
          - `weight` (text, nullable)
          - `club_id` (bigint, foreign key referencing nameclub(id), on delete cascade, nullable)
          - `league_id` (bigint, foreign key referencing nameleague(id), on delete cascade, nullable)

      2. Security
        - Enable RLS on `athletes` table
        - Add policy for authenticated users to read all data
    */

    CREATE TABLE IF NOT EXISTS athletes (
      id bigint generated always as identity primary key,
      last_name text not null,
      first_name text not null,
      date_of_birth date not null,
      place_of_birth text not null,
      role text,
      blood_type text,
      national_id_number text unique,
      password text,
      license_number text,
      registration_date date default current_date,
      photos_url text,
      nationality text check (nationality in ('Algerian','Tunisian')),
      grade text check (grade in ('brown belt','black belt')),
      renewal int default 0,
      confirmation boolean default false,
      genres text check (genres in ('Masculin','Féminin')),
      category text check (category in ('Benjamins','Minimes','Cadets','Juniors','Hopefuls','Seniors','Veterans')),
      weight text,
      club_id bigint references nameclub(id) on delete cascade,
      league_id bigint references nameleague(id) on delete cascade
    );

    ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Authenticated users can read all data"
      ON athletes
      FOR SELECT
      TO authenticated
      USING (TRUE);
