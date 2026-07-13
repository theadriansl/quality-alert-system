-- ============================================================================
-- Migration 101: Add default_department_id to defect_types
-- ============================================================================
-- Each defect type can have a default responsible department
-- This is used when creating defects to auto-assign responsibility
-- Users can override at capture time or reassign later in Hospital
-- ============================================================================

-- Add column
ALTER TABLE defect_types
ADD COLUMN IF NOT EXISTS default_department_id INTEGER REFERENCES departments(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_defect_types_default_dept ON defect_types(default_department_id);

-- Set some sensible defaults based on category
-- SPEC category (id=9) -> Calidad (id=2)
UPDATE defect_types SET default_department_id = 2 WHERE category_id = 9 AND default_department_id IS NULL;

-- ASSEMBLY category (id=5) -> Producción (id=1)
UPDATE defect_types SET default_department_id = 1 WHERE category_id = 5 AND default_department_id IS NULL;

-- FUNCTIONAL category (id=2) -> Ingeniería (id=3)
UPDATE defect_types SET default_department_id = 3 WHERE category_id = 2 AND default_department_id IS NULL;

-- Comment
COMMENT ON COLUMN defect_types.default_department_id IS 'Default department responsible for this defect type. Used when creating defects, can be overridden.';
