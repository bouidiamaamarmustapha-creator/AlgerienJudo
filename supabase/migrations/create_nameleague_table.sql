/*
    # Create nameleague table

    1. New Tables
      - `nameleague`
        - `id` (BIGINT, primary key, generated always as identity)
        - `name_league` (TEXT, not null, unique)
        - `created_at` (TIMESTAMP WITH TIME ZONE, default now())
    */

    CREATE TABLE IF NOT EXISTS public.nameleague (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name_league TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE public.nameleague ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow authenticated users to read nameleague"
      ON public.nameleague
      FOR SELECT
      TO authenticated
      USING (true);