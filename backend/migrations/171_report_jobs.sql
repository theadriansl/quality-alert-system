-- Migration 171: Report Jobs - Async report generation queue
-- Supports background generation of heavy reports (Excel, PDF)

CREATE TABLE IF NOT EXISTS report_jobs (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL,        -- 'hospital', 'mrb', '8d', 'defects', 'qar', 'audit'
  report_name VARCHAR(200),                 -- Human-readable name
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
  params JSONB,                             -- Filters: dateFrom, dateTo, clientId, projectId, etc.
  file_path VARCHAR(500),                   -- Path to generated file
  file_size INTEGER,                        -- File size in bytes
  file_format VARCHAR(10) DEFAULT 'xlsx',   -- xlsx, pdf, csv
  error_message TEXT,                       -- Error details if failed
  progress INTEGER DEFAULT 0,               -- 0-100 percentage
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP                      -- Auto-cleanup after this date
);

CREATE INDEX idx_report_jobs_user ON report_jobs(created_by);
CREATE INDEX idx_report_jobs_status ON report_jobs(status);
CREATE INDEX idx_report_jobs_created ON report_jobs(created_at DESC);
CREATE INDEX idx_report_jobs_expires ON report_jobs(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE report_jobs IS 'Queue for async report generation - heavy exports run in background';
COMMENT ON COLUMN report_jobs.report_type IS 'Type: hospital, mrb, 8d, defects, qar, audit, production';
COMMENT ON COLUMN report_jobs.params IS 'JSON filters: {dateFrom, dateTo, clientId, projectId, status, etc}';
COMMENT ON COLUMN report_jobs.expires_at IS 'Files auto-deleted after this timestamp (default 7 days)';

-- Function to set expiration date on insert
CREATE OR REPLACE FUNCTION set_report_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := CURRENT_TIMESTAMP + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_report_expiration ON report_jobs;
CREATE TRIGGER trigger_report_expiration
  BEFORE INSERT ON report_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_report_expiration();

-- Seed report types catalog (optional, for UI dropdown)
CREATE TABLE IF NOT EXISTS report_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  available_formats TEXT[] DEFAULT ARRAY['xlsx'],
  requires_params TEXT[],  -- Required filter fields
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

INSERT INTO report_types (code, name, description, available_formats, requires_params, display_order) VALUES
  ('hospital_defects', 'Defectos Hospital', 'Reporte completo de defectos con historial de reparación/liberación', ARRAY['xlsx', 'pdf'], ARRAY['dateFrom', 'dateTo'], 1),
  ('mrb_campaigns', 'Campañas MRB', 'Resumen de campañas MRB con inventario y resultados', ARRAY['xlsx'], ARRAY['dateFrom', 'dateTo'], 2),
  ('mrb_inspection', 'Inspección MRB Detallada', 'Detalle de inspecciones por serial con rondas', ARRAY['xlsx'], ARRAY['mrbCampaignId'], 3),
  ('8d_reports', 'Reportes 8D', 'Listado de 8D con métricas de cierre y etapas', ARRAY['xlsx', 'pdf'], ARRAY['dateFrom', 'dateTo'], 4),
  ('qar_list', 'Quality Alert Requests', 'Listado QAR con status y validaciones', ARRAY['xlsx'], ARRAY['dateFrom', 'dateTo'], 5),
  ('production_summary', 'Resumen Producción', 'Entradas de producción con inspecciones', ARRAY['xlsx'], ARRAY['dateFrom', 'dateTo'], 6),
  ('audit_findings', 'Hallazgos Auditoría', 'Auditorías con hallazgos y acciones correctivas', ARRAY['xlsx', 'pdf'], ARRAY['dateFrom', 'dateTo'], 7)
ON CONFLICT (code) DO NOTHING;
