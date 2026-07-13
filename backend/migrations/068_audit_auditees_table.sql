-- ============================================================================
-- MIGRATION 068: Create audit_auditees table for performance tracking
-- ============================================================================
-- Normalized table for audited persons to enable:
-- - Performance metrics per person
-- - Historical tracking
-- - Dashboard visualizations
-- - Coverage analysis by area/department
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_auditees (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES audit_schedules(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  stage_id INTEGER REFERENCES inspection_stages(id) ON DELETE SET NULL,
  comments TEXT,
  -- Performance fields for future use
  performance_score DECIMAL(5,2),
  findings_count INTEGER DEFAULT 0,
  conformities_count INTEGER DEFAULT 0,
  non_conformities_count INTEGER DEFAULT 0,
  observations TEXT,
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_auditees_schedule ON audit_auditees(schedule_id);
CREATE INDEX IF NOT EXISTS idx_audit_auditees_user ON audit_auditees(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_auditees_department ON audit_auditees(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_auditees_stage ON audit_auditees(stage_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_audit_auditees_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_auditees_timestamp ON audit_auditees;
CREATE TRIGGER trigger_audit_auditees_timestamp
BEFORE UPDATE ON audit_auditees
FOR EACH ROW EXECUTE FUNCTION update_audit_auditees_timestamp();

-- Comments
COMMENT ON TABLE audit_auditees IS 'Personas auditadas por auditoría - permite tracking de desempeño';
COMMENT ON COLUMN audit_auditees.performance_score IS 'Puntuación de desempeño (0-100)';
COMMENT ON COLUMN audit_auditees.findings_count IS 'Total de hallazgos encontrados';
COMMENT ON COLUMN audit_auditees.conformities_count IS 'Cantidad de conformidades';
COMMENT ON COLUMN audit_auditees.non_conformities_count IS 'Cantidad de no conformidades';
