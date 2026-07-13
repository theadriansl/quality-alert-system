-- Migration 073: Update v_defects_pending_release view
-- Adds department info, original department, and repair notes for release modal

DROP VIEW IF EXISTS v_defects_pending_release;

CREATE VIEW v_defects_pending_release AS
SELECT
  d.id,
  d.entry_number,
  d.serial_number,
  d.lot_number,
  d.repair_status,
  d.repaired_at,
  d.repair_time_minutes,
  d.repair_notes,
  d.created_at,
  d.department_id,
  d.original_department_id,
  d.responsible_changed_by,
  d.responsible_changed_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repaired_at))/3600 as hours_since_repair,
  dt.name as defect_type_name,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  c.id as client_id,
  rt.name as repair_type_name,
  CONCAT(ur.first_name, ' ', ur.last_name) as repaired_by_name,
  dep.name as department_name,
  orig_dep.name as original_department_name,
  CONCAT(changed_by.first_name, ' ', changed_by.last_name) as responsible_changed_by_name
FROM defect_entries_v2 d
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN departments orig_dep ON d.original_department_id = orig_dep.id
LEFT JOIN users changed_by ON d.responsible_changed_by = changed_by.id
WHERE d.repair_status IN ('REPAIRED', 'IN_VALIDATION', 'PENDING_RELEASE_APPROVAL')
ORDER BY d.repaired_at ASC;

SELECT 'Migration 073_update_pending_release_view.sql completed' as status;
