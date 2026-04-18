-- Migration: Add revision/versioning fields for 8D reports
-- Date: 2026-03-12
-- Purpose: Support document versioning when reverting to draft (ISO compliance)

-- Add revision fields to eightd_reports
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_report_id INTEGER REFERENCES eightd_reports(id),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Create index for faster queries on archived documents
CREATE INDEX IF NOT EXISTS idx_eightd_reports_is_archived ON eightd_reports(is_archived);
CREATE INDEX IF NOT EXISTS idx_eightd_reports_parent_report_id ON eightd_reports(parent_report_id);

-- Comment for documentation
COMMENT ON COLUMN eightd_reports.revision_number IS 'Revision number (0 = original, 1 = R1, 2 = R2, etc.)';
COMMENT ON COLUMN eightd_reports.parent_report_id IS 'Link to the previous version (archived document)';
COMMENT ON COLUMN eightd_reports.is_archived IS 'True if document is archived/locked (read-only)';
COMMENT ON COLUMN eightd_reports.archived_at IS 'Timestamp when document was archived';
COMMENT ON COLUMN eightd_reports.archived_by IS 'User who archived the document';
COMMENT ON COLUMN eightd_reports.archived_reason IS 'Reason for archiving (revert comments)';
