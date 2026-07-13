-- ============================================================================
-- Migration: 107_mrb_buffer_use_department.sql
-- Date: 2026-07-11
-- Description: MRB Buffer usa department_id del sistema en lugar de mrb_responsible_area
-- ============================================================================

-- 1. Eliminar vistas existentes
DROP VIEW IF EXISTS v_mrb_buffer_summary CASCADE;
DROP VIEW IF EXISTS v_mrb_buffer CASCADE;

-- 2. Crear vista de Buffer MRB usando department_id
CREATE VIEW v_mrb_buffer AS
SELECT
  d.id,
  d.entry_number,
  d.serial_number,
  d.lot_number,
  d.repair_status,
  d.mrb_received_at,
  d.mrb_campaign_id,
  d.captured_at,
  d.unit_cost,
  -- Departamento responsable (del sistema)
  d.department_id,
  dep.name as department_name,
  -- Tiempo en buffer (horas)
  CASE
    WHEN d.mrb_received_at IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.mrb_received_at))/3600, 1)
    ELSE
      ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.captured_at))/3600, 1)
  END as hours_in_buffer,
  -- Aging color
  CASE
    WHEN COALESCE(d.mrb_received_at, d.captured_at) IS NULL THEN 'GRAY'
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.mrb_received_at, d.captured_at)))/3600 <= 24 THEN 'GREEN'
    WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.mrb_received_at, d.captured_at)))/3600 <= 72 THEN 'YELLOW'
    ELSE 'RED'
  END as aging_color,
  -- Parte
  cp.part_number,
  cp.part_name,
  -- Cliente
  c.id as client_id,
  c.name as client_name,
  -- Defecto
  dt.code as defect_type_code,
  dt.name as defect_type_name,
  -- Ubicación actual
  lc.code as location_code,
  lc.description as location_description,
  -- Capturado por
  CONCAT(u.first_name, ' ', u.last_name) as captured_by_name
FROM defect_entries_v2 d
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
LEFT JOIN users u ON d.captured_by_user_id = u.id
WHERE d.repair_status = 'QUARANTINE'
  AND d.mrb_campaign_id IS NULL
ORDER BY
  COALESCE(d.mrb_received_at, d.captured_at) ASC;

COMMENT ON VIEW v_mrb_buffer IS 'Defectos en QUARANTINE sin campaña MRB asignada - usa department_id del sistema';

-- 3. Crear vista resumen de buffer por departamento
CREATE VIEW v_mrb_buffer_summary AS
SELECT
  d.department_id,
  COALESCE(dep.name, 'Sin Asignar') as department_name,
  COUNT(*) as total_count,
  SUM(COALESCE(d.unit_cost, 0)) as total_cost,
  ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.mrb_received_at, d.captured_at)))/3600), 1) as avg_hours_waiting,
  MIN(COALESCE(d.mrb_received_at, d.captured_at)) as oldest_entry,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.mrb_received_at, d.captured_at)))/3600 > 72) as critical_count
FROM defect_entries_v2 d
LEFT JOIN departments dep ON d.department_id = dep.id
WHERE d.repair_status = 'QUARANTINE'
  AND d.mrb_campaign_id IS NULL
GROUP BY d.department_id, dep.name
ORDER BY total_count DESC;

COMMENT ON VIEW v_mrb_buffer_summary IS 'Resumen de buffer MRB agrupado por departamento del sistema';

SELECT 'Migration 107_mrb_buffer_use_department.sql completed successfully' as status;
