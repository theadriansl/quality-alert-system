-- ============================================================================
-- QUALITY ALERT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS eightd_status_history CASCADE;
DROP TABLE IF EXISTS eightd_parts CASCADE;
DROP TABLE IF EXISTS eightd_reports CASCADE;
DROP TABLE IF EXISTS team_presets CASCADE;
DROP TABLE IF EXISTS project_parts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS client_documents CASCADE;
DROP TABLE IF EXISTS client_contacts CASCADE;
DROP TABLE IF EXISTS client_timeline CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50),
  department VARCHAR(100),
  phone VARCHAR(50),
  is_tft_member BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_tft_member ON users(is_tft_member);

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(100),
  vendor_number VARCHAR(100),
  corporate_address TEXT,
  corporate_phone VARCHAR(50),
  corporate_fax VARCHAR(50),
  billing_address TEXT,
  billing_frequency VARCHAR(50),
  billing_period VARCHAR(100),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  requires_signature BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_alias ON clients(alias);
CREATE INDEX idx_clients_is_active ON clients(is_active);

-- ============================================================================
-- CLIENT CONTACTS TABLE
-- ============================================================================
CREATE TABLE client_contacts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);

-- ============================================================================
-- CLIENT DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE client_documents (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  file_path TEXT NOT NULL,
  server_file_name VARCHAR(255) NOT NULL,
  uploaded_by VARCHAR(255),
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);

