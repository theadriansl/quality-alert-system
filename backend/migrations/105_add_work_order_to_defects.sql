-- ============================================================================
-- Migración 105: Agregar work_order a defectos del Hospital
-- ============================================================================
-- Propósito: Permitir búsqueda y filtrado por Orden de Trabajo en Hospital
-- ============================================================================

-- Agregar columna work_order a defect_entries_v2
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS work_order VARCHAR(100);

-- Índice para búsqueda rápida por work_order
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_work_order
ON defect_entries_v2(work_order)
WHERE work_order IS NOT NULL;

-- ============================================================================
-- Actualizar vistas del Hospital para incluir work_order
-- ============================================================================

-- Vista v_defects_pending_repair (con work_order)
DROP VIEW IF EXISTS v_defects_pending_repair CASCADE;
CREATE OR REPLACE VIEW v_defects_pending_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.work_order,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
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
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  d.created_at,
  d.updated_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('OPEN', 'PENDING_REPAIR', 'REJECTED')
ORDER BY d.updated_at DESC;

-- Vista v_defects_in_repair (con work_order)
DROP VIEW IF EXISTS v_defects_in_repair CASCADE;
CREATE OR REPLACE VIEW v_defects_in_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.work_order,
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
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repair_started_at)) / 3600 AS hours_in_repair,
  d.created_at,
  d.updated_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
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
ORDER BY d.updated_at DESC;

-- Vista v_defects_pending_release (con work_order)
DROP VIEW IF EXISTS v_defects_pending_release CASCADE;
CREATE OR REPLACE VIEW v_defects_pending_release AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.work_order,
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
  d.root_cause_id,
  rc.name AS root_cause_name,
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
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.repaired_at, d.created_at))) / 3600 AS hours_waiting_release,
  d.created_at,
  d.updated_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN root_causes rc ON d.root_cause_id = rc.id
LEFT JOIN inspection_stations rls ON d.release_station_id = rls.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('REPAIRED', 'IN_VALIDATION', 'PENDING_RELEASE_APPROVAL')
ORDER BY d.updated_at DESC;

-- ============================================================================
-- Comentarios
-- ============================================================================
COMMENT ON COLUMN defect_entries_v2.work_order IS 'Orden de trabajo asociada al defecto';
