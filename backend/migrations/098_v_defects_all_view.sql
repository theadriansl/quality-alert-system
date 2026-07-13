-- ============================================================================
-- Migración 098: Vista para TODOS los defectos (General tab)
-- ============================================================================
-- Propósito: Mostrar todos los defectos sin importar su status
-- ============================================================================

DROP VIEW IF EXISTS v_defects_all CASCADE;
CREATE OR REPLACE VIEW v_defects_all AS
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
  CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
  d.repaired_at,
  d.repair_type_id,
  rt.name AS repair_type_name,
  d.repair_time_minutes,
  d.repair_notes,
  d.root_cause_id,
  rc.name AS root_cause_name,
  d.released_at,
  d.released_by,
  CONCAT(urel.first_name, ' ', urel.last_name) AS released_by_name,
  d.release_station_id,
  rls.name AS release_station_name,
  rls.code AS release_station_code,
  d.release_reason_id,
  rr.name AS release_reason_name,
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
  -- Campos MRB/Scrap
  d.scrapped_at,
  d.scrapped_by,
  CONCAT(us.first_name, ' ', us.last_name) AS scrapped_by_name,
  d.scrap_confirmed,
  d.scrap_confirmed_at,
  -- Contadores
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN inspection_stations rls ON d.release_station_id = rls.id
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN root_causes rc ON d.root_cause_id = rc.id
LEFT JOIN release_reasons rr ON d.release_reason_id = rr.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN users urel ON d.released_by = urel.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN users us ON d.scrapped_by = us.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
ORDER BY d.updated_at DESC;

COMMENT ON VIEW v_defects_all IS 'Vista completa de TODOS los defectos sin filtro de status';
