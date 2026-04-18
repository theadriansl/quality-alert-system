-- Migration: Reorganize D4-D8 Structure for Productive 8D Workflow
-- Created: November 25, 2025
-- Description: Restructures D4-D8 to focus on countermeasures, analysis, and validation
--
-- NEW STRUCTURE:
-- D4: Temporary Countermeasure (Contramedida Temporal)
-- D5: Final Root Cause Analysis (Análisis Final)
-- D6: Definitive Countermeasure (Contramedida Definitiva)
-- D7: Confirmation of Countermeasures (Confirmación)
-- D8: Evidence of Follow-up Actions (Evidencia de Seguimiento)

BEGIN;

-- ============================================================================
-- D4 - TEMPORARY COUNTERMEASURE (Contramedida Temporal)
-- ============================================================================

DO $$
BEGIN
    -- D4 Temporary Countermeasure Description
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_temporary_countermeasure'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_temporary_countermeasure TEXT;
        COMMENT ON COLUMN eightd_reports.d4_temporary_countermeasure IS 'Description of immediate temporary action to contain the problem';
    END IF;

    -- D4 Responsible User
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_responsible_user_id'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_responsible_user_id INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d4_responsible_user_id IS 'User responsible for implementing temporary countermeasure';
    END IF;

    -- D4 Implementation Date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_implementation_date'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_implementation_date DATE;
        COMMENT ON COLUMN eightd_reports.d4_implementation_date IS 'Date when temporary countermeasure was implemented';
    END IF;

    -- D4 Effectiveness Evaluation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_effectiveness_evaluation'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_effectiveness_evaluation TEXT;
        COMMENT ON COLUMN eightd_reports.d4_effectiveness_evaluation IS 'Evaluation of temporary countermeasure effectiveness';
    END IF;

    -- D4 Completion Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_completed'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_completed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_completed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- D5 - FINAL ROOT CAUSE ANALYSIS (Análisis Final)
-- ============================================================================
-- Note: D5 will use the existing d4_* columns for root cause analysis
-- We'll rename them logically in the application layer

DO $$
BEGIN
    -- D5 Final Root Cause Conclusion
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_final_root_cause'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_final_root_cause TEXT;
        COMMENT ON COLUMN eightd_reports.d5_final_root_cause IS 'Final verified root cause conclusion';
    END IF;

    -- D5 Analysis Responsible
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_analysis_responsible_user_id'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_analysis_responsible_user_id INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d5_analysis_responsible_user_id IS 'User responsible for root cause analysis';
    END IF;

    -- D5 Completion Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_completed'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_completed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_completed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- D6 - DEFINITIVE COUNTERMEASURE (Contramedida Definitiva)
-- ============================================================================

DO $$
BEGIN
    -- D6 Definitive Actions Array
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_definitive_actions'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_definitive_actions JSONB DEFAULT '[]';
        COMMENT ON COLUMN eightd_reports.d6_definitive_actions IS 'Array of permanent corrective actions to eliminate root cause';
    END IF;

    -- D6 Implementation Plan
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_implementation_plan'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_implementation_plan JSONB;
        COMMENT ON COLUMN eightd_reports.d6_implementation_plan IS 'Detailed implementation plan for definitive actions';
    END IF;

    -- D6 Validation Results
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_validation_results'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_validation_results TEXT;
        COMMENT ON COLUMN eightd_reports.d6_validation_results IS 'Initial validation results of definitive actions';
    END IF;

    -- D6 Completion Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_completed'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd6_completed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d6_completed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- D7 - CONFIRMATION OF COUNTERMEASURES (Confirmación)
-- ============================================================================

