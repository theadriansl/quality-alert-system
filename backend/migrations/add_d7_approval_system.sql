-- ============================================
-- D7 APPROVAL SYSTEM MIGRATION
-- ============================================
-- Adds approval workflow columns to eightd_reports table
-- for D7 (Aseguramiento de No Reincidencia)

-- Add D7 status column
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_status VARCHAR(20) DEFAULT 'draft';

-- Add D7 approval history column (JSON array)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_approval_history JSONB DEFAULT '[]'::jsonb;

-- Add D7 completed flag
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d7_completed BOOLEAN DEFAULT false;

-- Add index on d7_status for faster queries
CREATE INDEX IF NOT EXISTS idx_eightd_reports_d7_status ON eightd_reports(d7_status);

-- Add comments for documentation
COMMENT ON COLUMN eightd_reports.d7_status IS 'Estado de aprobación de D7: draft, under_review, approved';
COMMENT ON COLUMN eightd_reports.d7_approval_history IS 'Historial de aprobaciones/rechazos de D7 en formato JSON';
COMMENT ON COLUMN eightd_reports.d7_completed IS 'Indica si D7 está marcada como completada';

-- Add CHECK constraint to ensure valid status values
ALTER TABLE eightd_reports
ADD CONSTRAINT check_d7_status
CHECK (d7_status IN ('draft', 'under_review', 'approved'));

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'D7 approval system migration completed successfully';
  RAISE NOTICE 'Added columns: d7_status, d7_approval_history, d7_completed';
END $$;
