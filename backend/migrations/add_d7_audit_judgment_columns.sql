-- Add audit judgment columns to D7 validation tables

-- Add to d7_validations table for SPC and Training
ALTER TABLE d7_validations
ADD COLUMN IF NOT EXISTS spc_audit_judgment VARCHAR(10),
ADD COLUMN IF NOT EXISTS training_audit_judgment VARCHAR(10);

-- Add to d7_documents_updated table for all documents
ALTER TABLE d7_documents_updated
ADD COLUMN IF NOT EXISTS audit_judgment VARCHAR(10);

-- Add comments
COMMENT ON COLUMN d7_validations.spc_audit_judgment IS 'Audit judgment for SPC validation: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_validations.training_audit_judgment IS 'Audit judgment for training: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
COMMENT ON COLUMN d7_documents_updated.audit_judgment IS 'Audit judgment for document: C (Conforme), NC (No Conforme), NA (No Aplica), OBS (Observación)';
