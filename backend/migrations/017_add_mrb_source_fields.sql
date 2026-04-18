-- Migration: Add MRB Source Fields and Missing Columns
-- Links MRB campaigns to QAR (quality_alerts) or 8D (eightd_reports) as origin
-- Also adds MRB operation-specific fields and any missing columns

-- ============================================================================
-- STEP 1: Add missing validation/response columns (if they don't exist)
-- ============================================================================

ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS responded_by INTEGER REFERENCES users(id);
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS response_date TIMESTAMP;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS validated_by INTEGER REFERENCES users(id);
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS validation_date TIMESTAMP;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20);

-- ============================================================================
-- STEP 2: Add source/origin fields (link to QAR or 8D)
-- ============================================================================

-- Source type: 'QAR' or '8D'
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS source_type VARCHAR(10);

-- Foreign key to quality_alerts (QAR)
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS source_qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE SET NULL;

-- Foreign key to eightd_reports (8D)
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS source_8d_id INTEGER REFERENCES eightd_reports(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Add MRB operation fields
-- ============================================================================

-- Inspection quantities
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS qty_inspected INTEGER DEFAULT 0;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS qty_ok INTEGER DEFAULT 0;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS qty_nok INTEGER DEFAULT 0;

-- Cost fields
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS scrap_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(12,2) DEFAULT 0;

-- Personnel counts
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS inspector_count INTEGER DEFAULT 0;
ALTER TABLE mrb_campaigns ADD COLUMN IF NOT EXISTS supervisor_count INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 4: Add indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mrb_campaigns_source_type ON mrb_campaigns(source_type);
CREATE INDEX IF NOT EXISTS idx_mrb_campaigns_source_qar_id ON mrb_campaigns(source_qar_id);
CREATE INDEX IF NOT EXISTS idx_mrb_campaigns_source_8d_id ON mrb_campaigns(source_8d_id);
CREATE INDEX IF NOT EXISTS idx_mrb_campaigns_validated_by ON mrb_campaigns(validated_by);
CREATE INDEX IF NOT EXISTS idx_mrb_campaigns_responded_by ON mrb_campaigns(responded_by);

-- ============================================================================
-- NOTES:
-- - source_type: 'QAR' or '8D' - indicates the type of origin
-- - source_qar_id: References quality_alerts table when origin is QAR
-- - source_8d_id: References eightd_reports table when origin is 8D
-- - One MRB should have exactly one source (QAR XOR 8D)
-- - Validation is done in backend, not as DB constraint for flexibility
-- - The origin can be changed (e.g., when QAR escalates to 8D)
-- ============================================================================
