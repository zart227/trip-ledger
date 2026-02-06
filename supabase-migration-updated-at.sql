-- Migration: add updated_at column to trips table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times — IF NOT EXISTS prevents errors

-- Add updated_at column if it doesn't exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Set updated_at to created_at for existing records where it's NULL
UPDATE trips SET updated_at = created_at WHERE updated_at IS NULL;

-- Set default value for new records
ALTER TABLE trips ALTER COLUMN updated_at SET DEFAULT now();
