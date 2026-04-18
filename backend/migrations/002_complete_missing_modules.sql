-- ============================================================================
-- MIGRATION 002: Complete Missing Modules - Migrate from Memory to PostgreSQL
-- Date: 2025-11-13
-- Description: Creates tables for Quotes, Work Instructions, Services/Timesheets
--              and completes missing functionality
-- ============================================================================

-- ============================================================================
-- 1. QUOTES MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,

  -- Quote Identification
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  -- Status values: 'Draft', 'Sent', 'Approved', 'Rejected', 'Expired'

  -- Client Information
  client_company VARCHAR(255),
  client_contact VARCHAR(255),
  client_billing_address TEXT,
  client_city VARCHAR(100),
  client_phone VARCHAR(50),
  client_email VARCHAR(255),

  -- Service Location
  service_company VARCHAR(255),
  service_contact VARCHAR(255),
  service_address TEXT,
  service_city VARCHAR(100),
  service_phone VARCHAR(50),
  service_email VARCHAR(255),

  -- Project Information
  project_description TEXT,
  part_descriptions TEXT,

  -- Service Rates (JSONB for flexibility)
  service_rates JSONB DEFAULT '{
    "workingSupervisor": {
      "shift1": 29.00,
      "shift2_3": 29.00,
      "overtime": 43.50,
      "saturday": 43.50,
      "sunday": 43.50,
      "holiday": 53.50
    },
    "inspector": {
      "shift1": 26.00,
      "shift2_3": 26.00,
      "overtime": 39.00,
      "saturday": 39.00,
      "sunday": 39.00,
      "holiday": 52.00
    }
  }'::jsonb,

  -- Agreed Services
  agreed_services TEXT,
  estimated_hours NUMERIC(10, 2) DEFAULT 0,

  -- Additional Terms
  minimum_hours INTEGER DEFAULT 4,
  overtime_threshold INTEGER DEFAULT 40,
  material_markup INTEGER DEFAULT 10,

  -- Purchase Order
  purchase_order_number VARCHAR(100),
  purchase_order_amount VARCHAR(50),

  -- Signatures
  signed_by_client BOOLEAN DEFAULT FALSE,
  client_signature TEXT, -- Base64 or path
  client_signature_date DATE,
  client_signature_title VARCHAR(100),
  signed_by_company BOOLEAN DEFAULT FALSE,
  company_signature TEXT, -- Base64 or path
  company_signature_date DATE,

  -- Export tracking
  exported_to_pdf BOOLEAN DEFAULT FALSE,
  exported_to_word BOOLEAN DEFAULT FALSE,
  last_exported_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_date ON quotes(date DESC);

-- ============================================================================
-- 2. WORK INSTRUCTIONS MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_instructions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100) NOT NULL,
  revision VARCHAR(50) DEFAULT 'Rev 1',
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  -- Status values: 'Draft', 'In Review', 'Approved', 'Obsolete'

  -- Description Fields
  description TEXT,
  purpose TEXT,
  scope TEXT,

  -- Equipment, Materials, Tools (JSONB arrays)
  equipment JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  tools JSONB DEFAULT '[]'::jsonb,
  safety_requirements JSONB DEFAULT '[]'::jsonb,
  quality_standards JSONB DEFAULT '[]'::jsonb,

  -- Approval
  approved_by VARCHAR(255),
  approved_date DATE,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX idx_work_instructions_project_id ON work_instructions(project_id);
CREATE INDEX idx_work_instructions_part_number ON work_instructions(part_number);
CREATE INDEX idx_work_instructions_status ON work_instructions(status);

-- ============================================================================
-- Work Instruction Steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_instruction_steps (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Visual aids
  image_url TEXT,
  video_url TEXT,

  -- Quality checks
  quality_checkpoints JSONB DEFAULT '[]'::jsonb,

  -- Warnings
  warnings TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_work_instruction_step UNIQUE (work_instruction_id, step_number)
);

CREATE INDEX idx_wi_steps_work_instruction_id ON work_instruction_steps(work_instruction_id);

