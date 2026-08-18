-- ============================================================================
-- Migration 170: Vista WIP por ubicación para Dashboard Hospital
-- Incluye defectos en proceso (sin ubicación asignada)
-- ============================================================================

DROP VIEW IF EXISTS v_hospital_wip_by_location;

CREATE VIEW v_hospital_wip_by_location AS
-- Ubicaciones con defectos asignados
SELECT
  lc.id as location_id,
  lc.code as location_code,
  lc.description as location_description,
  lc.location_type,
  lc.station_id,
  COALESCE(s.name, '') as station_name,
  COUNT(d.id) as wip_count,
  COUNT(d.id) FILTER (WHERE d.repair_status IN ('OPEN', 'PENDING_REPAIR')) as pending_repair,
  COUNT(d.id) FILTER (WHERE d.repair_status = 'IN_REPAIR') as in_repair,
  COUNT(d.id) FILTER (WHERE d.repair_status IN ('REPAIRED', 'PENDING_RELEASE')) as pending_qa,
  COUNT(d.id) FILTER (WHERE d.repair_status = 'IN_VALIDATION') as in_validation,
  COUNT(d.id) FILTER (WHERE d.repair_status = 'QUARANTINE') as quarantine,
  ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at)) / 3600)::numeric, 1) as avg_hours_waiting,
  MIN(d.created_at) as oldest_entry,
  MAX(d.created_at) as newest_entry,
  COUNT(d.id) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at)) / 3600 <= 2) as aging_green,
  COUNT(d.id) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at)) / 3600 > 2
    AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at)) / 3600 <= 8) as aging_yellow,
  COUNT(d.id) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.created_at)) / 3600 > 8) as aging_red
FROM location_codes lc
LEFT JOIN inspection_stations s ON lc.station_id = s.id
LEFT JOIN defect_entries_v2 d ON d.current_location_id = lc.id
  AND d.repair_status IN ('OPEN', 'PENDING_REPAIR', 'IN_REPAIR', 'REPAIRED', 'PENDING_RELEASE', 'IN_VALIDATION', 'QUARANTINE')
WHERE lc.is_active = true
GROUP BY lc.id, lc.code, lc.description, lc.location_type, lc.station_id, s.name

UNION ALL

-- Defectos en proceso (sin ubicación asignada - vienen de inspección)
SELECT
  0 as location_id,
  'EN-PROCESO' as location_code,
  'En camino a Hospital' as location_description,
  'INCOMING' as location_type,
  NULL as station_id,
  '' as station_name,
  COUNT(*) as wip_count,
  COUNT(*) FILTER (WHERE repair_status IN ('OPEN', 'PENDING_REPAIR')) as pending_repair,
  COUNT(*) FILTER (WHERE repair_status = 'IN_REPAIR') as in_repair,
  COUNT(*) FILTER (WHERE repair_status IN ('REPAIRED', 'PENDING_RELEASE')) as pending_qa,
  COUNT(*) FILTER (WHERE repair_status = 'IN_VALIDATION') as in_validation,
  COUNT(*) FILTER (WHERE repair_status = 'QUARANTINE') as quarantine,
  ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600)::numeric, 1) as avg_hours_waiting,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600 <= 2) as aging_green,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600 > 2
    AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600 <= 8) as aging_yellow,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600 > 8) as aging_red
FROM defect_entries_v2
WHERE current_location_id IS NULL
  AND repair_status IN ('OPEN', 'PENDING_REPAIR', 'IN_REPAIR', 'REPAIRED', 'PENDING_RELEASE', 'IN_VALIDATION', 'QUARANTINE')

ORDER BY wip_count DESC, location_code;

COMMENT ON VIEW v_hospital_wip_by_location IS 'WIP por ubicación con desglose de status y aging. Incluye EN-PROCESO para defectos sin ubicación.';
