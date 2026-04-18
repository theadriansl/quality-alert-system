-- Migration 059: Add lot_number to mrb_ok_entries for individual serial tracking
ALTER TABLE mrb_ok_entries ADD COLUMN IF NOT EXISTS lot_number VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_lot ON mrb_ok_entries(mrb_campaign_id, lot_number);
