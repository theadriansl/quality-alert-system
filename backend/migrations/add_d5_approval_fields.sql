-- ============================================================================
-- Migration: Add D5 Approval Fields
-- Date: December 16, 2025
-- Description: Adds approval workflow fields for D5 (Corrective Actions)
-- ============================================================================

BEGIN;

-- Add D5 status field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_status VARCHAR(50) DEFAULT 'draft';
        COMMENT ON COLUMN eightd_reports.d5_status IS 'D5 approval status: draft, under_review, approved';
    END IF;
END $$;

-- Add D5 current approval step field
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_current_approval_step'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_current_approval_step INTEGER DEFAULT 0;
        COMMENT ON COLUMN eightd_reports.d5_current_approval_step IS 'D5 current approval step: 0=primary, 1-3=approvers, 4=completed';
    END IF;
END $$;

-- Add D5 Approval Step 1 fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_1_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_1_status VARCHAR(50);
        COMMENT ON COLUMN eightd_reports.d5_approval_1_status IS 'Approver 1 decision: approved or rejected';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_1_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_1_by INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d5_approval_1_by IS 'User ID of approver 1';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_1_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_1_at TIMESTAMP;
        COMMENT ON COLUMN eightd_reports.d5_approval_1_at IS 'Timestamp when approver 1 made decision';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_1_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_1_comments TEXT;
        COMMENT ON COLUMN eightd_reports.d5_approval_1_comments IS 'Approver 1 comments';
    END IF;
END $$;

-- Add D5 Approval Step 2 fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_2_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_2_status VARCHAR(50);
        COMMENT ON COLUMN eightd_reports.d5_approval_2_status IS 'Approver 2 decision: approved or rejected';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_2_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_2_by INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d5_approval_2_by IS 'User ID of approver 2';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_2_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_2_at TIMESTAMP;
        COMMENT ON COLUMN eightd_reports.d5_approval_2_at IS 'Timestamp when approver 2 made decision';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_2_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_2_comments TEXT;
        COMMENT ON COLUMN eightd_reports.d5_approval_2_comments IS 'Approver 2 comments';
    END IF;
END $$;

-- Add D5 Approval Step 3 fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_3_status'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_3_status VARCHAR(50);
        COMMENT ON COLUMN eightd_reports.d5_approval_3_status IS 'Approver 3 decision: approved or rejected';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_3_by'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_3_by INTEGER REFERENCES users(id);
        COMMENT ON COLUMN eightd_reports.d5_approval_3_by IS 'User ID of approver 3';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_3_at'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_3_at TIMESTAMP;
        COMMENT ON COLUMN eightd_reports.d5_approval_3_at IS 'Timestamp when approver 3 made decision';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'eightd_reports' AND column_name = 'd5_approval_3_comments'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN d5_approval_3_comments TEXT;
        COMMENT ON COLUMN eightd_reports.d5_approval_3_comments IS 'Approver 3 comments';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_eightd_d5_status
ON eightd_reports(d5_status);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_current_approval_step
ON eightd_reports(d5_current_approval_step);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_approval_1_by
ON eightd_reports(d5_approval_1_by);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_approval_2_by
ON eightd_reports(d5_approval_2_by);

CREATE INDEX IF NOT EXISTS idx_eightd_d5_approval_3_by
ON eightd_reports(d5_approval_3_by);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'D5 approval fields migration completed successfully!' as status;

-- Display new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'eightd_reports'
  AND column_name LIKE 'd5_%'
ORDER BY column_name;
