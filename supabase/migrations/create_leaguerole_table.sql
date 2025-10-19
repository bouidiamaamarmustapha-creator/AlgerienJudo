/*
    # Create leaguerole table

    1. New Tables
      - `leaguerole`
        - `id` (BIGINT, primary key, generated always as identity)
        - `league_role` (TEXT, not null, unique)
        - `created_at` (TIMESTAMP WITH TIME ZONE, default now())
    */
    CREATE TABLE IF NOT EXISTS public.leaguerole (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      league_role TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );