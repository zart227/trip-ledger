-- TripLedger: SQL schema for Supabase (смены 7:00–7:00)
-- Run this in Supabase SQL Editor
-- If you had the old schema (vehicles, groups), run: DROP TABLE IF EXISTS trips, vehicles, groups CASCADE;

-- Trips: каждый рейс хранит госномер, тонаж и оплату
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT NOT NULL,
  tonnage NUMERIC NOT NULL DEFAULT 0,
  group_name TEXT,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  payment_method TEXT,
  amount NUMERIC
);

-- Migration: add payment and updated_at columns if table already exists (run in Supabase SQL Editor if needed)
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_method TEXT;
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS amount NUMERIC;
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- UPDATE trips SET updated_at = created_at WHERE updated_at IS NULL;

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON trips;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_trips_entry_time ON trips(entry_time);
CREATE INDEX IF NOT EXISTS idx_trips_plate_number ON trips(plate_number);

-- RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all trips" ON trips FOR ALL USING (true) WITH CHECK (true);

-- Realtime: подписка на INSERT/UPDATE/DELETE по таблице trips (выполнить в SQL Editor при необходимости)
-- ALTER PUBLICATION supabase_realtime ADD TABLE trips;
