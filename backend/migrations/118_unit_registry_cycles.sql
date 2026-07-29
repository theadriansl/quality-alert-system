-- ============================================================================
-- Migration 118: Soporte para ciclos múltiples en unit_registry
-- Permite re-ingresar seriales archivados (RMA, retrabajo, etc.)
-- ============================================================================

-- Agregar campos de ciclo
ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS cycle_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_cycle_id INTEGER REFERENCES unit_registry(id),
ADD COLUMN IF NOT EXISTS return_reason TEXT,
ADD COLUMN IF NOT EXISTS return_notes TEXT;

-- Comentarios
COMMENT ON COLUMN unit_registry.cycle_number IS 'Número de ciclo de calidad (1 = original, 2+ = re-ingresos)';
COMMENT ON COLUMN unit_registry.previous_cycle_id IS 'Referencia al ciclo anterior si es re-ingreso';
COMMENT ON COLUMN unit_registry.return_reason IS 'Motivo de re-ingreso: RMA, REWORK, AUDIT, OTHER';
COMMENT ON COLUMN unit_registry.return_notes IS 'Notas adicionales del re-ingreso';

-- Índice para búsqueda rápida de ciclos por serial
CREATE INDEX IF NOT EXISTS idx_unit_registry_serial_cycle
ON unit_registry(serial_number, cycle_number);

-- Índice para encontrar ciclos anteriores
CREATE INDEX IF NOT EXISTS idx_unit_registry_previous_cycle
ON unit_registry(previous_cycle_id) WHERE previous_cycle_id IS NOT NULL;

-- Función para obtener el último ciclo de un serial
CREATE OR REPLACE FUNCTION get_latest_cycle(p_serial_number TEXT)
RETURNS TABLE (
  unit_id INTEGER,
  cycle_number INTEGER,
  is_archived BOOLEAN,
  current_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.id,
    ur.cycle_number,
    COALESCE(ur.is_archived, false),
    ur.current_status
  FROM unit_registry ur
  WHERE ur.serial_number = p_serial_number
  ORDER BY ur.cycle_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función para crear nuevo ciclo
CREATE OR REPLACE FUNCTION create_new_cycle(
  p_serial_number TEXT,
  p_part_id INTEGER,
  p_return_reason TEXT DEFAULT 'RMA',
  p_return_notes TEXT DEFAULT NULL,
  p_created_by INTEGER DEFAULT NULL
)
RETURNS TABLE (
  new_unit_id INTEGER,
  new_cycle_number INTEGER,
  previous_cycle_id INTEGER
) AS $$
DECLARE
  v_previous_cycle RECORD;
  v_new_cycle_number INTEGER;
  v_new_unit_id INTEGER;
BEGIN
  -- Obtener ciclo anterior
  SELECT ur.id, ur.cycle_number, ur.part_id
  INTO v_previous_cycle
  FROM unit_registry ur
  WHERE ur.serial_number = p_serial_number
  ORDER BY ur.cycle_number DESC
  LIMIT 1;

  -- Calcular nuevo número de ciclo
  IF v_previous_cycle IS NULL THEN
    v_new_cycle_number := 1;
  ELSE
    v_new_cycle_number := v_previous_cycle.cycle_number + 1;
  END IF;

  -- Crear nuevo registro
  INSERT INTO unit_registry (
    serial_number,
    part_id,
    cycle_number,
    previous_cycle_id,
    return_reason,
    return_notes,
    current_status,
    is_archived,
    created_by,
    created_at
  ) VALUES (
    p_serial_number,
    COALESCE(p_part_id, v_previous_cycle.part_id),
    v_new_cycle_number,
    v_previous_cycle.id,
    p_return_reason,
    p_return_notes,
    'REGISTERED',
    false,
    p_created_by,
    NOW()
  )
  RETURNING id INTO v_new_unit_id;

  RETURN QUERY SELECT v_new_unit_id, v_new_cycle_number, v_previous_cycle.id;
END;
$$ LANGUAGE plpgsql;

-- Vista para historial completo de ciclos
CREATE OR REPLACE VIEW v_serial_cycles AS
SELECT
  ur.id,
  ur.serial_number,
  ur.cycle_number,
  ur.previous_cycle_id,
  ur.return_reason,
  ur.return_notes,
  ur.current_status,
  ur.is_archived,
  ur.created_at as cycle_started_at,
  ur.archived_at as cycle_ended_at,
  cp.part_number,
  cp.part_name,
  CASE
    WHEN ur.is_archived THEN 'CLOSED'
    ELSE 'ACTIVE'
  END as cycle_status
FROM unit_registry ur
LEFT JOIN client_parts cp ON ur.part_id = cp.id
ORDER BY ur.serial_number, ur.cycle_number;

SELECT 'Migration 118 completed: Unit registry cycles support added' as status;
