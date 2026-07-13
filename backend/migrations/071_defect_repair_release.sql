-- ============================================================================
-- Migration: 071_defect_repair_release.sql
-- Date: 2026-04-28
-- Description: Sistema de reparación y liberación de defectos integrado en DefectCapture
-- ============================================================================

-- ============================================================================
-- 1. RELEASE REASONS (Catálogo de motivos de liberación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS release_reasons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  requires_comment BOOLEAN DEFAULT false,    -- Si requiere comentario obligatorio
  allows_without_repair BOOLEAN DEFAULT false, -- Permite liberar sin reparar
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default release reasons
INSERT INTO release_reasons (code, name, description, requires_comment, allows_without_repair, display_order) VALUES
  ('REPAIRED', 'Reparado', 'Defecto fue reparado correctamente', false, false, 1),
  ('CAPTURE_ERROR', 'Error de captura', 'El defecto fue capturado por error', true, true, 2),
  ('WRONG_ASSIGNMENT', 'Mala asignación', 'Se asignó incorrectamente el tipo de defecto', true, true, 3),
  ('NOT_A_DEFECT', 'No es defecto', 'Después de revisión, no califica como defecto', true, true, 4),
  ('DEVIATION_APPROVED', 'Desviación aprobada', 'Se aprobó desviación por ingeniería/calidad', true, true, 5),
  ('CUSTOMER_ACCEPTED', 'Aceptado por cliente', 'Cliente acepta la condición', true, true, 6),
  ('OTHER', 'Otro', 'Otro motivo (especificar en comentarios)', true, true, 99)
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_release_reasons_active ON release_reasons(is_active);

-- ============================================================================
-- 2. REPAIR TYPES (Catálogo de tipos de reparación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repair_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_time_minutes INTEGER DEFAULT 5,    -- Tiempo default para este tipo
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default repair types
INSERT INTO repair_types (code, name, description, default_time_minutes, display_order) VALUES
  ('REWORK', 'Retrabajo', 'Retrabajo completo del componente', 15, 1),
  ('TOUCH_UP', 'Retoque', 'Retoque menor o ajuste', 5, 2),
  ('REPLACEMENT', 'Reemplazo', 'Reemplazo de componente', 10, 3),
  ('ADJUSTMENT', 'Ajuste', 'Ajuste de posición o configuración', 5, 4),
  ('CLEANING', 'Limpieza', 'Limpieza del área afectada', 3, 5),
  ('RECONNECTION', 'Reconexión', 'Reconexión de componente eléctrico', 5, 6),
  ('REINSTALL', 'Reinstalación', 'Reinstalación de componente', 8, 7),
  ('OTHER', 'Otro', 'Otro tipo de reparación', 10, 99)
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_repair_types_active ON repair_types(is_active);

-- ============================================================================
-- 3. DEFECT AUTHORIZED USERS (Usuarios autorizados para reparar/liberar)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_authorized_users (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Permisos
  can_repair BOOLEAN DEFAULT false,          -- Puede reparar defectos
  can_release BOOLEAN DEFAULT false,         -- Puede liberar defectos
  can_approve_repair BOOLEAN DEFAULT false,  -- Supervisor: aprobar reparaciones críticas
  can_approve_release BOOLEAN DEFAULT false, -- Supervisor: aprobar liberaciones críticas

  -- Auditoría
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_defect_auth_users_user ON defect_authorized_users(user_id);
CREATE INDEX IF NOT EXISTS idx_defect_auth_users_client ON defect_authorized_users(client_id);
CREATE INDEX IF NOT EXISTS idx_defect_auth_users_repair ON defect_authorized_users(can_repair) WHERE can_repair = true;
CREATE INDEX IF NOT EXISTS idx_defect_auth_users_release ON defect_authorized_users(can_release) WHERE can_release = true;

-- ============================================================================
-- 4. DEFECT TYPE CONFIG (Configuración por tipo de defecto)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_type_config (
  id SERIAL PRIMARY KEY,
  defect_type_id INTEGER NOT NULL REFERENCES defect_types(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Configuración de aprobación
  requires_repair_approval BOOLEAN DEFAULT false,   -- Requiere aprobación supervisor para reparación
  requires_release_approval BOOLEAN DEFAULT false,  -- Requiere aprobación supervisor para liberación

  -- Escalamiento
  max_repair_attempts INTEGER DEFAULT 3,            -- Máximo intentos antes de escalar
  auto_escalate BOOLEAN DEFAULT false,              -- Escalar automáticamente al superar intentos
  escalate_to_user_id INTEGER REFERENCES users(id), -- A quién escalar

  -- Tiempos SLA (para colores)
  sla_hours_yellow INTEGER DEFAULT 24,              -- Horas para amarillo
  sla_hours_red INTEGER DEFAULT 48,                 -- Horas para rojo

  -- Causa raíz
  requires_root_cause BOOLEAN DEFAULT false,        -- Requiere causa raíz en reparación

  -- Auditoría
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(defect_type_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_defect_type_config_type ON defect_type_config(defect_type_id);
CREATE INDEX IF NOT EXISTS idx_defect_type_config_client ON defect_type_config(client_id);

-- ============================================================================
-- 5. REPAIR RELEASE CONFIG (Configuración general por cliente)
-- ============================================================================
CREATE TABLE IF NOT EXISTS repair_release_config (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,

  -- Tiempos default (minutos)
  default_repair_time INTEGER DEFAULT 5,
  default_release_time INTEGER DEFAULT 1,

  -- Colores por tiempo (horas)
  color_green_max_hours INTEGER DEFAULT 24,         -- Verde: < 24 horas
  color_yellow_max_hours INTEGER DEFAULT 48,        -- Amarillo: 24-48 horas
  -- Rojo: > 48 horas (implícito)

  -- Auditoría
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. ROOT CAUSES (Catálogo de causas raíz)
-- ============================================================================
CREATE TABLE IF NOT EXISTS root_causes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),                       -- MATERIAL, PROCESS, TOOL, OPERATOR, DESIGN, OTHER
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default root causes
INSERT INTO root_causes (code, name, category, display_order) VALUES
  ('MATERIAL', 'Material', 'MATERIAL', 1),
  ('PROCESS', 'Proceso', 'PROCESS', 2),
  ('TOOL', 'Herramienta', 'TOOL', 3),
  ('OPERATOR', 'Operador', 'OPERATOR', 4),
  ('DESIGN', 'Diseño', 'DESIGN', 5),
  ('SUPPLIER', 'Proveedor', 'MATERIAL', 6),
  ('MAINTENANCE', 'Mantenimiento', 'TOOL', 7),
  ('TRAINING', 'Capacitación', 'OPERATOR', 8),
  ('ENVIRONMENT', 'Ambiente', 'PROCESS', 9),
  ('OTHER', 'Otro', 'OTHER', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 7. DEFECT EVENTS (Event log para auditoría completa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS defect_events (
  id SERIAL PRIMARY KEY,
  defect_id INTEGER NOT NULL REFERENCES defect_entries_v2(id) ON DELETE CASCADE,

  -- Evento
  event_type VARCHAR(50) NOT NULL,
  -- CREATED | REPAIR_STARTED | REPAIRED | VALIDATION_STARTED | RELEASED |
  -- REJECTED | APPROVAL_REQUESTED | APPROVED | ESCALATED |
  -- RESPONSIBLE_CHANGED | NOTE_ADDED

  -- Detalle
  description TEXT,
  old_status VARCHAR(30),
  new_status VARCHAR(30),

  -- Referencias opcionales
  repair_type_id INTEGER REFERENCES repair_types(id),
  release_reason_id INTEGER REFERENCES release_reasons(id),
  root_cause_id INTEGER REFERENCES root_causes(id),

  -- Tiempos registrados
  time_minutes INTEGER,

  -- Cambio de responsable
  old_department_id INTEGER REFERENCES departments(id),
  new_department_id INTEGER REFERENCES departments(id),

  -- Usuario y timestamp
  performed_by INTEGER NOT NULL REFERENCES users(id),
  event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Comentarios
  comments TEXT,

  -- Metadata adicional
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_defect_events_defect ON defect_events(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_events_type ON defect_events(event_type);
CREATE INDEX IF NOT EXISTS idx_defect_events_date ON defect_events(event_at);
CREATE INDEX IF NOT EXISTS idx_defect_events_user ON defect_events(performed_by);

-- ============================================================================
-- 8. ADD COLUMNS TO defect_entries_v2
-- ============================================================================

-- Estado de reparación/liberación
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repair_status VARCHAR(30) DEFAULT 'OPEN';
-- OPEN | IN_REPAIR | REPAIRED | IN_VALIDATION | CLOSED | REJECTED | PENDING_APPROVAL

-- Contadores
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repair_attempts INTEGER DEFAULT 0;

-- Configuración
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Tiempos (input manual)
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repair_time_minutes INTEGER;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS release_time_minutes INTEGER;

-- Reparación
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repair_type_id INTEGER REFERENCES repair_types(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repaired_by INTEGER REFERENCES users(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repaired_at TIMESTAMP;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS repair_notes TEXT;

-- Liberación
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS release_reason_id INTEGER REFERENCES release_reasons(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS released_by INTEGER REFERENCES users(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS released_at TIMESTAMP;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS release_notes TEXT;

-- Aprobación (supervisor)
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Causa raíz
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS root_cause_id INTEGER REFERENCES root_causes(id);

-- Cambio de responsable
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS original_department_id INTEGER REFERENCES departments(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS responsible_changed_by INTEGER REFERENCES users(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS responsible_changed_at TIMESTAMP;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS responsible_change_reason TEXT;

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_defect_v2_repair_status ON defect_entries_v2(repair_status);
CREATE INDEX IF NOT EXISTS idx_defect_v2_repaired_by ON defect_entries_v2(repaired_by);
CREATE INDEX IF NOT EXISTS idx_defect_v2_released_by ON defect_entries_v2(released_by);
CREATE INDEX IF NOT EXISTS idx_defect_v2_requires_approval ON defect_entries_v2(requires_approval) WHERE requires_approval = true;

-- ============================================================================
-- 9. UPDATE unit_registry STATUS OPTIONS
-- ============================================================================
COMMENT ON COLUMN unit_registry.current_status IS 'Estados: REGISTERED | INSPECTING | OK | DEFECTIVE | IN_REPAIR | REPAIRED | PENDING_REINSPECTION | RELEASED | SCRAPPED | SHIPPED';

-- ============================================================================
-- 10. VIEWS FOR DASHBOARD
-- ============================================================================

-- Vista: Defectos pendientes de reparación (hospital)
CREATE OR REPLACE VIEW v_defects_pending_repair AS
SELECT
  d.id,
  d.entry_number,
  d.serial_number,
  d.lot_number,
  d.repair_status,
  d.repair_attempts,
  d.created_at,
  d.captured_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 as hours_open,
  dt.name as defect_type_name,
  dt.code as defect_type_code,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  dep.name as department_name,
  u.full_name as captured_by_name,
  CASE
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 <= 24 THEN 'GREEN'
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 <= 48 THEN 'YELLOW'
    ELSE 'RED'
  END as time_color
FROM defect_entries_v2 d
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN users u ON d.captured_by_user_id = u.id
WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REJECTED')
ORDER BY
  CASE d.repair_status
    WHEN 'REJECTED' THEN 1
    WHEN 'IN_REPAIR' THEN 2
    ELSE 3
  END,
  d.created_at ASC;

-- Vista: Defectos pendientes de liberación
CREATE OR REPLACE VIEW v_defects_pending_release AS
SELECT
  d.id,
  d.entry_number,
  d.serial_number,
  d.lot_number,
  d.repair_status,
  d.repaired_at,
  d.repair_time_minutes,
  d.created_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repaired_at))/3600 as hours_since_repair,
  dt.name as defect_type_name,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  rt.name as repair_type_name,
  ur.full_name as repaired_by_name
FROM defect_entries_v2 d
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN users ur ON d.repaired_by = ur.id
WHERE d.repair_status IN ('REPAIRED', 'IN_VALIDATION')
ORDER BY d.repaired_at ASC;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================
COMMENT ON TABLE release_reasons IS 'Catálogo de motivos de liberación de defectos';
COMMENT ON TABLE repair_types IS 'Catálogo de tipos de reparación';
COMMENT ON TABLE defect_authorized_users IS 'Usuarios autorizados para reparar/liberar por cliente';
COMMENT ON TABLE defect_type_config IS 'Configuración por tipo de defecto: aprobaciones, SLA, escalamiento';
COMMENT ON TABLE repair_release_config IS 'Configuración general de reparación/liberación por cliente';
COMMENT ON TABLE root_causes IS 'Catálogo de causas raíz para análisis';
COMMENT ON TABLE defect_events IS 'Event log completo de acciones sobre defectos';

COMMENT ON COLUMN defect_entries_v2.repair_status IS 'Estado: OPEN | IN_REPAIR | REPAIRED | IN_VALIDATION | CLOSED | REJECTED | PENDING_APPROVAL';
COMMENT ON COLUMN defect_entries_v2.repair_attempts IS 'Contador de intentos de reparación (incrementa en cada rechazo)';
COMMENT ON COLUMN defect_entries_v2.repair_time_minutes IS 'Tiempo de reparación en minutos (input manual del reparador)';
COMMENT ON COLUMN defect_entries_v2.release_time_minutes IS 'Tiempo de liberación en minutos (input manual del inspector)';

SELECT 'Migration 071_defect_repair_release.sql completed successfully' as status;
