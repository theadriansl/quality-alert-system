-- ============================================================================
-- MIGRATION 067: Link inspection_stages to departments
-- ============================================================================
-- Adds department_id to inspection_stages so each stage can be associated
-- with a specific department for audit module integration
-- ============================================================================

-- Add department_id column to inspection_stages
ALTER TABLE inspection_stages
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inspection_stages_department ON inspection_stages(department_id);

-- Update comment
COMMENT ON COLUMN inspection_stages.department_id IS 'Optional link to departments table for organizational grouping';