-- ============================================================================
-- CLIENT TIMELINE TABLE
-- ============================================================================
CREATE TABLE client_timeline (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  event_category VARCHAR(50) NOT NULL, -- 'client', 'project', 'contact', 'document', 'part'
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  user_name VARCHAR(255) DEFAULT 'System',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_client_timeline_client_id ON client_timeline(client_id);
CREATE INDEX idx_client_timeline_event_category ON client_timeline(event_category);
CREATE INDEX idx_client_timeline_created_at ON client_timeline(created_at DESC);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  project_number VARCHAR(100) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  start_date DATE,
  target_end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_project_number ON projects(project_number);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================================================
-- PROJECT PARTS TABLE
-- ============================================================================
CREATE TABLE project_parts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  part_number VARCHAR(100) NOT NULL,
  client_part_number VARCHAR(100),
  part_name VARCHAR(255) NOT NULL,
  description TEXT,
  revision VARCHAR(50),
  specifications TEXT,
  weight DECIMAL(10, 3),
  snp_quantity INTEGER,
  snp_volume DECIMAL(10, 3),
  unit_cost DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_parts_project_id ON project_parts(project_id);
CREATE INDEX idx_project_parts_part_number ON project_parts(part_number);

-- ============================================================================
-- 8D REPORTS TABLE
-- ============================================================================
CREATE TABLE eightd_reports (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  supplier_name VARCHAR(255),
  supplier_account VARCHAR(100),
  part_number VARCHAR(100),
  part_name VARCHAR(255),
  problem_type VARCHAR(100),
  severity VARCHAR(50) NOT NULL,
  tipo_issue VARCHAR(100),
  tipo_resp VARCHAR(100),
  timing_occurrence VARCHAR(255),
  estimated_cost DECIMAL(12, 2) DEFAULT 0,
  issue_date DATE NOT NULL,
  target_closure_date DATE,
  customer_impact TEXT,
  status VARCHAR(50) DEFAULT 'in_progress',
  current_step VARCHAR(50) DEFAULT 'escalation',
  progress_percentage INTEGER DEFAULT 0,

  -- Escalation path assignments
  issue_assigned_to INTEGER REFERENCES users(id),
  countermeasure_assigned_to INTEGER REFERENCES users(id),
  confirmation_assigned_to INTEGER REFERENCES users(id),

  -- Process flow diagram
  process_flow JSONB DEFAULT '[]',

  -- D1 - Team Formation
  d1_team_members JSONB DEFAULT '[]',
  d1_champion_id INTEGER REFERENCES users(id),
  d1_completed BOOLEAN DEFAULT FALSE,
  d1_completed_at TIMESTAMP,

  -- D2 - Problem Description
  d2_problem_description TEXT,
  d2_is_or_is_not JSONB,
  d2_completed BOOLEAN DEFAULT FALSE,
  d2_completed_at TIMESTAMP,

  -- D3 - Interim Containment Actions
  d3_containment_actions JSONB DEFAULT '[]',
  d3_completed BOOLEAN DEFAULT FALSE,
  d3_completed_at TIMESTAMP,

  -- D4 - Root Cause Analysis
  d4_root_causes JSONB DEFAULT '[]',
  d4_five_whys JSONB,
  d4_fishbone_data JSONB,
  d4_completed BOOLEAN DEFAULT FALSE,
  d4_completed_at TIMESTAMP,

  -- D5 - Permanent Corrective Actions
  d5_corrective_actions JSONB DEFAULT '[]',
  d5_completed BOOLEAN DEFAULT FALSE,
  d5_completed_at TIMESTAMP,

  -- D6 - Implement and Validate
  d6_implementation_plan JSONB,
  d6_validation_results JSONB,
  d6_completed BOOLEAN DEFAULT FALSE,
  d6_completed_at TIMESTAMP,

  -- D7 - Prevent Recurrence
  d7_preventive_actions JSONB DEFAULT '[]',
  d7_system_improvements JSONB,
  d7_completed BOOLEAN DEFAULT FALSE,
  d7_completed_at TIMESTAMP,

  -- D8 - Congratulate Team
  d8_lessons_learned TEXT,
  d8_team_recognition JSONB,
  d8_completed BOOLEAN DEFAULT FALSE,
  d8_completed_at TIMESTAMP,
  d8_closed_at TIMESTAMP,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eightd_reports_report_id ON eightd_reports(report_id);
CREATE INDEX idx_eightd_reports_status ON eightd_reports(status);
CREATE INDEX idx_eightd_reports_severity ON eightd_reports(severity);
CREATE INDEX idx_eightd_reports_current_step ON eightd_reports(current_step);
CREATE INDEX idx_eightd_reports_issue_date ON eightd_reports(issue_date DESC);

-- ============================================================================
-- 8D PARTS TABLE (Parts associated with an 8D report)
-- ============================================================================
CREATE TABLE eightd_parts (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,
  client_id INTEGER,
  client_name VARCHAR(255),
  project_id INTEGER,
  project_number VARCHAR(100),
  project_name VARCHAR(255),
  part_id INTEGER, -- Original part ID from project_parts
  part_number VARCHAR(100) NOT NULL,
  part_name VARCHAR(255) NOT NULL,
  client_part_number VARCHAR(100),
  revision VARCHAR(50),
  description TEXT,
  unit_cost DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  specifications JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eightd_parts_report_id ON eightd_parts(report_id);
CREATE INDEX idx_eightd_parts_part_number ON eightd_parts(part_number);

-- ============================================================================
-- 8D STATUS HISTORY TABLE
-- ============================================================================
CREATE TABLE eightd_status_history (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  previous_step VARCHAR(50),
  new_step VARCHAR(50),
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eightd_status_history_report_id ON eightd_status_history(report_id);
CREATE INDEX idx_eightd_status_history_created_at ON eightd_status_history(created_at DESC);

-- ============================================================================
-- TEAM PRESETS TABLE
-- ============================================================================
CREATE TABLE team_presets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  preset_name VARCHAR(255) NOT NULL,
  issue_user_ids JSONB DEFAULT '[]',
  countermeasure_user_ids JSONB DEFAULT '[]',
  confirmation_user_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_preset_name UNIQUE (user_id, preset_name)
);

CREATE INDEX idx_team_presets_user_id ON team_presets(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_parts_updated_at BEFORE UPDATE ON project_parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eightd_reports_updated_at BEFORE UPDATE ON eightd_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_presets_updated_at BEFORE UPDATE ON team_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
