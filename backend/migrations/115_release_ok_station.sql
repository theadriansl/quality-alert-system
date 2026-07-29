-- ============================================================================
-- Migration: 115_release_ok_station.sql
-- Date: 2026-07-29
-- Description: Estación RELEASE_OK - Cierre de ciclo de calidad
--
-- Diseño:
--   - Estación mandatoria, última en el flujo
--   - GLOBAL (no por cliente) - igual que las demás estaciones
--   - Valida: 0 defectos abiertos + specs completas
--   - Si OK: libera y archiva la parte
--   - Si NOK: bloquea, redirige a Hospital
--   - Sin override, sin excepciones, sin fuga de defectos
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNA is_system A inspection_stations
-- ============================================================================
ALTER TABLE inspection_stations
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

COMMENT ON COLUMN inspection_stations.is_system IS 'TRUE = estación del sistema, no editable/borrable por usuario';

-- Índice para filtrar estaciones del sistema
CREATE INDEX IF NOT EXISTS idx_inspection_stations_system
  ON inspection_stations(is_system) WHERE is_system = true;

-- ============================================================================
-- 2. AGREGAR COLUMNAS DE ARCHIVADO A unit_registry
-- ============================================================================
ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS released_by INTEGER REFERENCES users(id);

COMMENT ON COLUMN unit_registry.is_archived IS 'TRUE = parte cerró ciclo de calidad, solo lectura';
COMMENT ON COLUMN unit_registry.archived_at IS 'Timestamp de archivado/liberación final';
COMMENT ON COLUMN unit_registry.released_by IS 'Usuario que liberó la parte en RELEASE_OK';

-- Índice parcial para partes activas (no archivadas) - optimiza consultas
CREATE INDEX IF NOT EXISTS idx_unit_registry_active
  ON unit_registry(client_id, part_id, current_status)
  WHERE is_archived = false;

-- Índice para partes archivadas (consulta histórica)
CREATE INDEX IF NOT EXISTS idx_unit_registry_archived
  ON unit_registry(archived_at DESC)
  WHERE is_archived = true;

-- ============================================================================
-- 3. INSERTAR ESTACIÓN RELEASE_OK GLOBAL (una sola para todo el sistema)
-- ============================================================================
INSERT INTO inspection_stations (code, name, description, display_order, is_active, is_system)
SELECT
  'RELEASE_OK',
  'Release OK',
  'Estación final de liberación. Valida 0 defectos abiertos y specs completas antes de liberar.',
  9999,  -- Siempre última
  true,
  true   -- Estación del sistema
WHERE NOT EXISTS (
  SELECT 1 FROM inspection_stations WHERE code = 'RELEASE_OK'
);

-- ============================================================================
-- 4. PROTEGER ESTACIONES DEL SISTEMA DE EDICIÓN/BORRADO
-- ============================================================================
CREATE OR REPLACE FUNCTION protect_system_stations()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'No se puede eliminar una estación del sistema';
    ELSIF TG_OP = 'UPDATE' THEN
      -- Solo permitir cambiar display_order y is_active
      IF OLD.code != NEW.code OR OLD.name != NEW.name OR OLD.is_system != NEW.is_system THEN
        RAISE EXCEPTION 'No se puede modificar código, nombre o tipo de una estación del sistema';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_system_stations ON inspection_stations;
CREATE TRIGGER trg_protect_system_stations
  BEFORE UPDATE OR DELETE ON inspection_stations
  FOR EACH ROW
  EXECUTE FUNCTION protect_system_stations();

-- ============================================================================
-- 5. VISTA: PARTES LISTAS PARA RELEASE_OK
-- ============================================================================
CREATE OR REPLACE VIEW v_ready_for_release AS
SELECT
  ur.id,
  ur.serial_number,
  ur.lot_number,
  ur.client_id,
  c.name as client_name,
  ur.part_id,
  cp.part_number,
  cp.part_name,
  ur.current_status,
  ur.open_defects,
  ur.specs_ok,
  ur.specs_nok,
  ur.total_inspections,
  ur.registered_at,
  ur.last_inspection_at,
  CASE
    WHEN ur.open_defects = 0 AND ur.specs_nok = 0 THEN true
    ELSE false
  END as can_release,
  CASE
    WHEN ur.open_defects > 0 THEN 'Defectos abiertos: ' || ur.open_defects
    WHEN ur.specs_nok > 0 THEN 'Specs NOK: ' || ur.specs_nok
    ELSE 'OK'
  END as release_status
FROM unit_registry ur
JOIN clients c ON ur.client_id = c.id
JOIN client_parts cp ON ur.part_id = cp.id
WHERE ur.is_archived = false
  AND ur.current_status NOT IN ('SCRAPPED', 'SHIPPED');

COMMENT ON VIEW v_ready_for_release IS 'Vista de partes activas con estado de liberación';

-- ============================================================================
-- 6. FUNCIÓN: LIBERAR PARTE EN RELEASE_OK
-- ============================================================================
CREATE OR REPLACE FUNCTION release_unit(
  p_unit_id INTEGER,
  p_user_id INTEGER
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  unit_id INTEGER
) AS $$
DECLARE
  v_open_defects INTEGER;
  v_specs_nok INTEGER;
  v_current_status VARCHAR(30);
  v_is_archived BOOLEAN;
BEGIN
  -- Obtener estado actual
  SELECT open_defects, specs_nok, current_status, is_archived
  INTO v_open_defects, v_specs_nok, v_current_status, v_is_archived
  FROM unit_registry
  WHERE id = p_unit_id;

  -- Validaciones
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Unidad no encontrada'::TEXT, p_unit_id;
    RETURN;
  END IF;

  IF v_is_archived THEN
    RETURN QUERY SELECT false, 'Unidad ya está archivada'::TEXT, p_unit_id;
    RETURN;
  END IF;

  IF v_open_defects > 0 THEN
    RETURN QUERY SELECT false, ('No se puede liberar: ' || v_open_defects || ' defectos abiertos')::TEXT, p_unit_id;
    RETURN;
  END IF;

  IF v_specs_nok > 0 THEN
    RETURN QUERY SELECT false, ('No se puede liberar: ' || v_specs_nok || ' specs NOK')::TEXT, p_unit_id;
    RETURN;
  END IF;

  -- Ejecutar liberación
  UPDATE unit_registry
  SET
    current_status = 'RELEASED',
    is_archived = true,
    archived_at = CURRENT_TIMESTAMP,
    released_at = CURRENT_TIMESTAMP,
    released_by = p_user_id
  WHERE id = p_unit_id;

  RETURN QUERY SELECT true, 'Unidad liberada exitosamente'::TEXT, p_unit_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_unit IS 'Libera una unidad en RELEASE_OK. Valida 0 defectos y 0 specs NOK.';

SELECT 'Migration 115_release_ok_station.sql completed successfully' as status;
