-- Migration 046: D7 Audit Rounds and History for ISO Compliance
-- Tracks audit rounds and maintains full history of findings

-- Add audit_round to d7_audit_items
ALTER TABLE d7_audit_items
ADD COLUMN IF NOT EXISTS audit_round INTEGER DEFAULT 1;

-- Create history table for audit findings (ISO traceability)
CREATE TABLE IF NOT EXISTS d7_audit_history (
  id SERIAL PRIMARY KEY,
  d7_audit_item_id INTEGER REFERENCES d7_audit_items(id) ON DELETE CASCADE,
  audit_round INTEGER NOT NULL,

  -- Auditor's response at this round
  auditor_judgment VARCHAR(20),
  auditor_comments TEXT,
  audited_by INTEGER REFERENCES users(id),
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

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_history_item ON d7_audit_history(d7_audit_item_id);
CREATE INDEX IF NOT EXISTS idx_audit_history_round ON d7_audit_history(d7_audit_item_id, audit_round);

-- Comments for documentation
COMMENT ON TABLE d7_audit_history IS 'ISO-compliant audit findings history for D7 validation items';
COMMENT ON COLUMN d7_audit_history.audit_round IS 'Round number (1, 2, 3...) for this finding';
COMMENT ON COLUMN d7_audit_history.closure_notes IS 'Notes when finding was closed/resolved';
