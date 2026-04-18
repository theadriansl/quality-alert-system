-- Update D7 validations table - Replace effectiveness validation with countermeasures validation

-- Remove old effectiveness validation columns
ALTER TABLE d7_validations
DROP COLUMN IF EXISTS is_effective,
DROP COLUMN IF EXISTS validation_evidence,
DROP COLUMN IF EXISTS validation_date,
DROP COLUMN IF EXISTS monitoring_period;

-- Add new countermeasures validation columns
ALTER TABLE d7_validations
ADD COLUMN IF NOT EXISTS d3_implemented BOOLEAN,
ADD COLUMN IF NOT EXISTS d3_effective BOOLEAN,
ADD COLUMN IF NOT EXISTS d3_spc_judgment VARCHAR(10),
ADD COLUMN IF NOT EXISTS d3_client_judgment VARCHAR(10),
ADD COLUMN IF NOT EXISTS d3_comments TEXT,
ADD COLUMN IF NOT EXISTS d3_lesson TEXT,
ADD COLUMN IF NOT EXISTS d5_implemented BOOLEAN,
ADD COLUMN IF NOT EXISTS d5_effective BOOLEAN,
ADD COLUMN IF NOT EXISTS d5_spc_judgment VARCHAR(10),
ADD COLUMN IF NOT EXISTS d5_client_judgment VARCHAR(10),
ADD COLUMN IF NOT EXISTS d5_comments TEXT,
ADD COLUMN IF NOT EXISTS d5_lesson TEXT;

-- Add comments to describe the columns
COMMENT ON COLUMN d7_validations.d3_implemented IS 'D3 Temporal countermeasure implemented: Y/N';
COMMENT ON COLUMN d7_validations.d3_effective IS 'D3 Temporal countermeasure effective: Y/N';
COMMENT ON COLUMN d7_validations.d3_spc_judgment IS 'SPC judgment for D3: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_validations.d3_client_judgment IS 'Client judgment for D3: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_validations.d3_comments IS 'Comments about D3 temporal countermeasure';
COMMENT ON COLUMN d7_validations.d3_lesson IS 'Lesson learned from D3 temporal countermeasure';

COMMENT ON COLUMN d7_validations.d5_implemented IS 'D5 Definitive countermeasure implemented: Y/N';
COMMENT ON COLUMN d7_validations.d5_effective IS 'D5 Definitive countermeasure effective: Y/N';
COMMENT ON COLUMN d7_validations.d5_spc_judgment IS 'SPC judgment for D5: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_validations.d5_client_judgment IS 'Client judgment for D5: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_validations.d5_comments IS 'Comments about D5 definitive countermeasure';
COMMENT ON COLUMN d7_validations.d5_lesson IS 'Lesson learned from D5 definitive countermeasure';
