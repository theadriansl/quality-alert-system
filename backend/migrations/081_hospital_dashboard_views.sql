-- ============================================================================
-- Migration: 081_hospital_dashboard_views.sql
-- Date: 2026-05-04
-- Description: Vistas para Dashboard Hospital (6 tabs)
-- ============================================================================

-- ============================================================================
-- 1. v_hospital_dashboard_summary - KPIs generales (Tab Resumen)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_dashboard_summary AS
WITH current_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as total_wip,
    COUNT(*) FILTER (WHERE repair_status = 'OPEN') as pending_repair,
    COUNT(*) FILTER (WHERE repair_status = 'IN_REPAIR') as in_repair,
    COUNT(*) FILTER (WHERE repair_status = 'REPAIRED') as repaired_pending_qa,
    COUNT(*) FILTER (WHERE repair_status = 'IN_VALIDATION') as in_validation,
    COUNT(*) FILTER (WHERE repair_status = 'QUARANTINE') as in_quarantine,
    COUNT(*) FILTER (WHERE repair_status = 'CLOSED' AND released_at >= CURRENT_DATE) as released_today,
    COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= CURRENT_DATE) as scrapped_today,
    COUNT(*) FILTER (WHERE captured_at >= CURRENT_DATE) as captured_today,
    SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= CURRENT_DATE) as scrap_cost_today,
    SUM(unit_cost) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as wip_cost
  FROM defect_entries_v2
),
weekly_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE repair_status = 'CLOSED' AND released_at >= CURRENT_DATE - INTERVAL '7 days') as released_week,
    COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= CURRENT_DATE - INTERVAL '7 days') as scrapped_week,
    COUNT(*) FILTER (WHERE captured_at >= CURRENT_DATE - INTERVAL '7 days') as captured_week,
    SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= CURRENT_DATE - INTERVAL '7 days') as scrap_cost_week
  FROM defect_entries_v2
),
monthly_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE repair_status = 'CLOSED' AND released_at >= DATE_TRUNC('month', CURRENT_DATE)) as released_month,
    COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= DATE_TRUNC('month', CURRENT_DATE)) as scrapped_month,
    SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED' AND repaired_at >= DATE_TRUNC('month', CURRENT_DATE)) as scrap_cost_month
  FROM defect_entries_v2
),
aging_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 <= 2) as aging_green,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 > 2
                       AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 <= 8) as aging_yellow,
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 > 8) as aging_red
  FROM defect_entries_v2
  WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')
)
SELECT
  c.total_wip,
  c.pending_repair,
  c.in_repair,
  c.repaired_pending_qa,
  c.in_validation,
  c.in_quarantine,
  c.released_today,
  c.scrapped_today,
  c.captured_today,
  COALESCE(c.scrap_cost_today, 0) as scrap_cost_today,
  COALESCE(c.wip_cost, 0) as wip_cost,
  w.released_week,
  w.scrapped_week,
  w.captured_week,
  COALESCE(w.scrap_cost_week, 0) as scrap_cost_week,
  m.released_month,
  m.scrapped_month,
  COALESCE(m.scrap_cost_month, 0) as scrap_cost_month,
  a.aging_green,
  a.aging_yellow,
  a.aging_red
FROM current_stats c, weekly_stats w, monthly_stats m, aging_stats a;

COMMENT ON VIEW v_hospital_dashboard_summary IS 'KPIs generales del Hospital de Defectos';

-- ============================================================================
-- 2. v_hospital_by_repairer - Estadísticas por técnico (Tab Personal)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_by_repairer AS
SELECT
  d.repaired_by as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as repairer_name,
  u.email,
  COUNT(*) as total_repairs,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as successful_repairs,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected_repairs,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrapped_count,
  COUNT(*) FILTER (WHERE d.repair_status = 'IN_REPAIR') as currently_in_repair,
  ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time_min,
  ROUND(AVG(d.repair_time_minutes) FILTER (WHERE d.repaired_at >= CURRENT_DATE - INTERVAL '7 days'), 1) as avg_repair_time_week,
  SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED') as total_scrap_cost,
  -- FPY del técnico (cerrados sin rechazo / total intentados)
  ROUND(
    COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED' AND d.repair_attempts = 1)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE d.repair_status IN ('CLOSED', 'REJECTED')), 0) * 100, 1
  ) as first_pass_yield
