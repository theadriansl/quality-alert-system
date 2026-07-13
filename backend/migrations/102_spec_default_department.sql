-- ============================================================================
-- Migration 102: Add default_department_id to part_specifications
-- ============================================================================
-- Each spec/checkpoint can have a default responsible department
-- When a spec fails (NOK), the generated defect uses this department
-- ============================================================================

-- Add column
ALTER TABLE part_specifications
ADD COLUMN IF NOT EXISTS default_department_id INTEGER REFERENCES departments(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_part_specs_default_dept ON part_specifications(default_department_id);

-- Comment
COMMENT ON COLUMN part_specifications.default_department_id IS 'Default department responsible when this spec fails. Used when creating defects from spec NOK.';
