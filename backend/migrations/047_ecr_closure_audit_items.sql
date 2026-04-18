-- Migration 047: ECR Closure Audit Items
-- Replicates D7 audit checklist structure for ECR closure validation

-- ============================================================================
-- 1. Add requires_closure_audit to ecr_reports
-- ============================================================================
ALTER TABLE ecr_reports
ADD COLUMN IF NOT EXISTS requires_closure_audit BOOLEAN DEFAULT false;

COMMENT ON COLUMN ecr_reports.requires_closure_audit IS 'Whether ECR requires audit checklist before closure';

-- ============================================================================
-- 2. Create ecr_closure_audit_items table (mirrors d7_audit_items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ecr_closure_audit_items (
  id SERIAL PRIMARY KEY,
  ecr_id INTEGER NOT NULL REFERENCES ecr_reports(id) ON DELETE CASCADE,

  -- Impact area association
  impact_area_key VARCHAR(100),
  impact_area_name VARCHAR(255),
  impact_subsection VARCHAR(255),

  -- Item identification
  item_name VARCHAR(255) NOT NULL,
  item_icon VARCHAR(10) DEFAULT '📎',
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Check details
  check_item TEXT,
  comments TEXT,
  due_date DATE,

  -- Assignment
  assigned_auditors INTEGER[],

  -- Audit status
  sent_to_audit BOOLEAN DEFAULT false,
  audit_request_id INTEGER,

  -- Auditor feedback
  auditor_comments TEXT,
  auditor_judgment VARCHAR(10) CHECK (auditor_judgment IN ('OK', 'NOK', 'OBS', 'NA', '')),
  auditor_completed BOOLEAN DEFAULT false,
  audited_by INTEGER REFERENCES users(id),
  audited_by_name VARCHAR(255),
  verification_date TIMESTAMP,

  -- Rounds (for re-audits)
  audit_round INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_items_ecr ON ecr_closure_audit_items(ecr_id);
CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_items_sent ON ecr_closure_audit_items(sent_to_audit);
CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_items_due_date ON ecr_closure_audit_items(due_date);

-- Comments
COMMENT ON TABLE ecr_closure_audit_items IS 'Audit checklist items for ECR closure validation (mirrors D7 structure)';
COMMENT ON COLUMN ecr_closure_audit_items.item_name IS 'Name of the audit item (SPC, AMEF, Control Plan, etc.)';
COMMENT ON COLUMN ecr_closure_audit_items.check_item IS 'Description of what the auditor needs to verify';
COMMENT ON COLUMN ecr_closure_audit_items.audit_round IS 'Current audit round (increments on re-send after NOK/OBS)';

-- ============================================================================
-- 3. Create ecr_closure_audit_item_files table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ecr_closure_audit_item_files (
  id SERIAL PRIMARY KEY,
  ecr_closure_audit_item_id INTEGER NOT NULL REFERENCES ecr_closure_audit_items(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_item_files_item ON ecr_closure_audit_item_files(ecr_closure_audit_item_id);

COMMENT ON TABLE ecr_closure_audit_item_files IS 'Files attached to ECR closure audit items';

-- ============================================================================
-- 4. Create ecr_closure_audit_history table (ISO traceability)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ecr_closure_audit_history (
  id SERIAL PRIMARY KEY,
  ecr_closure_audit_item_id INTEGER REFERENCES ecr_closure_audit_items(id) ON DELETE CASCADE,
  audit_round INTEGER NOT NULL,

  -- Auditor's response at this round
  auditor_judgment VARCHAR(20),
  auditor_comments TEXT,
  audited_by INTEGER REFERENCES users(id),
  audited_by_name VARCHAR(255),
  verification_date TIMESTAMP,

  -- Context at time of finding
  check_item TEXT,
  leader_comments TEXT,
  due_date DATE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  closed_by INTEGER REFERENCES users(id),
  closure_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_history_item ON ecr_closure_audit_history(ecr_closure_audit_item_id);
CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_history_round ON ecr_closure_audit_history(ecr_closure_audit_item_id, audit_round);

COMMENT ON TABLE ecr_closure_audit_history IS 'ISO-compliant audit findings history for ECR closure items';

-- ============================================================================
-- 5. Add ecr_closure_audit_item_id to audit_requests
-- ============================================================================
ALTER TABLE audit_requests
ADD COLUMN IF NOT EXISTS ecr_closure_audit_item_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_audit_requests_ecr_closure_item ON audit_requests(ecr_closure_audit_item_id);

COMMENT ON COLUMN audit_requests.ecr_closure_audit_item_id IS 'Link to ECR closure audit item (for ECR source_type)';

-- ============================================================================
-- 6. Update trigger for updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_ecr_closure_audit_items_updated_at ON ecr_closure_audit_items;
CREATE TRIGGER update_ecr_closure_audit_items_updated_at
  BEFORE UPDATE ON ecr_closure_audit_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Add impact area columns (for existing tables)
-- ============================================================================
ALTER TABLE ecr_closure_audit_items
ADD COLUMN IF NOT EXISTS impact_area_key VARCHAR(100);

ALTER TABLE ecr_closure_audit_items
ADD COLUMN IF NOT EXISTS impact_area_name VARCHAR(255);

ALTER TABLE ecr_closure_audit_items
ADD COLUMN IF NOT EXISTS impact_subsection VARCHAR(255);

ALTER TABLE ecr_closure_audit_items
ADD COLUMN IF NOT EXISTS leader_judgment VARCHAR(10) CHECK (leader_judgment IN ('OK', 'NOK', 'OBS', 'NA', ''));

-- Create index for querying by impact area
CREATE INDEX IF NOT EXISTS idx_ecr_closure_audit_items_impact_area ON ecr_closure_audit_items(impact_area_key, impact_subsection);

COMMENT ON COLUMN ecr_closure_audit_items.impact_area_key IS 'Key of the impact area from ECR-2B (e.g., spc, amef)';
COMMENT ON COLUMN ecr_closure_audit_items.impact_area_name IS 'Display name of the impact area';
COMMENT ON COLUMN ecr_closure_audit_items.impact_subsection IS 'Subsection within the impact area';
COMMENT ON COLUMN ecr_closure_audit_items.leader_judgment IS 'Leader judgment for this item (OK/NOK/OBS/NA)';
