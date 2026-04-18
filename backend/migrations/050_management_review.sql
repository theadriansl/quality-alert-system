-- Migration 050: Management Review Integration
-- Integrates Management Review into Workload Manager
-- Covers ISO 9001:9.3 and IATF 16949:9.3

-- ============================================================================
-- 1. MANAGEMENT REVIEW CHECKLIST TEMPLATE (ISO/IATF 9.3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS management_review_checklist_items (
  id SERIAL PRIMARY KEY,
  item_order INTEGER NOT NULL,
  clause VARCHAR(20) NOT NULL,           -- 9.3.2.a, 9.3.2.b, etc.
  category VARCHAR(100) NOT NULL,         -- Input/Output
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed ISO/IATF 9.3 checklist items
INSERT INTO management_review_checklist_items (item_order, clause, category, title, description) VALUES
-- INPUTS (9.3.2)
(1, '9.3.2.a', 'input', 'Estado de acciones de revisiones previas', 'Seguimiento de acciones tomadas en revisiones anteriores'),
(2, '9.3.2.b', 'input', 'Cambios en cuestiones externas e internas', 'Cambios relevantes al SGC y su dirección estratégica'),
(3, '9.3.2.c.1', 'input', 'Satisfacción del cliente', 'Retroalimentación de clientes incluyendo quejas'),
(4, '9.3.2.c.2', 'input', 'Cumplimiento de objetivos de calidad', 'Grado de cumplimiento de los objetivos establecidos'),
(5, '9.3.2.c.3', 'input', 'Desempeño de procesos', 'Conformidad de productos y servicios'),
(6, '9.3.2.c.4', 'input', 'No conformidades y acciones correctivas', 'Análisis de NC y efectividad de acciones'),
(7, '9.3.2.c.5', 'input', 'Resultados de seguimiento y medición', 'KPIs y métricas del SGC'),
(8, '9.3.2.c.6', 'input', 'Resultados de auditorías', 'Internas y externas'),
(9, '9.3.2.c.7', 'input', 'Desempeño de proveedores externos', 'Evaluación y desarrollo de proveedores'),
(10, '9.3.2.d', 'input', 'Adecuación de recursos', 'Suficiencia de recursos para el SGC'),
(11, '9.3.2.e', 'input', 'Eficacia de acciones para riesgos y oportunidades', 'Evaluación de tratamiento de riesgos'),
(12, '9.3.2.f', 'input', 'Oportunidades de mejora', 'Propuestas de mejora continua'),
-- IATF Specific Inputs
(13, '9.3.2.1.a', 'input', 'Costo de no calidad', 'Análisis de costos por fallas internas y externas'),
(14, '9.3.2.1.b', 'input', 'Métricas de efectividad de procesos', 'OEE, eficiencia, productividad'),
(15, '9.3.2.1.c', 'input', 'Métricas de eficiencia de procesos', 'Tiempos de ciclo, lead times'),
(16, '9.3.2.1.d', 'input', 'Conformidad del producto', 'PPM, rechazos, scrap'),
(17, '9.3.2.1.e', 'input', 'Evaluaciones de factibilidad de manufactura', 'Nuevos productos y cambios'),
(18, '9.3.2.1.f', 'input', 'Satisfacción del cliente (IATF)', 'Scorecards, auditorías de cliente'),
(19, '9.3.2.1.g', 'input', 'Objetivos de mantenimiento', 'Disponibilidad de equipo, TPM'),
(20, '9.3.2.1.h', 'input', 'Desempeño de garantías', 'Reclamos, NTF, costos'),
(21, '9.3.2.1.i', 'input', 'Scorecards de cliente', 'Revisión de evaluaciones de clientes'),
(22, '9.3.2.1.j', 'input', 'Fallas de campo potenciales', 'Análisis de riesgo de campo'),
-- OUTPUTS (9.3.3)
(23, '9.3.3.a', 'output', 'Oportunidades de mejora', 'Acciones de mejora identificadas'),
(24, '9.3.3.b', 'output', 'Necesidad de cambios en el SGC', 'Cambios requeridos al sistema'),
(25, '9.3.3.c', 'output', 'Necesidad de recursos', 'Recursos adicionales requeridos')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. MANAGEMENT REVIEW ACTAS (Meeting Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS management_review_actas (
  id SERIAL PRIMARY KEY,

  -- Link to workload activity
  workload_activity_id INTEGER REFERENCES workload_activities(id) ON DELETE SET NULL,

  -- Basic info
  acta_number VARCHAR(50) UNIQUE,         -- MR-2026-Q1
  review_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  location VARCHAR(255),

  -- Status
  status VARCHAR(20) DEFAULT 'draft',     -- draft, in_progress, pending_signatures, completed, cancelled

  -- Attendees (JSONB array)
  attendees JSONB DEFAULT '[]',           -- [{userId, name, position, present, signature, signedAt}]

  -- KPI Snapshot (auto-loaded from dashboards)
  kpi_snapshot JSONB DEFAULT '{}',        -- Frozen KPIs at time of review

  -- Checklist responses
  checklist_responses JSONB DEFAULT '{}', -- {itemId: {status, evidence, comments, linkedIds}}

  -- Decisions and actions
  decisions JSONB DEFAULT '[]',           -- [{description, responsible, dueDate, priority}]

  -- Summary
  executive_summary TEXT,
  next_review_date DATE,

  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Document reference
  document_url VARCHAR(500)               -- Generated PDF
);

CREATE INDEX IF NOT EXISTS idx_mr_actas_date ON management_review_actas(review_date);
CREATE INDEX IF NOT EXISTS idx_mr_actas_status ON management_review_actas(status);
CREATE INDEX IF NOT EXISTS idx_mr_actas_workload ON management_review_actas(workload_activity_id);

-- ============================================================================
-- 3. MANAGEMENT REVIEW ACTIONS (linked to workload)
-- ============================================================================
CREATE TABLE IF NOT EXISTS management_review_actions (
  id SERIAL PRIMARY KEY,
  acta_id INTEGER NOT NULL REFERENCES management_review_actas(id) ON DELETE CASCADE,

  -- Action details
  action_number INTEGER NOT NULL,         -- Sequential within acta
  description TEXT NOT NULL,
  responsible_id INTEGER REFERENCES users(id),
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',   -- pending, in_progress, completed, cancelled
  completion_date DATE,
  completion_notes TEXT,

  -- Link to workload activity (auto-created)
  workload_activity_id INTEGER REFERENCES workload_activities(id) ON DELETE SET NULL,

  -- Source reference (for traceability)
  source_clause VARCHAR(20),              -- 9.3.2.c.4
  source_item_id INTEGER REFERENCES management_review_checklist_items(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mr_actions_acta ON management_review_actions(acta_id);
CREATE INDEX IF NOT EXISTS idx_mr_actions_responsible ON management_review_actions(responsible_id);
CREATE INDEX IF NOT EXISTS idx_mr_actions_status ON management_review_actions(status);

-- ============================================================================
-- 4. KPI SOURCES CONFIGURATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS management_review_kpi_sources (
  id SERIAL PRIMARY KEY,
  kpi_key VARCHAR(50) NOT NULL UNIQUE,    -- 8d_open_count, qar_ppm, etc.
  kpi_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,          -- 8D, QAR, MRB, ECR, AUDIT, TRAINING
  data_source VARCHAR(100) NOT NULL,      -- endpoint or query reference
  display_format VARCHAR(20) DEFAULT 'number', -- number, percentage, currency, days
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed KPI sources
INSERT INTO management_review_kpi_sources (kpi_key, kpi_name, category, data_source, display_format, display_order) VALUES
-- 8D Module
('8d_open_count', '8Ds Abiertos', '8D', '/8d/dashboard-data', 'number', 1),
('8d_avg_days', 'Días Promedio Cierre 8D', '8D', '/8d/dashboard-data', 'days', 2),
('8d_on_time_rate', '% 8D a Tiempo', '8D', '/8d/dashboard-data', 'percentage', 3),
('8d_cost_savings', 'Ahorros por 8D', '8D', '/8d/dashboard-data', 'currency', 4),
-- QAR Module
('qar_total_defects', 'Defectos Reportados', 'QAR', '/qar/dashboard', 'number', 10),
('qar_ppm', 'PPM', 'QAR', '/qar/dashboard', 'number', 11),
('qar_top_defect_types', 'Top Tipos de Defecto', 'QAR', '/qar/dashboard', 'list', 12),
('qar_severity_distribution', 'Distribución por Severidad', 'QAR', '/qar/dashboard', 'chart', 13),
-- MRB Module
('mrb_scrap_cost', 'Costo de Scrap', 'MRB', '/mrb/dashboard', 'currency', 20),
('mrb_inspection_hours', 'Horas de Inspección', 'MRB', '/mrb/dashboard', 'number', 21),
('mrb_active_campaigns', 'Campañas MRB Activas', 'MRB', '/mrb/dashboard', 'number', 22),
-- ECR Module
('ecr_changes_period', 'Cambios en Periodo', 'ECR', '/ecr/dashboard-data', 'number', 30),
('ecr_avg_cycle_time', 'Tiempo Ciclo Promedio ECR', 'ECR', '/ecr/dashboard-data', 'days', 31),
('ecr_risk_distribution', 'Distribución por Riesgo', 'ECR', '/ecr/dashboard-data', 'chart', 32),
-- Audit Module
('audit_completed', 'Auditorías Completadas', 'AUDIT', '/audit/dashboard', 'number', 40),
('audit_nc_count', 'No Conformidades', 'AUDIT', '/audit/dashboard', 'number', 41),
('audit_findings_open', 'Hallazgos Abiertos', 'AUDIT', '/audit/dashboard', 'number', 42),
('audit_nc_closure_rate', '% Cierre NC', 'AUDIT', '/audit/dashboard', 'percentage', 43)
ON CONFLICT (kpi_key) DO NOTHING;

-- ============================================================================
-- 5. TRIGGER FOR updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_mr_actas_updated_at ON management_review_actas;
CREATE TRIGGER update_mr_actas_updated_at
  BEFORE UPDATE ON management_review_actas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mr_actions_updated_at ON management_review_actions;
CREATE TRIGGER update_mr_actions_updated_at
  BEFORE UPDATE ON management_review_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================
COMMENT ON TABLE management_review_checklist_items IS 'ISO/IATF 9.3 checklist template items';
COMMENT ON TABLE management_review_actas IS 'Management review meeting records with KPI snapshots';
COMMENT ON TABLE management_review_actions IS 'Actions from management reviews linked to workload';
COMMENT ON TABLE management_review_kpi_sources IS 'Configuration for KPI data sources';

-- ============================================================================
-- 7. SEQUENCE FOR ACTA NUMBERS
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS management_review_acta_seq START 1;

-- ============================================================================
-- 8. FUNCTION TO GENERATE ACTA NUMBER
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_mr_acta_number(review_date DATE)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  quarter_part VARCHAR(2);
  seq_num INTEGER;
  acta_number VARCHAR(50);
BEGIN
  year_part := EXTRACT(YEAR FROM review_date)::VARCHAR;
  quarter_part := 'Q' || CEIL(EXTRACT(MONTH FROM review_date) / 3.0)::INTEGER;
  seq_num := nextval('management_review_acta_seq');
  acta_number := 'MR-' || year_part || '-' || quarter_part || '-' || LPAD(seq_num::VARCHAR, 3, '0');
  RETURN acta_number;
END;
$$ LANGUAGE plpgsql;
