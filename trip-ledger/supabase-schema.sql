-- TripLedger: SQL schema for Supabase (смены 7:00–7:00)
-- Run this in Supabase SQL Editor
-- If you had the old schema (vehicles, groups), run: DROP TABLE IF EXISTS trips, vehicles, groups CASCADE;

-- Trips: каждый рейс хранит госномер и тонаж
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT NOT NULL,
  tonnage NUMERIC NOT NULL DEFAULT 0,
  group_name TEXT,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_trips_entry_time ON trips(entry_time);
CREATE INDEX IF NOT EXISTS idx_trips_plate_number ON trips(plate_number);

-- RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all trips" ON trips FOR ALL USING (true) WITH CHECK (true);
