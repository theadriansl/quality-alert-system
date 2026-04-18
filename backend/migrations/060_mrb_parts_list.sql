-- Migration 060: Add parts_list JSONB column to mrb_campaigns
-- Stores array of {partId, partNumber, partName} for INCOMING multi-part campaigns

ALTER TABLE mrb_campaigns
  ADD COLUMN IF NOT EXISTS parts_list jsonb DEFAULT '[]'::jsonb;
