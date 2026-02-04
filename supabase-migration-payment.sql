-- Migration: add payment columns to existing trips table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times — IF NOT EXISTS prevents errors
--
-- Логика: amount — сумма наличных за рейс; payment_method='cash' при amount IS NOT NULL.
-- Оплачено за машину: COUNT(*) WHERE amount IS NOT NULL AND plate_number=X
-- Всего рейсов: COUNT(*) WHERE plate_number=X AND exit_time IS NOT NULL
-- Полностью оплачено: оплачено == всего

ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS amount NUMERIC;
