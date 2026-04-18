-- ============================================================================
-- Migration: 012_add_bom_subcomponents.sql
-- Date: 2026-02-02
-- Description: Add parent_part_id to client_parts for BOM hierarchy (subcomponents)
-- ============================================================================

-- Add parent_part_id column to client_parts
ALTER TABLE client_parts
ADD COLUMN IF NOT EXISTS parent_part_id INTEGER REFERENCES client_parts(id) ON DELETE SET NULL;

-- Add level column to track hierarchy depth (0 = root, 1 = child, 2 = grandchild, etc.)
ALTER TABLE client_parts
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;

-- Create index for faster hierarchical queries
CREATE INDEX IF NOT EXISTS idx_client_parts_parent ON client_parts(parent_part_id);
CREATE INDEX IF NOT EXISTS idx_client_parts_level ON client_parts(level);

-- Add constraint to prevent circular references (part can't be its own parent)
ALTER TABLE client_parts
ADD CONSTRAINT check_no_self_parent CHECK (id != parent_part_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN client_parts.parent_part_id IS 'Reference to parent part for BOM hierarchy. NULL means root-level part.';
COMMENT ON COLUMN client_parts.level IS 'Hierarchy level: 0=root part, 1=subcomponent, 2=sub-subcomponent, etc.';

-- ============================================================================
-- HELPER FUNCTION: Get all descendants of a part (recursive)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_part_descendants(part_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  part_number VARCHAR(100),
  part_name VARCHAR(255),
  parent_part_id INTEGER,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE part_tree AS (
    -- Base case: the part itself
    SELECT cp.id, cp.part_number, cp.part_name, cp.parent_part_id, 0 as depth
    FROM client_parts cp
    WHERE cp.id = part_id

    UNION ALL

    -- Recursive case: children
    SELECT cp.id, cp.part_number, cp.part_name, cp.parent_part_id, pt.depth + 1
    FROM client_parts cp
    INNER JOIN part_tree pt ON cp.parent_part_id = pt.id
    WHERE pt.depth < 10  -- Prevent infinite loops, max 10 levels
  )
  SELECT pt.id, pt.part_number, pt.part_name, pt.parent_part_id, pt.depth as level
  FROM part_tree pt
  WHERE pt.id != part_id  -- Exclude the root part itself
  ORDER BY pt.depth, pt.part_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get full path of a part (ancestors)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_part_path(part_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  path TEXT := '';
  current_id INTEGER := part_id;
  current_name VARCHAR(255);
  parent_id INTEGER;
BEGIN
  LOOP
    SELECT cp.part_name, cp.parent_part_id INTO current_name, parent_id
    FROM client_parts cp
    WHERE cp.id = current_id;

    IF NOT FOUND THEN
      EXIT;
    END IF;

    IF path = '' THEN
      path := current_name;
    ELSE
      path := current_name || ' > ' || path;
    END IF;

    IF parent_id IS NULL THEN
      EXIT;
    END IF;

    current_id := parent_id;
  END LOOP;

  RETURN path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-calculate level based on parent
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_part_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_part_id IS NULL THEN
    NEW.level := 0;
  ELSE
    SELECT COALESCE(level, 0) + 1 INTO NEW.level
    FROM client_parts
    WHERE id = NEW.parent_part_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_part_level ON client_parts;
CREATE TRIGGER trigger_calculate_part_level
BEFORE INSERT OR UPDATE OF parent_part_id ON client_parts
FOR EACH ROW
EXECUTE FUNCTION calculate_part_level();

-- ============================================================================
-- Update existing parts to have level = 0 (all are root level currently)
-- ============================================================================
UPDATE client_parts SET level = 0 WHERE level IS NULL;
