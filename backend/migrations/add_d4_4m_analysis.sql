-- ============================================================================
-- Migration: Add 4M Analysis and 5 Whys to D4
-- Date: 2025-12-03
-- Description: Add two JSONB fields for 4M evaluation table and 5 Whys analysis
-- ============================================================================

-- STRUCTURE:
-- d4_4m_evaluation: Array of evaluation rows
-- [{
--   id: uuid,
--   category: string (Mano de obra, Máquina, Material, Método, Medición, Medio Ambiente),
--   controlPoint: string,
--   standard: string,
--   documentControl: string,
--   reality: string,
--   standardJudgment: string (OK, NG),
--   qualityJudgment: string (OK, NG),
--   comment: string,
--   evidence: []
-- }]
--
-- d4_5whys_analysis: Array of 5 Whys for NG items only
-- [{
--   evaluationId: uuid,
--   factorNG: string,
--   why1: string,
--   why2: string,
--   why3: string,
--   why4: string,
--   why5: string,
--   rootCause: string
-- }]

DO $$
BEGIN
    RAISE NOTICE 'Adding 4M Analysis fields to D4...';
END $$;

-- Add 4M Evaluation Table field
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d4_4m_evaluation JSONB DEFAULT '[]'::jsonb;

-- Add 5 Whys Analysis Table field
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d4_5whys_analysis JSONB DEFAULT '[]'::jsonb;

DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added 4M Analysis fields';
    RAISE NOTICE '  - d4_4m_evaluation (JSONB)';
    RAISE NOTICE '  - d4_5whys_analysis (JSONB)';
END $$;

-- Verification
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND column_name IN ('d4_4m_evaluation', 'd4_5whys_analysis')
ORDER BY column_name;
