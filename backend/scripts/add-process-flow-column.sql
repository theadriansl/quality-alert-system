-- Add process_flow column to eightd_reports table
-- This column will store the visual process flow diagram data as JSON

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'eightd_reports'
        AND column_name = 'process_flow'
    ) THEN
        ALTER TABLE eightd_reports
        ADD COLUMN process_flow JSONB DEFAULT '[]';

        COMMENT ON COLUMN eightd_reports.process_flow IS 'Process flow diagram data with symbols, descriptions, and problem points';
    END IF;
END $$;

-- Create index for JSON queries
CREATE INDEX IF NOT EXISTS idx_eightd_reports_process_flow
ON eightd_reports USING GIN (process_flow);

COMMENT ON INDEX idx_eightd_reports_process_flow IS 'GIN index for efficient JSONB queries on process flow data';
