-- ============================================================================
-- Migration: Convert D3-MFG TEXT fields to JSONB arrays
-- Date: 2025-12-03
-- Description: Convert 3 TEXT fields to JSONB arrays to match structure of
--              other D3-MFG fields (with comments and evidence support)
-- ============================================================================

-- BACKGROUND:
-- The first 4 D3-MFG fields already use JSONB arrays:
--   - d3_mfg_temporary_controls (JSONB)
--   - d3_mfg_inspection_points (JSONB)
--   - d3_mfg_parameters_adjusted (JSONB)
--   - d3_mfg_poka_yoke_devices (JSONB)
--
-- The last 3 fields still use TEXT:
--   - d3_mfg_line_modifications (TEXT)
--   - d3_mfg_operator_training (TEXT)
--   - d3_mfg_effectiveness_validation (TEXT)
--
-- This migration converts them to JSONB arrays with the same structure:
-- [{ description: '', comments: '', evidence: [] }]

-- ============================================================================
-- VERIFICATION: Check current status
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking current field types...';
END $$;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND column_name IN (
    'd3_mfg_line_modifications',
    'd3_mfg_operator_training',
    'd3_mfg_effectiveness_validation'
  )
ORDER BY column_name;

-- ============================================================================
-- STEP 1: Rename old TEXT columns (backup)
-- ============================================================================

DO $$
BEGIN
    -- Check if columns exist before renaming
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_line_modifications') THEN
        ALTER TABLE eightd_reports
        RENAME COLUMN d3_mfg_line_modifications TO d3_mfg_line_modifications_old;
        RAISE NOTICE '✓ Renamed d3_mfg_line_modifications to _old';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_operator_training') THEN
        ALTER TABLE eightd_reports
        RENAME COLUMN d3_mfg_operator_training TO d3_mfg_operator_training_old;
        RAISE NOTICE '✓ Renamed d3_mfg_operator_training to _old';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_effectiveness_validation') THEN
        ALTER TABLE eightd_reports
        RENAME COLUMN d3_mfg_effectiveness_validation TO d3_mfg_effectiveness_validation_old;
        RAISE NOTICE '✓ Renamed d3_mfg_effectiveness_validation to _old';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create new JSONB columns
-- ============================================================================

DO $$
BEGIN
    -- Add new JSONB columns
    ALTER TABLE eightd_reports
    ADD COLUMN IF NOT EXISTS d3_mfg_line_modifications JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ Created d3_mfg_line_modifications as JSONB';

    ALTER TABLE eightd_reports
    ADD COLUMN IF NOT EXISTS d3_mfg_operator_training JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ Created d3_mfg_operator_training as JSONB';

    ALTER TABLE eightd_reports
    ADD COLUMN IF NOT EXISTS d3_mfg_effectiveness_validation JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ Created d3_mfg_effectiveness_validation as JSONB';
END $$;

-- ============================================================================
-- STEP 3: Migrate data from old TEXT to new JSONB
-- ============================================================================

-- Migrate line modifications
UPDATE eightd_reports
SET d3_mfg_line_modifications = jsonb_build_array(
    jsonb_build_object(
        'description', COALESCE(d3_mfg_line_modifications_old, ''),
        'comments', '',
        'evidence', '[]'::jsonb
    )
)
WHERE d3_mfg_line_modifications_old IS NOT NULL
  AND d3_mfg_line_modifications_old != '';

-- Migrate operator training
UPDATE eightd_reports
SET d3_mfg_operator_training = jsonb_build_array(
    jsonb_build_object(
        'description', COALESCE(d3_mfg_operator_training_old, ''),
        'comments', '',
        'evidence', '[]'::jsonb
    )
)
WHERE d3_mfg_operator_training_old IS NOT NULL
  AND d3_mfg_operator_training_old != '';

-- Migrate effectiveness validation
UPDATE eightd_reports
SET d3_mfg_effectiveness_validation = jsonb_build_array(
    jsonb_build_object(
        'description', COALESCE(d3_mfg_effectiveness_validation_old, ''),
        'comments', '',
        'evidence', '[]'::jsonb
    )
)
WHERE d3_mfg_effectiveness_validation_old IS NOT NULL
  AND d3_mfg_effectiveness_validation_old != '';

-- ============================================================================
-- STEP 4: Drop old TEXT columns
-- ============================================================================

DO $$
BEGIN
    -- Drop old columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_line_modifications_old') THEN
        ALTER TABLE eightd_reports DROP COLUMN d3_mfg_line_modifications_old;
        RAISE NOTICE '✓ Dropped d3_mfg_line_modifications_old';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_operator_training_old') THEN
        ALTER TABLE eightd_reports DROP COLUMN d3_mfg_operator_training_old;
        RAISE NOTICE '✓ Dropped d3_mfg_operator_training_old';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'eightd_reports'
               AND column_name = 'd3_mfg_effectiveness_validation_old') THEN
        ALTER TABLE eightd_reports DROP COLUMN d3_mfg_effectiveness_validation_old;
        RAISE NOTICE '✓ Dropped d3_mfg_effectiveness_validation_old';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: Check new field types
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'Checking new field types...';
END $$;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND column_name IN (
    'd3_mfg_line_modifications',
    'd3_mfg_operator_training',
    'd3_mfg_effectiveness_validation'
  )
ORDER BY column_name;

-- ============================================================================
-- RESULT
-- ============================================================================

-- Expected result:
-- d3_mfg_effectiveness_validation | jsonb
-- d3_mfg_line_modifications       | jsonb
-- d3_mfg_operator_training        | jsonb

-- All 3 fields are now JSONB arrays matching the structure of other D3-MFG fields!
