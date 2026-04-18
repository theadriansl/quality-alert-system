-- ============================================================================
-- WORKLOAD SOURCE TRACKING
-- Migration: 007_workload_source_tracking.sql
-- Description: Add source tracking fields for 8D, Audits, and other modules
-- ============================================================================

-- Add source tracking columns to workload_activities
ALTER TABLE workload_activities
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_discipline VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN workload_activities.source_type IS 'Source module: 8D, AUDIT, ECR, etc.';
COMMENT ON COLUMN workload_activities.source_id IS 'Reference ID from source module (e.g., 8D-2026-0142)';
COMMENT ON COLUMN workload_activities.source_discipline IS 'Specific discipline/stage (e.g., D5, D6, D7)';

-- Create index for efficient filtering by source
CREATE INDEX IF NOT EXISTS idx_workload_activities_source
ON workload_activities(source_type, source_id);

-- Create the default 8D_EXECUTION project if it doesn't exist
INSERT INTO workload_projects (name, description, client, status, color)
SELECT
    '8D_EXECUTION',
    'Actividades generadas desde reportes 8D - Acciones correctivas y preventivas',
    'Sistema de Calidad',
    'active',
    '#dc2626'
WHERE NOT EXISTS (
    SELECT 1 FROM workload_projects WHERE name = '8D_EXECUTION'
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Workload source tracking migration completed!';
    RAISE NOTICE '   - Added source_type, source_id, source_discipline columns';
    RAISE NOTICE '   - Created index for source filtering';
    RAISE NOTICE '   - Created 8D_EXECUTION project';
END $$;
