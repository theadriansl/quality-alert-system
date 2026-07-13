-- ============================================================================
-- Migración 083: Agregar campos de ubicación a todas las vistas de hospital
-- ============================================================================

-- 1. Actualizar v_defects_in_repair
DROP VIEW IF EXISTS v_defects_in_repair;
CREATE OR REPLACE VIEW v_defects_in_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_started_at,
  d.repair_station_id,
  rs.name AS repair_station_name,
  rs.code AS repair_station_code,
  d.repaired_by,
  CONCAT(u.first_name, ' ', u.last_name) AS repairing_by_name,
  d.department_id,
  dep.name AS department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes,
  d.photos,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repair_started_at)) / 3600 AS hours_in_repair,
  d.created_at,
  -- Campos de ubicación
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN users u ON d.repaired_by = u.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status = 'IN_REPAIR'
ORDER BY d.repair_started_at;

-- 2. Actualizar v_defects_pending_release
DROP VIEW IF EXISTS v_defects_pending_release;
CREATE OR REPLACE VIEW v_defects_pending_release AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_type_id,
  rt.name AS repair_type_name,
  d.repair_time_minutes,
  d.repair_notes,
  d.repaired_at,
  d.repaired_by,
  CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
  d.release_station_id,
  rls.name AS release_station_name,
  rls.code AS release_station_code,
  d.department_id,
  dep.name AS department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes,
  d.photos,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.repaired_at, d.created_at))) / 3600 AS hours_waiting_release,
  d.created_at,
  -- Campos de ubicación
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type
FROM defect_entries_v2 d
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN inspection_stations rls ON d.release_station_id = rls.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('REPAIRED', 'IN_VALIDATION')
ORDER BY d.repaired_at;

-- 3. Actualizar v_defect_serial_history (tab General)
DROP VIEW IF EXISTS v_defect_serial_history;
CREATE OR REPLACE VIEW v_defect_serial_history AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  COALESCE(d.serial_number, d.lot_number, 'SIN_SERIAL') AS serial_group,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  d.station_id AS capture_station_id,
  sc.name AS capture_station_name,
  d.repair_started_at,
  d.repair_station_id,
  sr.name AS repair_station_name,
  d.repaired_by,
  CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
  d.repaired_at,
  d.repair_time_minutes,
  d.repair_type_id,
  rt.name AS repair_type_name,
  d.repair_notes,
  d.department_id,
  dep.name AS department_name,
  d.original_department_id,
  odep.name AS original_department_name,
  d.responsible_changed_by,
  CONCAT(urc.first_name, ' ', urc.last_name) AS responsible_changed_by_name,
  d.responsible_changed_at,
  d.release_station_id,
  srel.name AS release_station_name,
  d.released_by,
  CONCAT(urel.first_name, ' ', urel.last_name) AS released_by_name,
  d.released_at,
  d.release_reason_id,
  rr.name AS release_reason_name,
  d.release_notes,
  d.root_cause_id,
  rc.name AS root_cause_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.project_id,
  p.project_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes AS defect_notes,
  d.photos,
  d.created_at,
  d.updated_at,
  -- Campos de ubicación
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type
FROM defect_entries_v2 d
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN inspection_stations sc ON d.station_id = sc.id
LEFT JOIN inspection_stations sr ON d.repair_station_id = sr.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN departments odep ON d.original_department_id = odep.id
LEFT JOIN users urc ON d.responsible_changed_by = urc.id
LEFT JOIN inspection_stations srel ON d.release_station_id = srel.id
LEFT JOIN users urel ON d.released_by = urel.id
LEFT JOIN release_reasons rr ON d.release_reason_id = rr.id
LEFT JOIN root_causes rc ON d.root_cause_id = rc.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
ORDER BY d.serial_number, d.lot_number, d.captured_at DESC;

-- ============================================================================
-- FIN MIGRACIÓN 083
-- ============================================================================
