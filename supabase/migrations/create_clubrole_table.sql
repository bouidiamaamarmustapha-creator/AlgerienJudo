/*
    # Create clubrole table

    1. New Tables
      - `clubrole`
        - `id` (BIGINT, primary key, generated always as identity)
        - `club_role` (TEXT, not null, unique)
        - `created_at` (TIMESTAMP WITH TIME ZONE, default now())
    */
    CREATE TABLE IF NOT EXISTS public.clubrole (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      club_role TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
