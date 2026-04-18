-- Migration: Add D7 multi-level approval columns
-- This adds approval tracking for D7 with 3 approval steps (Confirmation approvers)

-- Add approval columns for step 1 (Approver 1 of Confirmation)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_approval_1_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS d7_approval_1_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS d7_approval_1_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS d7_approval_1_comments TEXT;

-- Add approval columns for step 2 (Approver 2 of Confirmation)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_approval_2_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS d7_approval_2_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS d7_approval_2_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS d7_approval_2_comments TEXT;

-- Add approval columns for step 3 (Approver 3 of Confirmation)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_approval_3_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS d7_approval_3_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS d7_approval_3_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS d7_approval_3_comments TEXT;

-- Add current approval step tracker
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_current_approval_step INTEGER DEFAULT 0;

-- Remove old d7_approval_history JSONB column (replaced by structured columns)
ALTER TABLE eightd_reports
DROP COLUMN IF EXISTS d7_approval_history;

COMMENT ON COLUMN eightd_reports.d7_current_approval_step IS '0 = not started, 1-3 = awaiting approver 1-3, 4 = fully approved';
COMMENT ON COLUMN eightd_reports.d7_approval_1_status IS 'Status of first approval (approved/rejected/pending)';
COMMENT ON COLUMN eightd_reports.d7_approval_2_status IS 'Status of second approval (approved/rejected/pending)';
COMMENT ON COLUMN eightd_reports.d7_approval_3_status IS 'Status of third approval (approved/rejected/pending)';
