-- ============================================================================
-- QAR (Quality Alert Report) System
-- Migration: 023_qar_system.sql
-- ============================================================================

-- QAR Status enum
-- DRAFT: Being created
-- PENDING_REVIEW: Waiting for review
-- ACTIVE: Alert is active
-- RESOLVED: Issue resolved
-- CLOSED: Alert closed

-- Main QAR table
CREATE TABLE IF NOT EXISTS quality_alerts (
  id SERIAL PRIMARY KEY,
  alert_number VARCHAR(50) UNIQUE NOT NULL,  -- QAR-2024-001 format

  -- Context
  client_id INTEGER REFERENCES clients(id),
  project_id INTEGER REFERENCES projects(id),
  part_id INTEGER REFERENCES client_parts(id),

  -- Alert details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity_id INTEGER REFERENCES inspection_severities(id),

  -- Trigger info
  trigger_type VARCHAR(50) DEFAULT 'manual',  -- manual, threshold, escalation
  trigger_defect_count INTEGER,
  trigger_period_hours INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT',

  -- Photos
  photo_ok_path VARCHAR(500),
  photo_nok_path VARCHAR(500),

  -- Assignment
  assigned_to INTEGER REFERENCES users(id),
  reported_by INTEGER REFERENCES users(id),

  -- Dates
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,

  -- Notes
  resolution_notes TEXT,
  root_cause TEXT,
  corrective_action TEXT
);

-- QAR linked defects (the defects that triggered/are related to this QAR)
CREATE TABLE IF NOT EXISTS qar_defects (
  id SERIAL PRIMARY KEY,
  qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
  defect_entry_id INTEGER REFERENCES defect_entries(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QAR recipients (who should be notified)
CREATE TABLE IF NOT EXISTS qar_recipients (
  id SERIAL PRIMARY KEY,
  qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  notified_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QAR comments/history
CREATE TABLE IF NOT EXISTS qar_comments (
  id SERIAL PRIMARY KEY,
  qar_id INTEGER REFERENCES quality_alerts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'note',  -- note, status_change, assignment
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quality_alerts_client ON quality_alerts(client_id);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_part ON quality_alerts(part_id);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_status ON quality_alerts(status);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_assigned ON quality_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qar_defects_qar ON qar_defects(qar_id);
CREATE INDEX IF NOT EXISTS idx_qar_defects_entry ON qar_defects(defect_entry_id);

-- Function to generate QAR number
CREATE OR REPLACE FUNCTION generate_qar_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(alert_number FROM 'QAR-' || year_part || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM quality_alerts
  WHERE alert_number LIKE 'QAR-' || year_part || '-%';

  new_number := 'QAR-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Set default thresholds for severities
UPDATE inspection_severities SET qar_threshold_count = 5, qar_threshold_hours = 8 WHERE code = 'MINOR';
UPDATE inspection_severities SET qar_threshold_count = 3, qar_threshold_hours = 4 WHERE code = 'MAJOR';
UPDATE inspection_severities SET qar_threshold_count = 1, qar_threshold_hours = 1 WHERE code = 'CRITICAL';
UPDATE inspection_severities SET qar_threshold_count = 1, qar_threshold_hours = 1 WHERE code = 'ALTA';

SELECT 'QAR System tables created successfully' as status;
