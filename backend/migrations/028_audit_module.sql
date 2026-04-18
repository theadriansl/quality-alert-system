-- ============================================================================
-- AUDIT ISO MODULE - Complete Database Schema
-- Migration 028
-- ============================================================================

-- ============================================================================
-- 1. EXTEND USERS TABLE (Auditor Profile)
-- ============================================================================
-- Add auditor-related columns to existing users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_auditor BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auditor_areas TEXT[];  -- ['proceso','sistema','producto','proveedor']
ALTER TABLE users ADD COLUMN IF NOT EXISTS auditor_certifications TEXT[];  -- ['ISO 9001', 'IATF 16949', 'VDA 6.3']

-- Index for auditors
CREATE INDEX IF NOT EXISTS idx_users_is_auditor ON users(is_auditor) WHERE is_auditor = true;

-- ============================================================================
-- 2. AUDIT PROGRAMS TABLE (Programa Anual)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_programs (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  audit_type VARCHAR(50),             -- 'interna', 'proveedor', 'proceso', 'producto', 'sistema'
  scope TEXT,
  objectives TEXT,
  criteria TEXT,                      -- 'ISO 9001', 'IATF 16949', 'Procedimientos internos'
  frequency_basis VARCHAR(50),        -- 'riesgo', 'trimestral', 'semestral', 'anual'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'approved', 'in_progress', 'completed'
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_programs_year ON audit_programs(year);
CREATE INDEX IF NOT EXISTS idx_audit_programs_status ON audit_programs(status);

-- ============================================================================
-- 3. AUDIT CHECKLISTS TABLE (Plantillas de Checklist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_checklists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  standard VARCHAR(100),              -- 'ISO 9001:2015', 'IATF 16949:2016', 'VDA 6.3'
  process VARCHAR(100),
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_checklists_standard ON audit_checklists(standard);
CREATE INDEX IF NOT EXISTS idx_audit_checklists_active ON audit_checklists(is_active);

-- ============================================================================
-- 4. AUDIT CHECKLIST ITEMS TABLE (Preguntas del Checklist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES audit_checklists(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  clause VARCHAR(50),                 -- '8.5.1', '9.2.2'
  question TEXT NOT NULL,
  guidance TEXT,                      -- Guía para el auditor
  evidence_required TEXT,             -- Qué evidencia buscar
  category VARCHAR(100),              -- Agrupación
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_checklist_items_checklist ON audit_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_audit_checklist_items_order ON audit_checklist_items(checklist_id, item_order);

-- ============================================================================
-- 5. AUDIT SCHEDULES TABLE (Calendario de Auditorías)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_schedules (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES audit_programs(id) ON DELETE CASCADE,
  audit_number VARCHAR(50) UNIQUE,    -- AUD-2026-001
  audit_name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Área/Proceso a auditar
  area_process VARCHAR(200),
  department VARCHAR(100),

  -- Programación
  planned_start_date DATE NOT NULL,
  planned_end_date DATE NOT NULL,
  actual_start_date DATE,
  actual_end_date DATE,

  -- Recurrencia (para auditorías periódicas)
  is_recurring BOOLEAN DEFAULT FALSE,
  frequency VARCHAR(20),              -- 'weekly', 'monthly', 'quarterly', 'yearly'
  frequency_details JSONB,
  parent_schedule_id INTEGER REFERENCES audit_schedules(id),

  -- Asignación (usa usuarios disponibles con is_auditor=true)
  lead_auditor_id INTEGER REFERENCES users(id),
  co_auditors INTEGER[],              -- Array de user_ids
  auditees TEXT[],                    -- Nombres/áreas de auditados

  -- Checklist
  checklist_id INTEGER REFERENCES audit_checklists(id),

  -- Vinculación a otros módulos
  linked_ecr_id INTEGER,              -- FK a ecr_reports - para auditar cambios de ingeniería
  linked_8d_id INTEGER,               -- FK a eightd_reports - para auditorías de seguimiento
  linked_qar_id INTEGER,              -- FK a quality_alerts - para auditorías por alerta de calidad

  -- Estado
  status VARCHAR(20) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled', 'postponed'

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_schedules_program ON audit_schedules(program_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_status ON audit_schedules(status);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_dates ON audit_schedules(planned_start_date, planned_end_date);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_auditor ON audit_schedules(lead_auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_ecr ON audit_schedules(linked_ecr_id);

-- ============================================================================
-- 6. AUDITS TABLE (Ejecución de Auditoría)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audits (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER REFERENCES audit_schedules(id),
  audit_number VARCHAR(50),           -- Heredado de schedule

  -- Datos generales
  audit_date DATE NOT NULL,
  lead_auditor_id INTEGER REFERENCES users(id),
  co_auditors INTEGER[],
  auditees_present TEXT[],
  area_process VARCHAR(200),

  -- Resumen
  total_items INTEGER DEFAULT 0,
  conformities INTEGER DEFAULT 0,
  non_conformities_major INTEGER DEFAULT 0,
  non_conformities_minor INTEGER DEFAULT 0,
  observations INTEGER DEFAULT 0,
  opportunities INTEGER DEFAULT 0,

  -- Score
  score_percentage DECIMAL(5,2),

  -- Cierre
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'pending_actions', 'closed'
  closed_by INTEGER REFERENCES users(id),
  closed_at TIMESTAMP,

  -- Evidencias
  evidence_files JSONB DEFAULT '[]',

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audits_schedule ON audits(schedule_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_date ON audits(audit_date);

-- ============================================================================
-- 7. AUDIT NON-CONFORMITIES TABLE (No Conformidades)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_non_conformities (
  id SERIAL PRIMARY KEY,
  audit_id INTEGER REFERENCES audits(id) ON DELETE CASCADE,
  nc_number VARCHAR(50) UNIQUE,       -- NC-AUD-2026-001

  -- Clasificación
  nc_type VARCHAR(20) NOT NULL,       -- 'major', 'minor'
  clause VARCHAR(50),

  -- Descripción
  description TEXT NOT NULL,
  objective_evidence TEXT,

  -- Asignación
  responsible_id INTEGER REFERENCES users(id),
  due_date DATE,

  -- Acciones
  immediate_action TEXT,
  root_cause_analysis TEXT,
  corrective_action TEXT,
  preventive_action TEXT,

  -- Verificación
  verification_date DATE,
  verification_result VARCHAR(20),    -- 'effective', 'not_effective', 'pending'
  verification_evidence TEXT,
  verified_by INTEGER REFERENCES users(id),

  -- Vinculación opcional a 8D
  linked_8d_id INTEGER,

  -- Estado
  status VARCHAR(20) DEFAULT 'open',  -- 'open', 'in_progress', 'pending_verification', 'closed'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_ncs_audit ON audit_non_conformities(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_ncs_status ON audit_non_conformities(status);
CREATE INDEX IF NOT EXISTS idx_audit_ncs_responsible ON audit_non_conformities(responsible_id);
CREATE INDEX IF NOT EXISTS idx_audit_ncs_type ON audit_non_conformities(nc_type);

-- ============================================================================
-- 8. AUDIT FINDINGS TABLE (Hallazgos/Resultados por ítem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_findings (
  id SERIAL PRIMARY KEY,
  audit_id INTEGER REFERENCES audits(id) ON DELETE CASCADE,
  checklist_item_id INTEGER REFERENCES audit_checklist_items(id),

  -- Resultado
  result VARCHAR(20) NOT NULL,        -- 'conformity', 'nc_major', 'nc_minor', 'observation', 'opportunity', 'na'
  clause VARCHAR(50),
  finding_description TEXT,
  objective_evidence TEXT,

  -- Si es NC, referencia a la tabla de NCs
  nc_id INTEGER REFERENCES audit_non_conformities(id),

  auditor_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_audit ON audit_findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_result ON audit_findings(result);
CREATE INDEX IF NOT EXISTS idx_audit_findings_nc ON audit_findings(nc_id);

-- ============================================================================
-- 9. UPDATE TRIGGERS
-- ============================================================================

-- Audit Programs
DROP TRIGGER IF EXISTS update_audit_programs_updated_at ON audit_programs;
CREATE TRIGGER update_audit_programs_updated_at BEFORE UPDATE ON audit_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit Checklists
DROP TRIGGER IF EXISTS update_audit_checklists_updated_at ON audit_checklists;
CREATE TRIGGER update_audit_checklists_updated_at BEFORE UPDATE ON audit_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit Schedules
DROP TRIGGER IF EXISTS update_audit_schedules_updated_at ON audit_schedules;
CREATE TRIGGER update_audit_schedules_updated_at BEFORE UPDATE ON audit_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audits
DROP TRIGGER IF EXISTS update_audits_updated_at ON audits;
CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit Non-Conformities
DROP TRIGGER IF EXISTS update_audit_ncs_updated_at ON audit_non_conformities;
CREATE TRIGGER update_audit_ncs_updated_at BEFORE UPDATE ON audit_non_conformities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. FUNCTION: Generate Audit Number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  seq_num INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(audit_number FROM 'AUD-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM audit_schedules
  WHERE audit_number LIKE 'AUD-' || current_year || '-%';

  RETURN 'AUD-' || current_year || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. FUNCTION: Generate NC Number
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_nc_number()
RETURNS TEXT AS $$
DECLARE
  current_year INTEGER;
  seq_num INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(nc_number FROM 'NC-AUD-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM audit_non_conformities
  WHERE nc_number LIKE 'NC-AUD-' || current_year || '-%';

  RETURN 'NC-AUD-' || current_year || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. SAMPLE CHECKLIST DATA (Optional - ISO 9001:2015 Section 9.2)
-- ============================================================================

-- Insert a sample checklist for ISO 9001:2015 Internal Audit
INSERT INTO audit_checklists (name, description, standard, process, version, is_active)
VALUES (
  'Auditoría Interna ISO 9001:2015',
  'Checklist estándar para auditorías internas basado en ISO 9001:2015',
  'ISO 9001:2015',
  'Sistema de Gestión de Calidad',
  '1.0',
  true
) ON CONFLICT DO NOTHING;

-- Insert sample checklist items
INSERT INTO audit_checklist_items (checklist_id, item_order, clause, question, guidance, evidence_required, category, is_critical)
SELECT
  (SELECT id FROM audit_checklists WHERE name = 'Auditoría Interna ISO 9001:2015' LIMIT 1),
  item_order,
  clause,
  question,
  guidance,
  evidence_required,
  category,
  is_critical
FROM (VALUES
  (1, '4.1', '¿La organización ha determinado las cuestiones externas e internas pertinentes?', 'Verificar análisis FODA o similar', 'Documento de contexto, matriz FODA', 'Contexto', false),
  (2, '4.2', '¿Se han identificado las partes interesadas y sus requisitos?', 'Revisar matriz de partes interesadas', 'Matriz de partes interesadas', 'Contexto', false),
  (3, '5.1', '¿La alta dirección demuestra liderazgo y compromiso con el SGC?', 'Entrevistar a la dirección', 'Actas de revisión por la dirección', 'Liderazgo', true),
  (4, '5.2', '¿Existe una política de calidad documentada y comunicada?', 'Verificar comunicación de política', 'Política de calidad, evidencia de comunicación', 'Liderazgo', true),
  (5, '5.3', '¿Se han asignado responsabilidades y autoridades?', 'Revisar organigrama y descripciones de puesto', 'Organigrama, descripciones de puesto', 'Liderazgo', false),
  (6, '6.1', '¿Se han identificado riesgos y oportunidades?', 'Revisar análisis de riesgos', 'Matriz de riesgos, planes de acción', 'Planificación', true),
  (7, '6.2', '¿Se han establecido objetivos de calidad medibles?', 'Verificar objetivos y seguimiento', 'Objetivos de calidad, indicadores', 'Planificación', true),
  (8, '7.1', '¿Se proporcionan los recursos necesarios?', 'Revisar asignación de recursos', 'Presupuestos, recursos humanos', 'Apoyo', false),
  (9, '7.2', '¿El personal es competente para sus funciones?', 'Revisar registros de competencia', 'Registros de capacitación, evaluaciones', 'Apoyo', true),
  (10, '7.5', '¿Se controla la información documentada?', 'Revisar control de documentos', 'Procedimiento de control documental', 'Apoyo', true),
  (11, '8.1', '¿Se planifican y controlan los procesos operacionales?', 'Revisar procedimientos operativos', 'Procedimientos, instrucciones de trabajo', 'Operación', true),
  (12, '8.2', '¿Se determinan los requisitos del cliente?', 'Revisar proceso de revisión de requisitos', 'Órdenes de compra, contratos', 'Operación', true),
  (13, '8.4', '¿Se controlan los procesos externalizados y proveedores?', 'Revisar evaluación de proveedores', 'Lista de proveedores aprobados, evaluaciones', 'Operación', true),
  (14, '8.5', '¿Se controla la producción y prestación del servicio?', 'Revisar controles de proceso', 'Registros de producción, hojas de verificación', 'Operación', true),
  (15, '8.6', '¿Se realiza liberación de productos/servicios?', 'Revisar criterios de liberación', 'Registros de inspección, certificados', 'Operación', true),
  (16, '8.7', '¿Se controlan las salidas no conformes?', 'Revisar tratamiento de NC', 'Registros de producto no conforme', 'Operación', true),
  (17, '9.1', '¿Se monitorean, miden y analizan los procesos?', 'Revisar indicadores de proceso', 'Dashboard, reportes de KPIs', 'Evaluación', true),
  (18, '9.2', '¿Se realizan auditorías internas planificadas?', 'Revisar programa de auditorías', 'Programa de auditorías, informes', 'Evaluación', true),
  (19, '9.3', '¿Se realiza revisión por la dirección?', 'Revisar actas de revisión', 'Actas de revisión por la dirección', 'Evaluación', true),
  (20, '10.2', '¿Se gestionan las no conformidades y acciones correctivas?', 'Revisar registro de AC', 'Registro de NC/AC, análisis de causa raíz', 'Mejora', true)
) AS t(item_order, clause, question, guidance, evidence_required, category, is_critical)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
