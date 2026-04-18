-- ============================================================================
-- Migration: 019_inspection_catalogs.sql
-- Date: 2026-02-04
-- Description: Catálogos configurables por cliente para inspección secuenciada
-- ============================================================================

-- ============================================================================
-- 1. SEVERIDADES (con reglas de emisión de QAR)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_severities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6b7280',
  qar_threshold_count INTEGER DEFAULT 1,
  qar_threshold_hours INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inspection_severities_client ON inspection_severities(client_id);
CREATE INDEX IF NOT EXISTS idx_inspection_severities_active ON inspection_severities(is_active);

COMMENT ON TABLE inspection_severities IS 'Niveles de severidad configurables por cliente';
COMMENT ON COLUMN inspection_severities.qar_threshold_count IS 'Cantidad de defectos para emitir QAR';
COMMENT ON COLUMN inspection_severities.qar_threshold_hours IS 'Ventana de tiempo en horas (0 = inmediato)';

-- ============================================================================
-- 2. ESTACIONES DE INSPECCIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_stations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inspection_stations_client ON inspection_stations(client_id);
CREATE INDEX IF NOT EXISTS idx_inspection_stations_active ON inspection_stations(is_active);

COMMENT ON TABLE inspection_stations IS 'Estaciones de inspección configurables por cliente';

-- ============================================================================
-- 3. ETAPAS DE AFECTACIÓN
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_stages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inspection_stages_client ON inspection_stages(client_id);
CREATE INDEX IF NOT EXISTS idx_inspection_stages_active ON inspection_stages(is_active);

COMMENT ON TABLE inspection_stages IS 'Etapas de afectación (dónde ocurrió el defecto)';

-- ============================================================================
-- 4. TURNOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_shifts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME,
  end_time TIME,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inspection_shifts_client ON inspection_shifts(client_id);
CREATE INDEX IF NOT EXISTS idx_inspection_shifts_active ON inspection_shifts(is_active);

COMMENT ON TABLE inspection_shifts IS 'Turnos de trabajo configurables por cliente';

