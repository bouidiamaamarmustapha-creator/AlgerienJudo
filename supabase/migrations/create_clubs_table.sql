/*
      # Create clubs table

      1. New Tables
        - `clubs`
          - `id` (BIGINT, primary key, generated always as identity)
          - `name` (TEXT, not null, unique)
          - `created_at` (TIMESTAMP WITH TIME ZONE, default now())
      2. Security
        - Enable RLS on `clubs` table
    */

    CREATE TABLE IF NOT EXISTS public.clubs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
