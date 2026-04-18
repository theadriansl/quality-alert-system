-- Migration: Create audit log table for 8D reports
-- Purpose: Track all changes, modifications, and actions on 8D reports
-- Date: 2025-11-27

CREATE TABLE IF NOT EXISTS eightd_audit_log (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES eightd_reports(id) ON DELETE CASCADE,

  -- Action details
  action_type VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'approved', 'rejected', 'status_changed', 'd1_modified', etc.
  action_category VARCHAR(50),       -- 'report', 'approval', 'section', 'status'
  section_name VARCHAR(50),          -- 'd1', 'd2', 'd3', 'd4', etc.

  -- User who performed the action
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(255),            -- Denormalized for historical record

  -- Change details
  description TEXT,                  -- Human-readable description
  old_value TEXT,                    -- Previous value (JSON or text)
  new_value TEXT,                    -- New value (JSON or text)

  -- Metadata
  ip_address VARCHAR(50),
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Indexes for faster queries
  CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES eightd_reports(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_report_id ON eightd_audit_log(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON eightd_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON eightd_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON eightd_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_section ON eightd_audit_log(section_name);

COMMENT ON TABLE eightd_audit_log IS 'Audit log for tracking all changes and actions on 8D reports';
COMMENT ON COLUMN eightd_audit_log.action_type IS 'Type of action: created, updated, approved, rejected, status_changed, etc.';
COMMENT ON COLUMN eightd_audit_log.action_category IS 'Category: report, approval, section, status';
COMMENT ON COLUMN eightd_audit_log.section_name IS 'Section affected: d1, d2, d3, d4, d5, d6, d7, d8';
COMMENT ON COLUMN eightd_audit_log.description IS 'Human-readable description of the action';