DO $$
BEGIN
    -- D7 Temporary Countermeasure Validation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_temporary_validation'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_temporary_validation TEXT;
        COMMENT ON COLUMN eightd_reports.d7_temporary_validation IS 'Validation results for D4 temporary countermeasure';
    END IF;

    -- D7 Definitive Countermeasure Validation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_definitive_validation'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_definitive_validation TEXT;
        COMMENT ON COLUMN eightd_reports.d7_definitive_validation IS 'Validation results for D6 definitive countermeasure';
    END IF;

    -- D7 Validation Date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_validation_date'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_validation_date DATE;
        COMMENT ON COLUMN eightd_reports.d7_validation_date IS 'Date when countermeasures were validated';
    END IF;

    -- D7 Effectiveness Confirmed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_is_effective'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_is_effective BOOLEAN;
        COMMENT ON COLUMN eightd_reports.d7_is_effective IS 'Whether countermeasures are confirmed effective';
    END IF;

    -- D7 Validation Evidence
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_validation_evidence'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_validation_evidence TEXT;
        COMMENT ON COLUMN eightd_reports.d7_validation_evidence IS 'Evidence supporting validation';
    END IF;

    -- D7 Approved By (Quality Audit)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_approved_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_approved_by INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d7_approved_by IS 'Quality auditor who approved validation';
    END IF;

    -- D7 Approval Date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_approved_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_approved_at TIMESTAMP;
        COMMENT ON COLUMN eightd_reports.d7_approved_at IS 'Date when validation was approved';
    END IF;

    -- D7 Completion Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_completed'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd7_completed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d7_completed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- D8 - EVIDENCE OF FOLLOW-UP ACTIONS (Evidencia de Seguimiento)
-- ============================================================================

DO $$
BEGIN
    -- D8 Follow-up Actions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_followup_actions'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_followup_actions JSONB DEFAULT '[]';
        COMMENT ON COLUMN eightd_reports.d8_followup_actions IS 'Array of follow-up actions and evidence items';
    END IF;

    -- D8 Evidence Documentation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_evidence_documentation'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_evidence_documentation JSONB DEFAULT '[]';
        COMMENT ON COLUMN eightd_reports.d8_evidence_documentation IS 'Documentation and evidence of completed actions';
    END IF;

    -- D8 Closure Notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_closure_notes'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_closure_notes TEXT;
        COMMENT ON COLUMN eightd_reports.d8_closure_notes IS 'Final closure notes and summary';
    END IF;

    -- D8 Lessons Learned
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_lessons_learned'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_lessons_learned TEXT;
        COMMENT ON COLUMN eightd_reports.d8_lessons_learned IS 'Lessons learned from this 8D process';
    END IF;

    -- D8 Closed By (Quality Final Approval)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_closed_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_closed_by INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d8_closed_by IS 'Quality manager who approved final closure';
    END IF;

    -- D8 Closure Date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_closed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_closed_at TIMESTAMP;
        COMMENT ON COLUMN eightd_reports.d8_closed_at IS 'Date when 8D was officially closed';
    END IF;

    -- D8 Completion Status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_completed'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd8_completed_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d8_completed_at TIMESTAMP;
    END IF;
END $$;

-- ============================================================================
-- UPDATE COMMENTS FOR EXISTING D4 COLUMNS (now used by D5)
-- ============================================================================

COMMENT ON COLUMN eightd_reports.d4_five_whys IS 'D5: 5 Why analysis for final root cause (moved from D4)';
COMMENT ON COLUMN eightd_reports.d4_fishbone_data IS 'D5: Fishbone diagram data for final root cause (moved from D4)';
COMMENT ON COLUMN eightd_reports.d4_verification_method IS 'D5: Root cause verification method (moved from D4)';
COMMENT ON COLUMN eightd_reports.d4_verification_evidence IS 'D5: Root cause verification evidence (moved from D4)';

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_eightd_d4_responsible
ON eightd_reports(d4_responsible_user_id);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_responsible
ON eightd_reports(d5_analysis_responsible_user_id);

CREATE INDEX IF NOT EXISTS idx_eightd_d7_approved_by
ON eightd_reports(d7_approved_by);

CREATE INDEX IF NOT EXISTS idx_eightd_d8_closed_by
ON eightd_reports(d8_closed_by);

CREATE INDEX IF NOT EXISTS idx_eightd_d4_completed
ON eightd_reports(d4_completed);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_completed
ON eightd_reports(d5_completed);

CREATE INDEX IF NOT EXISTS idx_eightd_d6_completed
ON eightd_reports(d6_completed);

CREATE INDEX IF NOT EXISTS idx_eightd_d7_completed
ON eightd_reports(d7_completed);

CREATE INDEX IF NOT EXISTS idx_eightd_d8_completed
ON eightd_reports(d8_completed);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration completed successfully!' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND column_name LIKE 'd4_%'
  OR column_name LIKE 'd5_%'
  OR column_name LIKE 'd6_%'
  OR column_name LIKE 'd7_%'
  OR column_name LIKE 'd8_%'
ORDER BY column_name;
