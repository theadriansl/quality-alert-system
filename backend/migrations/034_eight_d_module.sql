-- Migration: 034_eight_d_module.sql
-- Módulo completo de 8D con integración a Auditorías y Workload
-- ============================================

-- ============================================
-- TABLA PRINCIPAL: REPORTES 8D
-- ============================================

CREATE TABLE IF NOT EXISTS eight_d_reports (
  id SERIAL PRIMARY KEY,

  -- Identificación
  report_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,

  -- Origen del problema
  origin_type VARCHAR(50) NOT NULL, -- 'customer_complaint', 'internal_nc', 'audit_finding', 'supplier_issue'
  origin_reference VARCHAR(100), -- ID de NC, queja, hallazgo, etc.

  -- Información del problema
  customer_name VARCHAR(255),
  product_name VARCHAR(255),
  process_area VARCHAR(100),
  defect_type VARCHAR(100),
  quantity_affected INTEGER,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- D1: Equipo
  d1_completed_at TIMESTAMP,
  d1_team_leader_id INTEGER REFERENCES users(id),
  d1_notes TEXT,

  -- D2: Descripción del problema
  d2_completed_at TIMESTAMP,
  d2_problem_description TEXT,
  d2_is_is_not TEXT, -- Análisis ES/NO ES
  d2_five_w_two_h TEXT, -- 5W2H

  -- D3: Acciones de contención
  d3_completed_at TIMESTAMP,
  d3_containment_actions TEXT,
  d3_containment_verification TEXT,

  -- D4: Causa raíz
  d4_completed_at TIMESTAMP,
  d4_root_cause_method VARCHAR(50), -- '5_why', 'fishbone', 'fault_tree', 'other'
  d4_root_cause_summary TEXT,

  -- D5: Acciones correctivas permanentes
  d5_completed_at TIMESTAMP,
  d5_corrective_actions TEXT,

  -- D6: Implementación
  d6_completed_at TIMESTAMP,
  d6_implementation_notes TEXT,

  -- D7: Acciones preventivas y verificación
  d7_completed_at TIMESTAMP,
  d7_preventive_actions TEXT,
  d7_audit_required BOOLEAN DEFAULT true,
  d7_lessons_learned TEXT,

  -- D8: Cierre y reconocimiento
  d8_completed_at TIMESTAMP,
  d8_team_recognition TEXT,
  d8_closure_notes TEXT,

  -- Estado y control
  current_step VARCHAR(10) DEFAULT 'D1', -- D1, D2, D3, D4, D5, D6, D7, D8, CLOSED
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'in_progress', 'pending_verification', 'closed', 'returned_to_d5'

  -- Fechas
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  target_close_date DATE,
  closed_at TIMESTAMP,

  -- Auditoría
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_eight_d_status ON eight_d_reports(status);
CREATE INDEX idx_eight_d_current_step ON eight_d_reports(current_step);
CREATE INDEX idx_eight_d_customer ON eight_d_reports(customer_name);
CREATE INDEX idx_eight_d_origin ON eight_d_reports(origin_type, origin_reference);

-- ============================================
-- EQUIPO 8D (D1)
-- ============================================

CREATE TABLE IF NOT EXISTS eight_d_team_members (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(50) NOT NULL, -- 'leader', 'member', 'sponsor', 'subject_expert'
  department VARCHAR(100),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(eight_d_id, user_id)
);

-- ============================================
-- CAUSAS RAÍZ (D4)
-- ============================================

CREATE TABLE IF NOT EXISTS eight_d_root_causes (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,
  cause_description TEXT NOT NULL,
  cause_type VARCHAR(50), -- 'direct', 'contributing', 'systemic'
  analysis_method VARCHAR(50), -- '5_why', 'fishbone_man', 'fishbone_machine', etc.
  evidence TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTRAMEDIDAS (D5/D6)
-- ============================================

CREATE TABLE IF NOT EXISTS eight_d_countermeasures (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,
  root_cause_id INTEGER REFERENCES eight_d_root_causes(id),

  -- Definición
  countermeasure_type VARCHAR(50) NOT NULL, -- 'corrective', 'preventive'
  description TEXT NOT NULL,
  expected_result TEXT,

  -- Categoría técnica (para checklist dinámico)
  technical_category VARCHAR(50), -- 'spc', 'amef', 'control_plan', 'work_instruction', 'procedure', 'specification', 'training', 'poka_yoke', 'other'

  -- Responsable y fechas
  responsible_id INTEGER REFERENCES users(id),
  target_date DATE,

  -- Implementación (D6)
  implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP,
  implementation_evidence TEXT,

  -- Control
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONFIGURACIÓN DE AUDITORÍA D7
-- ============================================

CREATE TABLE IF NOT EXISTS d7_audit_config (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,

  -- Programación
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'once', -- 'once', 'daily', 'weekly', 'per_shift', 'custom'
  shifts TEXT[], -- ['T1', 'T2', 'T3']

  -- Cálculo de sesiones
  total_sessions_required INTEGER NOT NULL DEFAULT 1,
  sessions_completed INTEGER DEFAULT 0,

  -- Referencia a auditoría principal
  audit_schedule_id INTEGER REFERENCES audit_schedules(id),

  -- Estado
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'

  -- Control
  configured_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- ============================================
-- AUDITORES ASIGNADOS A D7
-- ============================================

CREATE TABLE IF NOT EXISTS d7_audit_auditors (
  id SERIAL PRIMARY KEY,
  d7_audit_config_id INTEGER REFERENCES d7_audit_config(id) ON DELETE CASCADE,
  auditor_id INTEGER REFERENCES users(id),
  shifts_assigned TEXT[], -- Turnos específicos asignados a este auditor
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(d7_audit_config_id, auditor_id)
);

-- ============================================
-- SESIONES DE AUDITORÍA D7
-- ============================================

CREATE TABLE IF NOT EXISTS d7_audit_sessions (
  id SERIAL PRIMARY KEY,
  d7_audit_config_id INTEGER REFERENCES d7_audit_config(id) ON DELETE CASCADE,

  -- Programación
  scheduled_date DATE NOT NULL,
  shift VARCHAR(10), -- 'T1', 'T2', 'T3'
  auditor_id INTEGER REFERENCES users(id),

  -- Ejecución
  executed_at TIMESTAMP,

  -- Resultados checklist base (7 items)
  base_checklist_responses JSONB, -- [{item_id, response, comments, evidence_files}]

  -- Resultados checklist técnico
  technical_checklist_responses JSONB, -- [{item_id, response, acceptance_criteria, evidence, files}]

  -- Hallazgos
  findings TEXT,
  observations TEXT,

  -- Estado
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda de sesiones pendientes
CREATE INDEX idx_d7_sessions_status ON d7_audit_sessions(status, scheduled_date);

-- ============================================
-- ITEMS TÉCNICOS DINÁMICOS D7
-- ============================================

CREATE TABLE IF NOT EXISTS d7_technical_items (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,

  -- Categoría predefinida
  category VARCHAR(50) NOT NULL, -- 'spc', 'amef', 'control_plan', 'work_instruction', 'procedure', 'specification', 'training', 'custom'

  -- Detalle del item
  item_description TEXT NOT NULL,
  acceptance_criteria TEXT,

  -- Origen
  source VARCHAR(20) DEFAULT 'preloaded', -- 'preloaded', 'countermeasure', 'manual'
  countermeasure_id INTEGER REFERENCES eight_d_countermeasures(id),

  -- Estado
  is_active BOOLEAN DEFAULT true, -- Usuario puede desactivar items no aplicables

  -- Control
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EVALUACIÓN FINAL D7 (JUICIO DEL LÍDER)
-- ============================================

CREATE TABLE IF NOT EXISTS d7_evaluation (
  id SERIAL PRIMARY KEY,
  eight_d_id INTEGER REFERENCES eight_d_reports(id) ON DELETE CASCADE,
  d7_audit_config_id INTEGER REFERENCES d7_audit_config(id),

  -- Resultado (solo el líder 8D puede dar este juicio)
  result VARCHAR(30) NOT NULL, -- 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'NOT_EFFECTIVE'

  -- Justificación
  justification TEXT NOT NULL,
  findings_summary TEXT,

  -- Si es parcial
  requires_adjustment BOOLEAN DEFAULT false,
  next_verification_date DATE,

  -- Si no es efectiva
  return_to_d5_reason TEXT,

  -- Evaluador
  evaluated_by INTEGER REFERENCES users(id) NOT NULL,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_result CHECK (result IN ('EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'NOT_EFFECTIVE'))
);

-- Solo una evaluación activa por 8D (pero puede haber historial si regresa de D5)
CREATE INDEX idx_d7_evaluation_eight_d ON d7_evaluation(eight_d_id, evaluated_at DESC);

-- ============================================
-- ACCIONES DE AJUSTE (SI PARCIALMENTE EFECTIVA)
-- ============================================

CREATE TABLE IF NOT EXISTS d7_adjustment_actions (
  id SERIAL PRIMARY KEY,
  d7_evaluation_id INTEGER REFERENCES d7_evaluation(id) ON DELETE CASCADE,
  eight_d_id INTEGER REFERENCES eight_d_reports(id),

  -- Acción
  description TEXT NOT NULL,
  responsible_id INTEGER REFERENCES users(id),
  target_date DATE,

  -- Seguimiento
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  completed_at TIMESTAMP,
  completion_evidence TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FUNCIÓN: Generar número de reporte 8D
-- ============================================

CREATE OR REPLACE FUNCTION generate_eight_d_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(report_number FROM 6) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM eight_d_reports
  WHERE report_number LIKE '8D-' || year_part || '-%';

  NEW.report_number := '8D-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_eight_d_number
BEFORE INSERT ON eight_d_reports
FOR EACH ROW
WHEN (NEW.report_number IS NULL)
EXECUTE FUNCTION generate_eight_d_number();

-- ============================================
-- FUNCIÓN: Auto-generar items técnicos desde contramedidas
-- ============================================

CREATE OR REPLACE FUNCTION generate_d7_technical_items_from_countermeasures()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando se completa D7, generar items técnicos desde contramedidas
  IF NEW.d7_completed_at IS NOT NULL AND OLD.d7_completed_at IS NULL THEN

    -- Insertar items técnicos pre-cargados basados en categorías de contramedidas
    INSERT INTO d7_technical_items (eight_d_id, category, item_description, acceptance_criteria, source, countermeasure_id, created_by)
    SELECT
      NEW.id,
      cm.technical_category,
      CASE cm.technical_category
        WHEN 'spc' THEN '¿El SPC muestra proceso en control después de la contramedida?'
        WHEN 'amef' THEN '¿El AMEF fue actualizado con el nuevo modo de falla y NPR reducido?'
        WHEN 'control_plan' THEN '¿El Plan de Control incluye el nuevo punto de verificación?'
        WHEN 'work_instruction' THEN '¿La instrucción de trabajo refleja el cambio implementado?'
        WHEN 'procedure' THEN '¿El procedimiento fue actualizado y distribuido?'
        WHEN 'specification' THEN '¿La especificación fue actualizada según la contramedida?'
        WHEN 'training' THEN '¿El personal fue capacitado y existe evidencia de competencia?'
        WHEN 'poka_yoke' THEN '¿El poka-yoke está instalado, funcional y no puede ser bypasseado?'
        ELSE cm.description
      END,
      'Verificar implementación efectiva según contramedida: ' || cm.description,
      'countermeasure',
      cm.id,
      NEW.d1_team_leader_id
    FROM eight_d_countermeasures cm
    WHERE cm.eight_d_id = NEW.id
      AND cm.technical_category IS NOT NULL
      AND cm.implemented = true;

    -- Insertar items base pre-cargados (los que el usuario puede eliminar)
    INSERT INTO d7_technical_items (eight_d_id, category, item_description, acceptance_criteria, source, created_by)
    VALUES
      (NEW.id, 'spc', 'Verificar estabilidad del proceso (SPC)', 'Proceso en control estadístico', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'amef', 'Verificar actualización de AMEF', 'NPR reducido según objetivo', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'control_plan', 'Verificar actualización de Plan de Control', 'Nuevo control documentado', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'work_instruction', 'Verificar actualización de Instrucciones de Trabajo', 'IT actualizada y vigente', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'procedure', 'Verificar actualización de Procedimientos', 'Procedimiento actualizado', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'specification', 'Verificar actualización de Especificaciones', 'Especificación vigente', 'preloaded', NEW.d1_team_leader_id),
      (NEW.id, 'training', 'Verificar capacitación del personal', 'Registros de capacitación completos', 'preloaded', NEW.d1_team_leader_id)
    ON CONFLICT DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_d7_technical_items
AFTER UPDATE ON eight_d_reports
FOR EACH ROW
EXECUTE FUNCTION generate_d7_technical_items_from_countermeasures();

-- ============================================
-- FUNCIÓN: Validar cierre de 8D
-- ============================================

CREATE OR REPLACE FUNCTION validate_eight_d_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_eval_result VARCHAR(30);
  v_audit_status VARCHAR(20);
BEGIN
  -- Solo validar cuando se intenta cerrar
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN

    -- Verificar que existe evaluación D7 efectiva
    SELECT result INTO v_eval_result
    FROM d7_evaluation
    WHERE eight_d_id = NEW.id
    ORDER BY evaluated_at DESC
    LIMIT 1;

    IF v_eval_result IS NULL THEN
      RAISE EXCEPTION '8D no puede cerrarse: No existe evaluación D7';
    END IF;

    IF v_eval_result != 'EFFECTIVE' THEN
      RAISE EXCEPTION '8D no puede cerrarse: Evaluación D7 no es EFECTIVA (actual: %)', v_eval_result;
    END IF;

    -- Verificar que auditoría D7 está completada
    SELECT dac.status INTO v_audit_status
    FROM d7_audit_config dac
    WHERE dac.eight_d_id = NEW.id
    ORDER BY dac.created_at DESC
    LIMIT 1;

    IF v_audit_status IS NULL OR v_audit_status != 'completed' THEN
      RAISE EXCEPTION '8D no puede cerrarse: Auditoría D7 no está completada';
    END IF;

    -- Todo OK, establecer fecha de cierre
    NEW.closed_at := CURRENT_TIMESTAMP;
    NEW.current_step := 'CLOSED';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_eight_d_closure
BEFORE UPDATE ON eight_d_reports
FOR EACH ROW
EXECUTE FUNCTION validate_eight_d_closure();

-- ============================================
-- FUNCIÓN: Procesar evaluación D7
-- ============================================

CREATE OR REPLACE FUNCTION process_d7_evaluation()
RETURNS TRIGGER AS $$
BEGIN
  -- EFECTIVA: Desbloquear D8
  IF NEW.result = 'EFFECTIVE' THEN
    UPDATE eight_d_reports
    SET current_step = 'D8',
        status = 'in_progress',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.eight_d_id;

  -- PARCIALMENTE EFECTIVA: Marcar para ajuste
  ELSIF NEW.result = 'PARTIALLY_EFFECTIVE' THEN
    UPDATE eight_d_reports
    SET status = 'pending_verification',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.eight_d_id;

    NEW.requires_adjustment := true;

  -- NO EFECTIVA: Regresar a D5
  ELSIF NEW.result = 'NOT_EFFECTIVE' THEN
    UPDATE eight_d_reports
    SET current_step = 'D5',
        status = 'returned_to_d5',
        d5_completed_at = NULL,
        d6_completed_at = NULL,
        d7_completed_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.eight_d_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_d7_evaluation
AFTER INSERT ON d7_evaluation
FOR EACH ROW
EXECUTE FUNCTION process_d7_evaluation();

-- ============================================
-- FUNCIÓN: Crear auditoría desde D7
-- ============================================

CREATE OR REPLACE FUNCTION create_audit_from_d7_config()
RETURNS TRIGGER AS $$
DECLARE
  v_eight_d RECORD;
  v_schedule_id INTEGER;
  v_checklist_id INTEGER;
BEGIN
  -- Obtener datos del 8D
  SELECT * INTO v_eight_d
  FROM eight_d_reports
  WHERE id = NEW.eight_d_id;

  -- Obtener ID del checklist base D7
  SELECT id INTO v_checklist_id
  FROM audit_checklists
  WHERE name LIKE '%Efectividad D7%' OR name LIKE '%D7%Base%'
  LIMIT 1;

  -- Crear audit_schedule
  INSERT INTO audit_schedules (
    checklist_id,
    audit_type,
    title,
    description,
    process_area,
    scheduled_date,
    lead_auditor_id,
    status,
    planned_hours,
    created_by
  ) VALUES (
    v_checklist_id,
    'D7_VERIFICATION',
    'Verificación D7 - ' || v_eight_d.report_number,
    'Auditoría de efectividad de contramedidas para ' || v_eight_d.title,
    v_eight_d.process_area,
    NEW.start_date,
    (SELECT auditor_id FROM d7_audit_auditors WHERE d7_audit_config_id = NEW.id LIMIT 1),
    'scheduled',
    NEW.total_sessions_required * 2, -- Estimado 2 horas por sesión
    NEW.configured_by
  )
  RETURNING id INTO v_schedule_id;

  -- Actualizar config con referencia a audit_schedule
  NEW.audit_schedule_id := v_schedule_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_audit_from_d7
BEFORE INSERT ON d7_audit_config
FOR EACH ROW
EXECUTE FUNCTION create_audit_from_d7_config();

-- ============================================
-- FUNCIÓN: Actualizar contador de sesiones D7
-- ============================================

CREATE OR REPLACE FUNCTION update_d7_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE d7_audit_config
    SET sessions_completed = sessions_completed + 1,
        status = CASE
          WHEN sessions_completed + 1 >= total_sessions_required THEN 'completed'
          ELSE 'in_progress'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.d7_audit_config_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_d7_session_count
AFTER UPDATE ON d7_audit_sessions
FOR EACH ROW
EXECUTE FUNCTION update_d7_session_count();

-- ============================================
-- AGREGAR CAMPO audit_type A audit_schedules SI NO EXISTE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_schedules' AND column_name = 'audit_type'
  ) THEN
    ALTER TABLE audit_schedules ADD COLUMN audit_type VARCHAR(30) DEFAULT 'standard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_schedules' AND column_name = 'eight_d_id'
  ) THEN
    ALTER TABLE audit_schedules ADD COLUMN eight_d_id INTEGER REFERENCES eight_d_reports(id);
  END IF;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'eight_d_reports',
      'eight_d_team_members',
      'eight_d_root_causes',
      'eight_d_countermeasures',
      'd7_audit_config',
      'd7_audit_auditors',
      'd7_audit_sessions',
      'd7_technical_items',
      'd7_evaluation',
      'd7_adjustment_actions'
    );

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MÓDULO 8D CREADO';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Tablas creadas: %/10', table_count;
  RAISE NOTICE '----------------------------------------------';
  RAISE NOTICE 'eight_d_reports - Reporte principal';
  RAISE NOTICE 'eight_d_team_members - Equipo D1';
  RAISE NOTICE 'eight_d_root_causes - Causas raíz D4';
  RAISE NOTICE 'eight_d_countermeasures - Contramedidas D5/D6';
  RAISE NOTICE 'd7_audit_config - Config auditoría D7';
  RAISE NOTICE 'd7_audit_auditors - Auditores asignados';
  RAISE NOTICE 'd7_audit_sessions - Sesiones de auditoría';
  RAISE NOTICE 'd7_technical_items - Items técnicos dinámicos';
  RAISE NOTICE 'd7_evaluation - Juicio del líder';
  RAISE NOTICE 'd7_adjustment_actions - Acciones de ajuste';
  RAISE NOTICE '==============================================';
END $$;
