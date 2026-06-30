-- Migration: Add quarantined_by and quarantined_at fields to defect_entries_v2
-- Similar to scrapped_by/scrapped_at for audit trail

ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS quarantined_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS quarantined_at TIMESTAMP;

-- Add index for queries filtering by quarantined_by
CREATE INDEX IF NOT EXISTS idx_defect_entries_quarantined_by ON defect_entries_v2(quarantined_by) WHERE quarantined_by IS NOT NULL;

COMMENT ON COLUMN defect_entries_v2.quarantined_by IS 'User who sent this defect to quarantine';
COMMENT ON COLUMN defect_entries_v2.quarantined_at IS 'Timestamp when defect was sent to quarantine';
