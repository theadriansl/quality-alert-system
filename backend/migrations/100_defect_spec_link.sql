-- ============================================================================
-- Migration 100: Link defects to specs for re-verification flow
-- ============================================================================

-- 1. Add spec_id column to defect_entries_v2
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS spec_id INTEGER REFERENCES part_specifications(id);

-- 2. Add original measured value for comparison during re-verification
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS original_measured_value DECIMAL(15,6);

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_defect_entries_spec ON defect_entries_v2(spec_id);

-- 4. Update existing defects from metadata (if any have spec info in JSON)
UPDATE defect_entries_v2
SET spec_id = (
  SELECT he.metadata::json->>'specId'
  FROM unit_history he
  WHERE he.source_table = 'defect_entries_v2'
    AND he.source_id = defect_entries_v2.id
    AND he.metadata::json->>'specId' IS NOT NULL
  LIMIT 1
)::INTEGER
WHERE spec_id IS NULL
  AND defect_type_id IN (SELECT id FROM defect_types WHERE code = 'SPEC_FAILURE');

-- 5. Add re-verification fields to track release verification
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS reverification_result VARCHAR(20); -- OK | NOK

ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS reverification_value DECIMAL(15,6); -- New measured value

ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS reverification_at TIMESTAMP;

ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS reverification_by INTEGER REFERENCES users(id);

COMMENT ON COLUMN defect_entries_v2.spec_id IS 'Link to spec that failed (for SPEC_FAILURE defects)';
COMMENT ON COLUMN defect_entries_v2.original_measured_value IS 'Original measured value when spec failed';
COMMENT ON COLUMN defect_entries_v2.reverification_result IS 'Result of re-verification during release (OK/NOK)';
COMMENT ON COLUMN defect_entries_v2.reverification_value IS 'New measured value during re-verification';