-- ============================================================================
-- 5. DISPOSICIONES (qué se hizo con la pieza defectuosa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_dispositions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#6b7280',
  requires_downtime BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inspection_dispositions_client ON inspection_dispositions(client_id);
CREATE INDEX IF NOT EXISTS idx_inspection_dispositions_active ON inspection_dispositions(is_active);

COMMENT ON TABLE inspection_dispositions IS 'Disposiciones (scrap, retrabajo, etc.)';
COMMENT ON COLUMN inspection_dispositions.requires_downtime IS 'Si esta disposición típicamente causa tiempo de paro';

-- ============================================================================
-- 6. TRIGGERS PARA updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inspection_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inspection_severities_timestamp ON inspection_severities;
CREATE TRIGGER trigger_inspection_severities_timestamp
BEFORE UPDATE ON inspection_severities
FOR EACH ROW EXECUTE FUNCTION update_inspection_catalog_timestamp();

DROP TRIGGER IF EXISTS trigger_inspection_stations_timestamp ON inspection_stations;
CREATE TRIGGER trigger_inspection_stations_timestamp
BEFORE UPDATE ON inspection_stations
FOR EACH ROW EXECUTE FUNCTION update_inspection_catalog_timestamp();

DROP TRIGGER IF EXISTS trigger_inspection_stages_timestamp ON inspection_stages;
CREATE TRIGGER trigger_inspection_stages_timestamp
BEFORE UPDATE ON inspection_stages
FOR EACH ROW EXECUTE FUNCTION update_inspection_catalog_timestamp();

DROP TRIGGER IF EXISTS trigger_inspection_shifts_timestamp ON inspection_shifts;
CREATE TRIGGER trigger_inspection_shifts_timestamp
BEFORE UPDATE ON inspection_shifts
FOR EACH ROW EXECUTE FUNCTION update_inspection_catalog_timestamp();

DROP TRIGGER IF EXISTS trigger_inspection_dispositions_timestamp ON inspection_dispositions;
CREATE TRIGGER trigger_inspection_dispositions_timestamp
BEFORE UPDATE ON inspection_dispositions
FOR EACH ROW EXECUTE FUNCTION update_inspection_catalog_timestamp();

-- ============================================================================
-- 7. DATOS DE EJEMPLO (para cliente ID 1, si existe)
-- ============================================================================

-- Severidades de ejemplo
INSERT INTO inspection_severities (client_id, code, name, color, qar_threshold_count, qar_threshold_hours, display_order)
SELECT 1, code, name, color, threshold_count, threshold_hours, ord
FROM (VALUES
  ('MINOR', 'Menor', '#22c55e', 10, 24, 1),
  ('MAJOR', 'Mayor', '#f59e0b', 5, 8, 2),
  ('CRITICAL', 'Crítico', '#dc2626', 1, 0, 3)
) AS v(code, name, color, threshold_count, threshold_hours, ord)
WHERE EXISTS (SELECT 1 FROM clients WHERE id = 1)
ON CONFLICT (client_id, code) DO NOTHING;

-- Estaciones de ejemplo
INSERT INTO inspection_stations (client_id, code, name, display_order)
SELECT 1, code, name, ord
FROM (VALUES
  ('INCOMING', 'Inspección de Recibo', 1),
  ('INLINE_1', 'Inspección en Línea 1', 2),
  ('INLINE_2', 'Inspección en Línea 2', 3),
  ('FINAL', 'Inspección Final', 4),
  ('SHIPPING', 'Embarque', 5)
) AS v(code, name, ord)
WHERE EXISTS (SELECT 1 FROM clients WHERE id = 1)
ON CONFLICT (client_id, code) DO NOTHING;

-- Etapas de afectación de ejemplo
INSERT INTO inspection_stages (client_id, code, name, display_order)
SELECT 1, code, name, ord
FROM (VALUES
  ('RECEPTION', 'Recepción', 1),
  ('STORAGE', 'Almacén', 2),
  ('ASSEMBLY', 'Ensamble', 3),
  ('TESTING', 'Pruebas', 4),
  ('PACKAGING', 'Empaque', 5),
  ('SHIPPING', 'Embarque', 6)
) AS v(code, name, ord)
WHERE EXISTS (SELECT 1 FROM clients WHERE id = 1)
ON CONFLICT (client_id, code) DO NOTHING;

-- Turnos de ejemplo
INSERT INTO inspection_shifts (client_id, code, name, start_time, end_time, display_order)
SELECT 1, code, name, start_t::TIME, end_t::TIME, ord
FROM (VALUES
  ('SHIFT_1', 'Turno 1 (Matutino)', '06:00', '14:00', 1),
  ('SHIFT_2', 'Turno 2 (Vespertino)', '14:00', '22:00', 2),
  ('SHIFT_3', 'Turno 3 (Nocturno)', '22:00', '06:00', 3)
) AS v(code, name, start_t, end_t, ord)
WHERE EXISTS (SELECT 1 FROM clients WHERE id = 1)
ON CONFLICT (client_id, code) DO NOTHING;

-- Disposiciones de ejemplo
INSERT INTO inspection_dispositions (client_id, code, name, color, requires_downtime, display_order)
SELECT 1, code, name, color, req_downtime, ord
FROM (VALUES
  ('USE_AS_IS', 'Usar como está', '#22c55e', false, 1),
  ('REWORK', 'Retrabajo', '#f59e0b', true, 2),
  ('SCRAP', 'Scrap', '#dc2626', true, 3),
  ('RETURN_SUPPLIER', 'Devolver a Proveedor', '#8b5cf6', false, 4),
  ('HOLD', 'En Hold (Pendiente)', '#6b7280', false, 5)
) AS v(code, name, color, req_downtime, ord)
WHERE EXISTS (SELECT 1 FROM clients WHERE id = 1)
ON CONFLICT (client_id, code) DO NOTHING;
