-- Migration: Create ECR/ECO Tables
-- Date: 2026-01-08
-- Description: Create tables for Engineering Change Request/Order module

-- Main ECR Reports Table
CREATE TABLE IF NOT EXISTS ecr_reports (
  id SERIAL PRIMARY KEY,
  ecr_number VARCHAR(50) UNIQUE NOT NULL,

  -- Client & Project Reference
  client_id INTEGER REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  project_number VARCHAR(100),
  project_name VARCHAR(255),

  -- ECR-2: Change Request Information
  change_title VARCHAR(255) NOT NULL,
  change_description TEXT,
  change_reason TEXT,
  change_category VARCHAR(50), -- emergency, planned, continuous_improvement
  change_type VARCHAR(50), -- Design, Process, Material, Safety, Administrative, Layout, Other
  priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
  risk_assessment JSONB, -- {riskLevel, suggestedAreas, reasoning, riskLevelInfo}
  selected_parts JSONB DEFAULT '[]',
  affected_documents JSONB DEFAULT '[]',

  -- Photos/Evidence
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',

  -- ECR-1: Teams Assignment
  review_board JSONB DEFAULT '{}', -- {primary: userId, members: [userId1, userId2]}
  validation_teams JSONB DEFAULT '{}', -- {design: [userId1], manufacturing: [userId2], ...}
  involved_areas JSONB DEFAULT '[]', -- ['Design', 'Manufacturing', 'Quality', ...]

  -- ECR-3: Validation & Implementation
  validation_actions JSONB DEFAULT '[]',
  trial_plan TEXT,
  implementation_plan TEXT,
  validation_evidence JSONB DEFAULT '{}',

  -- ECR-4: Closure
  closure_notes TEXT,
  lessons_learned TEXT,
  follow_up_actions JSONB DEFAULT '[]',
  evidence_documentation JSONB DEFAULT '[]',

  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'draft',
  -- Status flow: draft → submitted → under_validation → ready_for_trial →
  --              trial_in_progress → trial_passed/trial_failed →
  --              production → monitoring → closed
  current_stage VARCHAR(50) DEFAULT 'change_request',
  -- Stages: change_request, validation, trial, production, closure

  -- Audit Fields
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_by INTEGER REFERENCES users(id),
  closed_at TIMESTAMP
);

-- ECR Validations Table (optional, for detailed tracking per area)
CREATE TABLE IF NOT EXISTS ecr_validations (
  id SERIAL PRIMARY KEY,
  ecr_id INTEGER REFERENCES ecr_reports(id) ON DELETE CASCADE,
  area VARCHAR(50) NOT NULL, -- Design, Manufacturing, Quality, Supply Chain, etc.
  validator_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, needs_changes
  comments TEXT,
  validated_at TIMESTAMP,
  checklist JSONB DEFAULT '[]' -- [{item: '...', checked: true/false, comments: '...'}]
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ecr_reports_status ON ecr_reports(status);
CREATE INDEX IF NOT EXISTS idx_ecr_reports_client ON ecr_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_ecr_reports_project ON ecr_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_ecr_reports_ecr_number ON ecr_reports(ecr_number);
CREATE INDEX IF NOT EXISTS idx_ecr_reports_created_by ON ecr_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_ecr_reports_created_at ON ecr_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_ecr_validations_ecr ON ecr_validations(ecr_id);
CREATE INDEX IF NOT EXISTS idx_ecr_validations_area ON ecr_validations(area);

-- Comments for documentation
COMMENT ON TABLE ecr_reports IS 'Engineering Change Request/Order reports';
COMMENT ON TABLE ecr_validations IS 'Validation tracking by area for ECR reports';
COMMENT ON COLUMN ecr_reports.ecr_number IS 'Unique ECR identifier (ECR-YYYY-XXX)';
COMMENT ON COLUMN ecr_reports.status IS 'Workflow status: draft, submitted, under_validation, ready_for_trial, trial_in_progress, trial_passed, trial_failed, production, monitoring, closed';
COMMENT ON COLUMN ecr_reports.current_stage IS 'Current workflow stage: change_request, validation, trial, production, closure';
COMMENT ON COLUMN ecr_reports.change_category IS 'Change category: emergency, planned, continuous_improvement';
COMMENT ON COLUMN ecr_reports.risk_assessment IS 'Calculated risk info: {riskLevel, suggestedAreas, reasoning, riskLevelInfo, legalDisclaimer}';
