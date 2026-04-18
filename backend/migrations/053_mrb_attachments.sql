-- Migration 053: MRB additional attachments table
CREATE TABLE IF NOT EXISTS mrb_attachments (
  id SERIAL PRIMARY KEY,
  mrb_id INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  attachment_type VARCHAR(100) DEFAULT 'additional',
  uploaded_by INTEGER REFERENCES users(id),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mrb_attachments_mrb_id ON mrb_attachments(mrb_id);

-- Also add lot/batch info and inspection criteria fields to mrb_campaigns
ALTER TABLE mrb_campaigns
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS part_description TEXT,
  ADD COLUMN IF NOT EXISTS inspection_criteria TEXT,
  ADD COLUMN IF NOT EXISTS disposition_instructions TEXT;