-- ============================================================================
-- Work Instruction Risk Assessments
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_instruction_risk_assessments (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  part_number VARCHAR(100),

  -- 16 standard questions with scores
  assessments JSONB NOT NULL,
  -- Structure: [{"question": "1.1", "score": 3, "comments": "..."}, ...]

  total_score NUMERIC(5, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  -- Status values: 'Pending', 'Approved', 'Needs Revision'

  -- Revision tracking
  revision_number INTEGER DEFAULT 1,
  previous_assessment_id INTEGER REFERENCES work_instruction_risk_assessments(id),

  -- Metadata
  created_date DATE DEFAULT CURRENT_DATE,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wi_risk_work_instruction_id ON work_instruction_risk_assessments(work_instruction_id);
CREATE INDEX idx_wi_risk_part_number ON work_instruction_risk_assessments(part_number);
CREATE INDEX idx_wi_risk_created_date ON work_instruction_risk_assessments(created_date DESC);

-- ============================================================================
-- Work Instruction Process Audits
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_instruction_process_audits (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  auditor VARCHAR(255) NOT NULL,
  shift VARCHAR(50),
  operator VARCHAR(255),

  score NUMERIC(5, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Draft',
  -- Status values: 'Draft', 'Completed', 'Approved'

  -- Checklist (JSONB array of questions)
  checklist JSONB DEFAULT '[]'::jsonb,

  -- Observations
  qms_observations TEXT,
  ppc_observations TEXT,

  -- Corrective Actions (JSONB array)
  corrective_actions JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wi_audit_work_instruction_id ON work_instruction_process_audits(work_instruction_id);
CREATE INDEX idx_wi_audit_date ON work_instruction_process_audits(audit_date DESC);
CREATE INDEX idx_wi_audit_auditor ON work_instruction_process_audits(auditor);

-- ============================================================================
-- Work Instruction Timeline (for activity tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_instruction_timeline (
  id SERIAL PRIMARY KEY,
  work_instruction_id INTEGER NOT NULL REFERENCES work_instructions(id) ON DELETE CASCADE,

  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  icon VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wi_timeline_work_instruction_id ON work_instruction_timeline(work_instruction_id);
CREATE INDEX idx_wi_timeline_timestamp ON work_instruction_timeline(timestamp DESC);

-- ============================================================================
-- 3. SERVICES MODULE - Team Members
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_team_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,

  -- Member Information
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  -- Role values: 'Supervisor', 'Inspector', 'Technician', etc.

  email VARCHAR(255),
  phone VARCHAR(50),

  -- Employment
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'Active',
  -- Status values: 'Active', 'Inactive', 'Completed'

  -- Rates
  hourly_rate NUMERIC(10, 2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

CREATE INDEX idx_job_team_members_project_id ON job_team_members(project_id);
CREATE INDEX idx_job_team_members_status ON job_team_members(status);
CREATE INDEX idx_job_team_members_role ON job_team_members(role);

-- ============================================================================
-- 4. SERVICES MODULE - Timesheets
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_timesheets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id INTEGER NOT NULL REFERENCES job_team_members(id) ON DELETE CASCADE,

  -- Time Entry
  work_date DATE NOT NULL,
  regular_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,

  shift_type VARCHAR(50) NOT NULL DEFAULT 'shift1',
  -- Shift values: 'shift1', 'shift2_3', 'saturday', 'sunday', 'holiday'

  -- Description
  description TEXT,

  -- Overtime Approval
  overtime_approved_by VARCHAR(255),

  -- Entry Status
  status VARCHAR(50) DEFAULT 'Pending',
  -- Status values: 'Pending', 'Approved', 'Rejected', 'Billed'

  approved_by VARCHAR(255),
  approved_at TIMESTAMP,

  rejected_by VARCHAR(255),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),

  -- Constraints
  CONSTRAINT positive_hours CHECK (regular_hours >= 0 AND overtime_hours >= 0),
  CONSTRAINT at_least_some_hours CHECK (regular_hours > 0 OR overtime_hours > 0)
);

CREATE INDEX idx_job_timesheets_project_id ON job_timesheets(project_id);
CREATE INDEX idx_job_timesheets_team_member_id ON job_timesheets(team_member_id);
CREATE INDEX idx_job_timesheets_work_date ON job_timesheets(work_date DESC);
CREATE INDEX idx_job_timesheets_status ON job_timesheets(status);

-- Unique constraint to prevent duplicate shift entries
CREATE UNIQUE INDEX idx_unique_timesheet_entry
ON job_timesheets(team_member_id, work_date, shift_type);

-- ============================================================================
-- 5. GENERIC DOCUMENTS MODULE (Job-related documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File Information
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL, -- Unique filename on server
  mime_type VARCHAR(100),
  file_size BIGINT, -- Size in bytes
  file_path TEXT, -- Full path or S3 URL

  -- Document Metadata
  document_type VARCHAR(100) DEFAULT 'other',
  -- Types: 'email', 'operation-sheet', 'analysis', 'presentation', 'contract', 'invoice', 'other'

  title VARCHAR(255),
  description TEXT,
  notes TEXT,

  -- Tags for organization (JSONB array)
  tags JSONB DEFAULT '[]'::jsonb,

  -- Upload Information
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_documents_project_id ON job_documents(project_id);
CREATE INDEX idx_job_documents_document_type ON job_documents(document_type);
CREATE INDEX idx_job_documents_uploaded_at ON job_documents(uploaded_at DESC);

-- ============================================================================
-- 6. AUTO-UPDATE TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_instructions_updated_at BEFORE UPDATE ON work_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wi_process_audits_updated_at BEFORE UPDATE ON work_instruction_process_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_team_members_updated_at BEFORE UPDATE ON job_team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_timesheets_updated_at BEFORE UPDATE ON job_timesheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_documents_updated_at BEFORE UPDATE ON job_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert a sample quote (optional, for testing)
-- INSERT INTO quotes (quote_number, date, status, client_company, created_by)
-- VALUES ('Q-2025-001', CURRENT_DATE, 'Draft', 'Sample Client Inc.', 'System');

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================

-- Verification queries:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) FROM quotes;
-- SELECT COUNT(*) FROM work_instructions;
-- SELECT COUNT(*) FROM job_team_members;
-- SELECT COUNT(*) FROM job_timesheets;