FROM defect_entries_v2 d
JOIN users u ON d.repaired_by = u.id
WHERE d.repaired_by IS NOT NULL
GROUP BY d.repaired_by, u.first_name, u.last_name, u.email
ORDER BY total_repairs DESC;

COMMENT ON VIEW v_hospital_by_repairer IS 'Estadísticas de reparación por técnico';

-- ============================================================================
-- 3. v_hospital_by_releaser - Estadísticas por inspector QA (Tab Personal)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_by_releaser AS
SELECT
  d.released_by as user_id,
  CONCAT(u.first_name, ' ', u.last_name) as releaser_name,
  u.email,
  COUNT(*) as total_inspections,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as approved_count,
  COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED') as rejected_count,
  COUNT(*) FILTER (WHERE d.repair_status = 'IN_VALIDATION') as currently_validating,
  ROUND(AVG(d.release_time_minutes), 1) as avg_release_time_min,
  ROUND(AVG(d.release_time_minutes) FILTER (WHERE d.released_at >= CURRENT_DATE - INTERVAL '7 days'), 1) as avg_release_time_week,
  -- Tasa de rechazo
  ROUND(
    COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED')::NUMERIC /
    NULLIF(COUNT(*), 0) * 100, 1
  ) as rejection_rate
FROM defect_entries_v2 d
JOIN users u ON d.released_by = u.id
WHERE d.released_by IS NOT NULL
GROUP BY d.released_by, u.first_name, u.last_name, u.email
ORDER BY total_inspections DESC;

COMMENT ON VIEW v_hospital_by_releaser IS 'Estadísticas de liberación por inspector QA';

-- ============================================================================
-- 4. v_hospital_repeat_defects - Defectos repetidos por serial (Tab Calidad)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_repeat_defects AS
SELECT
  d.serial_number,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  COUNT(*) as defect_count,
  COUNT(DISTINCT d.defect_type_id) as unique_defect_types,
  ARRAY_AGG(DISTINCT dt.code) as defect_types,
  MIN(d.captured_at) as first_defect_at,
  MAX(d.captured_at) as last_defect_at,
  SUM(COALESCE(d.unit_cost, 0)) as total_cost_impact,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as times_scrapped
FROM defect_entries_v2 d
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
WHERE d.serial_number IS NOT NULL
GROUP BY d.serial_number, cp.part_number, cp.part_name, c.name
HAVING COUNT(*) > 1
ORDER BY defect_count DESC, last_defect_at DESC;

COMMENT ON VIEW v_hospital_repeat_defects IS 'Seriales con múltiples defectos registrados';

-- ============================================================================
-- 5. v_hospital_by_client - Desglose por cliente/programa (Tab Calidad)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_by_client AS
SELECT
  c.id as client_id,
  c.name as client_name,
  p.id as project_id,
  p.project_name,
  COUNT(*) as total_defects,
  COUNT(*) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')) as current_wip,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as total_closed,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as total_scrapped,
  COUNT(*) FILTER (WHERE d.repair_status = 'QUARANTINE') as total_quarantine,
  SUM(COALESCE(d.unit_cost, 0)) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
  SUM(COALESCE(d.unit_cost, 0)) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')) as wip_cost,
  ROUND(AVG(d.repair_time_minutes) FILTER (WHERE d.repair_status = 'CLOSED'), 1) as avg_repair_time,
  -- FPY por cliente
  ROUND(
    COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED' AND d.repair_attempts = 1)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE d.repair_status IN ('CLOSED', 'REJECTED')), 0) * 100, 1
  ) as first_pass_yield,
  -- Defectos últimos 7 días
  COUNT(*) FILTER (WHERE d.captured_at >= CURRENT_DATE - INTERVAL '7 days') as defects_last_week
FROM defect_entries_v2 d
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
GROUP BY c.id, c.name, p.id, p.project_name
ORDER BY total_defects DESC;

COMMENT ON VIEW v_hospital_by_client IS 'Estadísticas de defectos por cliente y proyecto';

