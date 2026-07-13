-- Migration: Create audit log table for ECR module
-- Purpose: Track all changes, modifications, and actions on ECR reports

CREATE TABLE IF NOT EXISTS ecr_audit_log (
  id SERIAL PRIMARY KEY,
  ecr_id INTEGER NOT NULL REFERENCES ecr_reports(id) ON DELETE CASCADE,

  -- Action details
  action_type VARCHAR(50) NOT NULL,
  action_category VARCHAR(50),   -- 'report', 'approval', 'file', 'closure', 'email'
  section_name VARCHAR(50),      -- 'ecr-1', 'ecr-2', 'ecr-2b', 'ecr-3', 'ecr-4'

  -- User who performed the action
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(255),

  -- Change details
  description TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecr_audit_ecr_id     ON ecr_audit_log(ecr_id);
CREATE INDEX IF NOT EXISTS idx_ecr_audit_user_id    ON ecr_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ecr_audit_action     ON ecr_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_ecr_audit_created_at ON ecr_audit_log(created_at);
