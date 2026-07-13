-- ============================================================================
-- Migration: 072_quarantine_scrap_states.sql
-- Date: 2026-04-28
-- Description: Agregar estados QUARANTINE y SCRAPPED al flujo de defectos
-- ============================================================================

-- Actualizar vista de defectos pendientes de reparación para incluir QUARANTINE
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
  c.id as client_id,
  dep.name as department_name,
  CONCAT(u.first_name, ' ', u.last_name) as captured_by_name,
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
WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REJECTED', 'QUARANTINE')
ORDER BY
  CASE d.repair_status
    WHEN 'QUARANTINE' THEN 1
    WHEN 'REJECTED' THEN 2
    WHEN 'IN_REPAIR' THEN 3
    ELSE 4
  END,
  d.created_at ASC;

-- Comentario actualizado para unit_registry
COMMENT ON COLUMN unit_registry.current_status IS 'Estados: REGISTERED | INSPECTING | OK | DEFECTIVE | IN_REPAIR | REPAIRED | PENDING_REINSPECTION | QUARANTINE | RELEASED | SCRAPPED | SHIPPED';

SELECT 'Migration 072_quarantine_scrap_states.sql completed successfully' as status;
