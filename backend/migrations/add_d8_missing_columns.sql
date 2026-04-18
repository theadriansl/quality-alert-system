-- Add missing D8 columns to eightd_reports table
-- These columns are needed for the D8 component to function properly

-- D8 Follow-up Actions (array of action items)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d8_followup_actions JSONB DEFAULT '[]';

-- D8 Evidence Documentation (array of evidence items)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d8_evidence_documentation JSONB DEFAULT '[]';

-- D8 Closure Notes (text field for final notes)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d8_closure_notes TEXT;

-- D8 Closed By (user ID who closed the 8D)
ALTER TABLE eightd_reports
ADD COLUMN IF NOT EXISTS d8_closed_by INTEGER REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN eightd_reports.d8_followup_actions IS 'Follow-up actions after 8D closure (JSONB array)';
COMMENT ON COLUMN eightd_reports.d8_evidence_documentation IS 'Documentation evidence for D8 (JSONB array)';
COMMENT ON COLUMN eightd_reports.d8_closure_notes IS 'Final closure notes for the 8D report';
COMMENT ON COLUMN eightd_reports.d8_closed_by IS 'User ID who approved the 8D closure (Quality Manager)';
