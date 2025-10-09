/*
    # Create nameclub table

    1. New Tables
      - `nameclub`
        - `id` (BIGINT, primary key, generated always as identity)
        - `name_club` (TEXT, not null, unique)
        - `created_at` (TIMESTAMP WITH TIME ZONE, default now())
    */

    CREATE TABLE IF NOT EXISTS public.nameclub (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name_club TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
