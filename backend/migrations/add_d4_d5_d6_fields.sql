-- Migration: Add D4, D5, D6 fields to eightd_reports
-- Created: November 15, 2025
-- Description: Adds fields for Root Cause Analysis (D4), Corrective Actions (D5),
--              and Implementation (D6)

-- ============================================================================
-- D4 - ROOT CAUSE ANALYSIS
-- ============================================================================

DO $$
BEGIN
    -- D4 Analysis Technique Used
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_analysis_technique'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_analysis_technique VARCHAR(50);

        COMMENT ON COLUMN eightd_reports.d4_analysis_technique IS 'Root cause analysis technique used (5_whys, fishbone, pareto, etc.)';
    END IF;

    -- D4 Five Whys Analysis
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_five_whys'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_five_whys JSONB DEFAULT '[]';

        COMMENT ON COLUMN eightd_reports.d4_five_whys IS '5 Why analysis array with questions and answers';
    END IF;

    -- D4 Fishbone Diagram Data
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_fishbone_data'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_fishbone_data JSONB DEFAULT '{
            "manpower": [],
            "method": [],
            "machine": [],
            "material": [],
            "measurement": [],
            "environment": []
        }';

        COMMENT ON COLUMN eightd_reports.d4_fishbone_data IS 'Fishbone/Ishikawa diagram data organized by categories';
    END IF;

    -- D4 Potential Causes
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_potential_causes'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_potential_causes JSONB DEFAULT '[]';

        COMMENT ON COLUMN eightd_reports.d4_potential_causes IS 'Array of potential causes identified during analysis';
    END IF;

    -- D4 Root Cause Identified
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_root_cause'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_root_cause TEXT;

        COMMENT ON COLUMN eightd_reports.d4_root_cause IS 'Verified root cause of the problem';
    END IF;

    -- D4 Root Cause Verification
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_verification_method'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_verification_method TEXT;

        COMMENT ON COLUMN eightd_reports.d4_verification_method IS 'How the root cause was verified';
    END IF;

    -- D4 Verification Evidence
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'd4_verification_evidence'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_verification_evidence TEXT;

        COMMENT ON COLUMN eightd_reports.d4_verification_evidence IS 'Evidence supporting the root cause verification';
    END IF;

END $$;

-- ============================================================================
-- D5 - CORRECTIVE ACTIONS (stored in separate table for multiple actions)
-- ============================================================================

-- Create corrective_actions table
CREATE TABLE IF NOT EXISTS corrective_actions (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,

    -- Action details
    action_description TEXT NOT NULL,
    action_type VARCHAR(50) DEFAULT 'corrective' CHECK (action_type IN ('corrective', 'preventive', 'both')),

    -- Evaluation criteria
    effectiveness_rating VARCHAR(20) CHECK (effectiveness_rating IN ('high', 'medium', 'low')),
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    implementation_time_days INTEGER,

    -- Assignment
    responsible_user_id INTEGER REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Selection
    is_selected BOOLEAN DEFAULT false,
    selection_criteria TEXT,

    -- Validation plan
    validation_plan TEXT,
    validation_criteria TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- D6 - IMPLEMENTATION (extends corrective_actions table)
-- ============================================================================

DO $$
BEGIN
    -- D6 Implementation Status
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'implementation_status'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN implementation_status VARCHAR(50) DEFAULT 'pending'
        CHECK (implementation_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

        COMMENT ON COLUMN corrective_actions.implementation_status IS 'Current status of action implementation';
    END IF;

    -- D6 Planned Start Date
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'planned_start_date'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN planned_start_date DATE;

        COMMENT ON COLUMN corrective_actions.planned_start_date IS 'Planned start date for implementation';
    END IF;

    -- D6 Actual Start Date
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'actual_start_date'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN actual_start_date DATE;

        COMMENT ON COLUMN corrective_actions.actual_start_date IS 'Actual start date of implementation';
    END IF;

    -- D6 Planned Completion Date
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'planned_completion_date'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN planned_completion_date DATE;

        COMMENT ON COLUMN corrective_actions.planned_completion_date IS 'Planned completion date';
    END IF;

    -- D6 Actual Completion Date
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'actual_completion_date'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN actual_completion_date DATE;

        COMMENT ON COLUMN corrective_actions.actual_completion_date IS 'Actual completion date';
    END IF;

    -- D6 Implementation Progress
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN progress_percentage INTEGER DEFAULT 0
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

        COMMENT ON COLUMN corrective_actions.progress_percentage IS 'Implementation progress (0-100%)';
    END IF;

    -- D6 Approver
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'approver_user_id'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN approver_user_id INTEGER REFERENCES users(id);

        COMMENT ON COLUMN corrective_actions.approver_user_id IS 'User who approves the implementation';
    END IF;

    -- D6 Implementation Notes
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'implementation_notes'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN implementation_notes TEXT;

        COMMENT ON COLUMN corrective_actions.implementation_notes IS 'Notes and comments during implementation';
    END IF;

    -- D6 Validation Results
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'validation_results'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN validation_results TEXT;

        COMMENT ON COLUMN corrective_actions.validation_results IS 'Results of validation testing';
    END IF;

    -- D6 Is Effective
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'corrective_actions'
        AND column_name = 'is_effective'
    ) THEN
        ALTER TABLE corrective_actions
        ADD COLUMN is_effective BOOLEAN DEFAULT NULL;

        COMMENT ON COLUMN corrective_actions.is_effective IS 'Whether the action was effective (null = not yet validated)';
    END IF;

END $$;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Indexes for eightd_reports D4 fields
CREATE INDEX IF NOT EXISTS idx_eightd_reports_d4_technique
ON eightd_reports(d4_analysis_technique);

CREATE INDEX IF NOT EXISTS idx_eightd_reports_d4_five_whys
ON eightd_reports USING GIN (d4_five_whys);

CREATE INDEX IF NOT EXISTS idx_eightd_reports_d4_fishbone
ON eightd_reports USING GIN (d4_fishbone_data);

CREATE INDEX IF NOT EXISTS idx_eightd_reports_d4_causes
ON eightd_reports USING GIN (d4_potential_causes);

-- Indexes for corrective_actions table
CREATE INDEX IF NOT EXISTS idx_corrective_actions_report_id
ON corrective_actions(report_id);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_status
ON corrective_actions(implementation_status);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_selected
ON corrective_actions(is_selected);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_responsible
ON corrective_actions(responsible_user_id);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_priority
ON corrective_actions(priority);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE corrective_actions IS 'D5/D6 - Corrective and preventive actions with implementation tracking';
COMMENT ON INDEX idx_corrective_actions_report_id IS 'Index for fast lookup of actions by report';
COMMENT ON INDEX idx_corrective_actions_status IS 'Index for filtering actions by implementation status';
