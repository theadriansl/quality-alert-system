-- Migration 055: Add shift_id and upload_date_only to mrb_attachments
ALTER TABLE mrb_attachments
  ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES inspection_shifts(id),
  ADD COLUMN IF NOT EXISTS inspection_date DATE DEFAULT CURRENT_DATE;
