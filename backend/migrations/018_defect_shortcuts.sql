-- ============================================================================
-- Migration: 018_defect_shortcuts.sql
-- Description: Create defect shortcuts table for quick selection in admin
-- ============================================================================

CREATE TABLE IF NOT EXISTS defect_shortcuts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  defect_type_ids INTEGER[] NOT NULL,
  color VARCHAR(20) DEFAULT '#6b7280',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Add display_name column to part_defect_config for custom names in capture
ALTER TABLE part_defect_config ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
