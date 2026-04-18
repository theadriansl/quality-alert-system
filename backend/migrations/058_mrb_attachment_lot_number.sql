-- Migration 058: Add lot_number to mrb_attachments for per-defect evidence linking
ALTER TABLE mrb_attachments
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_mrb_attachments_lot_number ON mrb_attachments(mrb_id, lot_number);
