-- Migration: Add Approval Fields for D3-MFG and D4
-- Created: December 3, 2025
-- Description: Adds approval workflow fields (3 approvers) for D3-MFG and D4 sections

BEGIN;

-- ============================================================================
-- D3-MFG APPROVAL FIELDS
-- ============================================================================

DO $$
BEGIN
    -- D3-MFG Approval 1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_1_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_1_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d3_mfg_approval_1_status IN ('pending', 'approved', 'rejected'));

        COMMENT ON COLUMN eightd_reports.d3_mfg_approval_1_status IS 'D3-MFG Approver 1 status';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_1_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_1_by INTEGER REFERENCES users(id);

        COMMENT ON COLUMN eightd_reports.d3_mfg_approval_1_by IS 'User who approved/rejected (Approver 1)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_1_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_1_at TIMESTAMP;

        COMMENT ON COLUMN eightd_reports.d3_mfg_approval_1_at IS 'When Approver 1 made decision';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_1_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_1_comments TEXT;

        COMMENT ON COLUMN eightd_reports.d3_mfg_approval_1_comments IS 'Comments from Approver 1';
    END IF;

    -- D3-MFG Approval 2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_2_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_2_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d3_mfg_approval_2_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_2_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_2_by INTEGER REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_2_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_2_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_2_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_2_comments TEXT;
    END IF;

    -- D3-MFG Approval 3
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_3_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_3_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d3_mfg_approval_3_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_3_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_3_by INTEGER REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_3_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_3_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_approval_3_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_approval_3_comments TEXT;
    END IF;

    -- D3-MFG Current Approval Step (0=primary working, 1=approver1, 2=approver2, 3=approver3, 4=fully approved)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd3_mfg_current_approval_step'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d3_mfg_current_approval_step INTEGER DEFAULT 0
        CHECK (d3_mfg_current_approval_step >= 0 AND d3_mfg_current_approval_step <= 4);

        COMMENT ON COLUMN eightd_reports.d3_mfg_current_approval_step IS 'Current approval step: 0=primary, 1=approver1, 2=approver2, 3=approver3, 4=completed';
    END IF;

END $$;

-- ============================================================================
-- D4 APPROVAL FIELDS
-- ============================================================================

DO $$
BEGIN
    -- D4 Approval 1
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_1_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_1_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d4_approval_1_status IN ('pending', 'approved', 'rejected'));

        COMMENT ON COLUMN eightd_reports.d4_approval_1_status IS 'D4 Approver 1 status';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_1_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_1_by INTEGER REFERENCES users(id);

        COMMENT ON COLUMN eightd_reports.d4_approval_1_by IS 'User who approved/rejected (Approver 1)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_1_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_1_at TIMESTAMP;

        COMMENT ON COLUMN eightd_reports.d4_approval_1_at IS 'When Approver 1 made decision';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_1_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_1_comments TEXT;

        COMMENT ON COLUMN eightd_reports.d4_approval_1_comments IS 'Comments from Approver 1';
    END IF;

    -- D4 Approval 2
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_2_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_2_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d4_approval_2_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_2_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_2_by INTEGER REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_2_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_2_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_2_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_2_comments TEXT;
    END IF;

    -- D4 Approval 3
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_3_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_3_status VARCHAR(20) DEFAULT 'pending'
        CHECK (d4_approval_3_status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_3_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_3_by INTEGER REFERENCES users(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_3_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_3_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_approval_3_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_approval_3_comments TEXT;
    END IF;

    -- D4 Current Approval Step
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd4_current_approval_step'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d4_current_approval_step INTEGER DEFAULT 0
        CHECK (d4_current_approval_step >= 0 AND d4_current_approval_step <= 4);

        COMMENT ON COLUMN eightd_reports.d4_current_approval_step IS 'Current approval step: 0=primary, 1=approver1, 2=approver2, 3=approver3, 4=completed';
    END IF;

END $$;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_eightd_d3_mfg_approval_step
ON eightd_reports(d3_mfg_current_approval_step);

CREATE INDEX IF NOT EXISTS idx_eightd_d4_approval_step
ON eightd_reports(d4_current_approval_step);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration completed successfully!' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND (column_name LIKE 'd3_mfg_approval%' OR column_name LIKE 'd4_approval%')
ORDER BY column_name;
