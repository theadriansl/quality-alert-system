-- ============================================================================
-- Migration 119: Add exit tracking to mrb_affected_serials
-- Date: 2026-07-30
-- Description: Track when serials exit MRB inventory via transfer package
-- ============================================================================

-- Add exit tracking fields
ALTER TABLE mrb_affected_serials
ADD COLUMN IF NOT EXISTS exited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS exit_package_id INTEGER REFERENCES transfer_packages(id),
ADD COLUMN IF NOT EXISTS exited_by INTEGER REFERENCES users(id);

-- Index for inventory queries (serials still in MRB)
CREATE INDEX IF NOT EXISTS idx_mrb_affected_serials_in_inventory
ON mrb_affected_serials(mrb_campaign_id, inspection_result)
WHERE exited_at IS NULL;

COMMENT ON COLUMN mrb_affected_serials.exited_at IS 'When the serial physically left MRB inventory';
COMMENT ON COLUMN mrb_affected_serials.exit_package_id IS 'Transfer package used to exit MRB';
COMMENT ON COLUMN mrb_affected_serials.exited_by IS 'User who processed the exit';

SELECT 'Migration 119_mrb_affected_serials_exit.sql completed' as status;
