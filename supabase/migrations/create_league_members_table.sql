/*
    # Create league_members table

    1. New Tables
      - `league_members`
        - `id` (SERIAL, primary key)
        - `last_name` (VARCHAR(255), not null)
        - `first_name` (VARCHAR(255), not null)
        - `date_of_birth` (DATE, not null)
        - `place_of_birth` (VARCHAR(255), not null)
        - `role` (VARCHAR(255), not null)
        - `blood_type` (VARCHAR(10), not null)
        - `national_id_number` (VARCHAR(50), not null)
        - `password` (VARCHAR(255), not null)
        - `license_number` (VARCHAR(100), not null)
        - `registration_date` (DATE, not null)
        - `logo_url` (TEXT)
        - `league_id` (INT, not null)
        - `created_at` (TIMESTAMP, default now())
    */

    CREATE TABLE league_members (
      id SERIAL PRIMARY KEY,
      last_name VARCHAR(255) NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      date_of_birth DATE NOT NULL,
      place_of_birth VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      blood_type VARCHAR(10) NOT NULL,
      national_id_number VARCHAR(50) NOT NULL,
      password VARCHAR(255) NOT NULL,
      license_number VARCHAR(100) NOT NULL,
      registration_date DATE NOT NULL,
      logo_url TEXT,
      league_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
