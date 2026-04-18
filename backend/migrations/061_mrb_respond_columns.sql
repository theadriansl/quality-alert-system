-- Migration 061: Add response/resolution columns to mrb_campaigns
ALTER TABLE mrb_campaigns
  ADD COLUMN IF NOT EXISTS root_cause TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