-- ============================================================================
-- 6. v_hospital_costs - Costos (Tab Costos)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_costs AS
WITH daily_costs AS (
  SELECT
    DATE(COALESCE(d.repaired_at, d.captured_at)) as cost_date,
    SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
    SUM(d.unit_cost) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as wip_cost,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as closed_count
  FROM defect_entries_v2 d
  WHERE d.captured_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(COALESCE(d.repaired_at, d.captured_at))
),
monthly_trend AS (
  SELECT
    DATE_TRUNC('month', COALESCE(d.repaired_at, d.captured_at)) as month,
    SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_count,
    COUNT(*) as total_defects
  FROM defect_entries_v2 d
  WHERE d.captured_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', COALESCE(d.repaired_at, d.captured_at))
),
totals AS (
  SELECT
    SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED') as total_scrap_cost,
    SUM(unit_cost) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as current_wip_cost,
    COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED') as total_scrap_count
  FROM defect_entries_v2
)
SELECT
  'summary' as record_type,
  NULL::DATE as period_date,
  NULL::TIMESTAMP as period_month,
  t.total_scrap_cost as scrap_cost,
  t.current_wip_cost as wip_cost,
  t.total_scrap_count as scrap_count,
  NULL::BIGINT as closed_count,
  NULL::BIGINT as total_defects
FROM totals t
UNION ALL
SELECT
  'daily' as record_type,
  dc.cost_date as period_date,
  NULL as period_month,
  dc.scrap_cost,
  dc.wip_cost,
  dc.scrap_count,
  dc.closed_count,
  NULL as total_defects
FROM daily_costs dc
UNION ALL
SELECT
  'monthly' as record_type,
  NULL as period_date,
  mt.month as period_month,
  mt.scrap_cost,
  NULL as wip_cost,
  mt.scrap_count,
  NULL as closed_count,
  mt.total_defects
FROM monthly_trend mt
ORDER BY record_type, period_date DESC NULLS LAST, period_month DESC NULLS LAST;

COMMENT ON VIEW v_hospital_costs IS 'Costos de scrap y WIP con tendencias diarias y mensuales';

-- ============================================================================
-- 7. v_hospital_top_defect_types - Top defectos (Tab Calidad)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_top_defect_types AS
SELECT
  dt.id as defect_type_id,
  dt.code as defect_type_code,
  dt.name as defect_type_name,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrapped_count,
  COUNT(*) FILTER (WHERE d.repair_status = 'CLOSED') as closed_count,
  SUM(COALESCE(d.unit_cost, 0)) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
  ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time,
  -- Porcentaje del total
  ROUND(COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER (), 0) * 100, 1) as percentage
FROM defect_entries_v2 d
JOIN defect_types dt ON d.defect_type_id = dt.id
GROUP BY dt.id, dt.code, dt.name
ORDER BY total_count DESC;

COMMENT ON VIEW v_hospital_top_defect_types IS 'Ranking de tipos de defecto por frecuencia';

-- ============================================================================
-- 8. v_hospital_top_parts - Top partes con defectos (Tab Calidad)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_top_parts AS
SELECT
  cp.id as part_id,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  COUNT(*) as total_defects,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrapped_count,
  COUNT(*) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')) as current_wip,
  SUM(COALESCE(d.unit_cost, 0)) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
  ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time,
  COUNT(DISTINCT d.defect_type_id) as unique_defect_types
FROM defect_entries_v2 d
JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
GROUP BY cp.id, cp.part_number, cp.part_name, c.name
ORDER BY total_defects DESC;

COMMENT ON VIEW v_hospital_top_parts IS 'Ranking de partes por cantidad de defectos';

-- ============================================================================
-- 9. v_hospital_throughput - Throughput diario (Tab Operativo)
-- ============================================================================
CREATE OR REPLACE VIEW v_hospital_throughput AS
SELECT
  DATE(d.captured_at) as date,
  COUNT(*) FILTER (WHERE DATE(d.captured_at) = DATE(d.captured_at)) as captured,
  COUNT(*) FILTER (WHERE DATE(d.repaired_at) = DATE(d.captured_at)) as repaired,
  COUNT(*) FILTER (WHERE DATE(d.released_at) = DATE(d.captured_at)) as released,
  COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED' AND DATE(d.repaired_at) = DATE(d.captured_at)) as scrapped,
  ROUND(AVG(d.repair_time_minutes) FILTER (WHERE DATE(d.repaired_at) = DATE(d.captured_at)), 1) as avg_repair_time,
  ROUND(AVG(d.release_time_minutes) FILTER (WHERE DATE(d.released_at) = DATE(d.captured_at)), 1) as avg_release_time
FROM defect_entries_v2 d
WHERE d.captured_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(d.captured_at)
ORDER BY date DESC;

COMMENT ON VIEW v_hospital_throughput IS 'Throughput diario del hospital (últimos 30 días)';

SELECT 'Migration 081_hospital_dashboard_views.sql completed successfully' as status;
