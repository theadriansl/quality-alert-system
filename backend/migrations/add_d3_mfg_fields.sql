-- ============================================================================
-- Migration: Add D3-MFG (Manufacturing Containment) Fields
-- Date: 2025-11-26
-- Description: Separates Quality containment (D3) from Manufacturing
--              containment (D3-MFG) to maintain "police vs criminals" separation
-- ============================================================================

-- D3-MFG: Manufacturing Containment Actions
-- These fields capture what PRODUCTION/MANUFACTURING does to contain the problem
-- while root cause is being investigated

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_temporary_controls JSONB;
COMMENT ON COLUMN eightd_reports.d3_mfg_temporary_controls IS
'Array of temporary process controls implemented by Manufacturing. Example: [{description: "100% inspection at station 3", implementedBy: "John Doe", date: "2025-11-26"}]';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_inspection_points JSONB;
COMMENT ON COLUMN eightd_reports.d3_mfg_inspection_points IS
'Array of inspection points added to the production line. Example: [{location: "After press", what: "Check dimension A", frequency: "Every piece"}]';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_parameters_adjusted JSONB;
COMMENT ON COLUMN eightd_reports.d3_mfg_parameters_adjusted IS
'Array of process parameters that were adjusted temporarily. Example: [{parameter: "Temperature", from: "180°C", to: "175°C", reason: "Reduce warping"}]';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_poka_yoke_devices JSONB;
COMMENT ON COLUMN eightd_reports.d3_mfg_poka_yoke_devices IS
'Array of poka-yoke/error-proofing devices installed temporarily. Example: [{device: "Go/No-Go gauge", location: "Station 5", purpose: "Verify hole diameter"}]';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_line_modifications TEXT;
COMMENT ON COLUMN eightd_reports.d3_mfg_line_modifications IS
'Description of physical modifications made to the production line (layout changes, station additions, etc.)';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_operator_training TEXT;
COMMENT ON COLUMN eightd_reports.d3_mfg_operator_training IS
'Description of training provided to operators (new inspection criteria, new procedures, etc.)';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_effectiveness_validation TEXT;
COMMENT ON COLUMN eightd_reports.d3_mfg_effectiveness_validation IS
'Evidence that the temporary controls are effective (e.g., "0 defects in 100 pieces produced after implementation")';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_responsible_user_id INTEGER REFERENCES users(id);
COMMENT ON COLUMN eightd_reports.d3_mfg_responsible_user_id IS
'Manufacturing supervisor or manager responsible for implementing D3-MFG containment actions';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_implementation_date DATE;
COMMENT ON COLUMN eightd_reports.d3_mfg_implementation_date IS
'Date when D3-MFG containment actions were implemented';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_completed BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN eightd_reports.d3_mfg_completed IS
'Flag indicating if D3-MFG section is completed. D4 Root Cause Analysis is blocked until this is true.';

ALTER TABLE eightd_reports ADD COLUMN IF NOT EXISTS d3_mfg_completed_at TIMESTAMP;
COMMENT ON COLUMN eightd_reports.d3_mfg_completed_at IS
'Timestamp when D3-MFG section was marked as completed';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all columns were added:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'eightd_reports'
-- AND column_name LIKE 'd3_mfg%'
-- ORDER BY column_name;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_temporary_controls;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_inspection_points;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_parameters_adjusted;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_poka_yoke_devices;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_line_modifications;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_operator_training;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_effectiveness_validation;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_responsible_user_id;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_implementation_date;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_completed;
-- ALTER TABLE eightd_reports DROP COLUMN IF EXISTS d3_mfg_completed_at;
