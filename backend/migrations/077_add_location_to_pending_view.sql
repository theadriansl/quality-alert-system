-- ============================================================================
-- Migración 077: Agregar ubicación a vista pending_repair
-- ============================================================================
-- Propósito: Incluir current_location_id y location_code para filtrar
--            defectos con/sin ubicación física asignada
-- ============================================================================

-- Recrear vista con campos de ubicación
CREATE OR REPLACE VIEW v_defects_pending_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_station_id,
  rs.name as repair_station_name,
  d.department_id,
  dep.name as department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name as client_name,
  d.defect_type_id,
  dt.name as defect_type_name,
  d.notes,
  d.photos,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) as captured_by_name,
  d.created_at,
  -- Campos de ubicación física
  d.current_location_id,
  lc.code as location_code,
  lc.description as location_description,
  lc.location_type,
  d.location_assigned_at,
  d.hospital_intake_at,
  -- Tiempo de espera
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 as hours_open,
  CASE
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 <= 24 THEN 'GREEN'
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at))/3600 <= 48 THEN 'YELLOW'
    ELSE 'RED'
  END as time_color
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('OPEN', 'REJECTED', 'QUARANTINE')
ORDER BY
  CASE d.repair_status
    WHEN 'REJECTED' THEN 1
    WHEN 'QUARANTINE' THEN 2
    WHEN 'OPEN' THEN 3
  END,
  d.captured_at ASC;

-- ============================================================================
-- FIN MIGRACIÓN 077
-- ============================================================================
