-- ================================================================
-- Add sim_seed to cfp_brackets
-- Run in Supabase SQL Editor after cfp_migration.sql
-- ================================================================
-- Stores a random seed per bracket so each "Regenerate" produces
-- a genuinely different simulation instead of the same one.

ALTER TABLE public.cfp_brackets
  ADD COLUMN IF NOT EXISTS sim_seed text NOT NULL DEFAULT '';
