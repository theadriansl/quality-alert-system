-- ============================================================================
-- Migration: 082_hospital_dashboard_functions.sql
-- Date: 2026-06-19
-- Description: Funciones parametrizadas para Hospital Dashboard con filtros
-- ============================================================================

-- ============================================================================
-- 1. fn_hospital_dashboard_summary - KPIs generales con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_dashboard_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_wip BIGINT,
  pending_repair BIGINT,
  in_repair BIGINT,
  repaired_pending_qa BIGINT,
  in_validation BIGINT,
  in_quarantine BIGINT,
  released_count BIGINT,
  scrapped_count BIGINT,
  captured_count BIGINT,
  scrap_cost NUMERIC,
  wip_cost NUMERIC,
  aging_green BIGINT,
  aging_yellow BIGINT,
  aging_red BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_data AS (
    SELECT *
    FROM defect_entries_v2 d
    WHERE (p_start_date IS NULL OR d.captured_at >= p_start_date)
      AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
      AND (p_client_id IS NULL OR d.client_id = p_client_id)
  ),
  current_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as total_wip,
      COUNT(*) FILTER (WHERE repair_status = 'OPEN') as pending_repair,
      COUNT(*) FILTER (WHERE repair_status = 'IN_REPAIR') as in_repair,
      COUNT(*) FILTER (WHERE repair_status = 'REPAIRED') as repaired_pending_qa,
      COUNT(*) FILTER (WHERE repair_status = 'IN_VALIDATION') as in_validation,
      COUNT(*) FILTER (WHERE repair_status = 'QUARANTINE') as in_quarantine,
      COUNT(*) FILTER (WHERE repair_status = 'RELEASED') as released_count,
      COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED') as scrapped_count,
      COUNT(*) as captured_count,
      COALESCE(SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED'), 0) as scrap_cost,
      COALESCE(SUM(unit_cost) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')), 0) as wip_cost
    FROM filtered_data
  ),
  aging_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 <= 2) as aging_green,
      COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 > 2
                         AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 <= 8) as aging_yellow,
      COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - captured_at))/3600 > 8) as aging_red
    FROM filtered_data
    WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')
  )
  SELECT
    c.total_wip,
    c.pending_repair,
    c.in_repair,
    c.repaired_pending_qa,
    c.in_validation,
    c.in_quarantine,
    c.released_count,
    c.scrapped_count,
    c.captured_count,
    c.scrap_cost,
    c.wip_cost,
    a.aging_green,
    a.aging_yellow,
    a.aging_red
  FROM current_stats c, aging_stats a;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_dashboard_summary IS 'KPIs generales del Hospital con filtros de fecha y cliente';

-- ============================================================================
-- 2. fn_hospital_by_repairer - Estadisticas por tecnico con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_by_repairer(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  user_id INTEGER,
  repairer_name TEXT,
  email VARCHAR,
  total_repairs BIGINT,
  successful_repairs BIGINT,
  rejected_repairs BIGINT,
  scrapped_count BIGINT,
  currently_in_repair BIGINT,
  avg_repair_time_min NUMERIC,
  total_scrap_cost NUMERIC,
  first_pass_yield NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.repaired_by as user_id,
    CONCAT(u.first_name, ' ', u.last_name)::TEXT as repairer_name,
    u.email,
    COUNT(*)::BIGINT as total_repairs,
    COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED')::BIGINT as successful_repairs,
    COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED')::BIGINT as rejected_repairs,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED')::BIGINT as scrapped_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'IN_REPAIR')::BIGINT as currently_in_repair,
    ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time_min,
    COALESCE(SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED'), 0) as total_scrap_cost,
    ROUND(
      COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED' AND d.repair_attempts = 1)::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE d.repair_status IN ('RELEASED', 'REJECTED')), 0) * 100, 1
    ) as first_pass_yield
  FROM defect_entries_v2 d
  JOIN users u ON d.repaired_by = u.id
  WHERE d.repaired_by IS NOT NULL
    AND (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY d.repaired_by, u.first_name, u.last_name, u.email
  ORDER BY total_repairs DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_by_repairer IS 'Estadisticas de reparacion por tecnico con filtros';

-- ============================================================================
-- 3. fn_hospital_by_releaser - Estadisticas por inspector QA con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_by_releaser(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  user_id INTEGER,
  releaser_name TEXT,
  email VARCHAR,
  total_inspections BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  currently_validating BIGINT,
  avg_release_time_min NUMERIC,
  rejection_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.released_by as user_id,
    CONCAT(u.first_name, ' ', u.last_name)::TEXT as releaser_name,
    u.email,
    COUNT(*)::BIGINT as total_inspections,
    COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED')::BIGINT as approved_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED')::BIGINT as rejected_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'IN_VALIDATION')::BIGINT as currently_validating,
    ROUND(AVG(d.release_time_minutes), 1) as avg_release_time_min,
    ROUND(
      COUNT(*) FILTER (WHERE d.repair_status = 'REJECTED')::NUMERIC /
      NULLIF(COUNT(*), 0) * 100, 1
    ) as rejection_rate
  FROM defect_entries_v2 d
  JOIN users u ON d.released_by = u.id
  WHERE d.released_by IS NOT NULL
    AND (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY d.released_by, u.first_name, u.last_name, u.email
  ORDER BY total_inspections DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_by_releaser IS 'Estadisticas de liberacion por inspector QA con filtros';

-- ============================================================================
-- 4. fn_hospital_repeat_defects - Defectos repetidos con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_repeat_defects(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  serial_number VARCHAR,
  part_number VARCHAR,
  part_name VARCHAR,
  client_name VARCHAR,
  defect_count BIGINT,
  unique_defect_types BIGINT,
  defect_types TEXT[],
  first_defect_at TIMESTAMP,
  last_defect_at TIMESTAMP,
  total_cost_impact NUMERIC,
  times_scrapped BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.serial_number,
    cp.part_number,
    cp.part_name,
    c.name as client_name,
    COUNT(*)::BIGINT as defect_count,
    COUNT(DISTINCT d.defect_type_id)::BIGINT as unique_defect_types,
    ARRAY_AGG(DISTINCT dt.code)::TEXT[] as defect_types,
    MIN(d.captured_at) as first_defect_at,
    MAX(d.captured_at) as last_defect_at,
    SUM(COALESCE(d.unit_cost, 0)) as total_cost_impact,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED')::BIGINT as times_scrapped
  FROM defect_entries_v2 d
  LEFT JOIN client_parts cp ON d.part_id = cp.id
  LEFT JOIN clients c ON d.client_id = c.id
  LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
  WHERE d.serial_number IS NOT NULL
    AND (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY d.serial_number, cp.part_number, cp.part_name, c.name
  HAVING COUNT(*) > 1
  ORDER BY defect_count DESC, last_defect_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_repeat_defects IS 'Seriales con multiples defectos con filtros';

-- ============================================================================
-- 5. fn_hospital_by_client - Desglose por cliente con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_by_client(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  client_id INTEGER,
  client_name VARCHAR,
  project_id INTEGER,
  project_name VARCHAR,
  total_defects BIGINT,
  current_wip BIGINT,
  total_closed BIGINT,
  total_scrapped BIGINT,
  total_quarantine BIGINT,
  scrap_cost NUMERIC,
  wip_cost NUMERIC,
  avg_repair_time NUMERIC,
  first_pass_yield NUMERIC,
  defects_in_period BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as client_id,
    c.name as client_name,
    p.id as project_id,
    p.project_name,
    COUNT(*)::BIGINT as total_defects,
    COUNT(*) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION'))::BIGINT as current_wip,
    COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED')::BIGINT as total_closed,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED')::BIGINT as total_scrapped,
    COUNT(*) FILTER (WHERE d.repair_status = 'QUARANTINE')::BIGINT as total_quarantine,
    COALESCE(SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED'), 0) as scrap_cost,
    COALESCE(SUM(d.unit_cost) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')), 0) as wip_cost,
    ROUND(AVG(d.repair_time_minutes) FILTER (WHERE d.repair_status = 'RELEASED'), 1) as avg_repair_time,
    ROUND(
      COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED' AND d.repair_attempts = 1)::NUMERIC /
      NULLIF(COUNT(*) FILTER (WHERE d.repair_status IN ('RELEASED', 'REJECTED')), 0) * 100, 1
    ) as first_pass_yield,
    COUNT(*)::BIGINT as defects_in_period
  FROM defect_entries_v2 d
  LEFT JOIN clients c ON d.client_id = c.id
  LEFT JOIN projects p ON d.project_id = p.id
  WHERE (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY c.id, c.name, p.id, p.project_name
  ORDER BY total_defects DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_by_client IS 'Estadisticas de defectos por cliente con filtros';

-- ============================================================================
-- 6. fn_hospital_costs - Costos con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_costs(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
  record_type TEXT,
  period_date DATE,
  period_month TIMESTAMP,
  scrap_cost NUMERIC,
  wip_cost NUMERIC,
  scrap_count BIGINT,
  closed_count BIGINT,
  total_defects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_data AS (
    SELECT *
    FROM defect_entries_v2 d
    WHERE (p_start_date IS NULL OR d.captured_at >= p_start_date)
      AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
      AND (p_client_id IS NULL OR d.client_id = p_client_id)
  ),
  daily_costs AS (
    SELECT
      DATE(COALESCE(d.repaired_at, d.captured_at)) as cost_date,
      SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
      SUM(d.unit_cost) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as wip_cost,
      COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_count,
      COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED') as closed_count
    FROM filtered_data d
    GROUP BY DATE(COALESCE(d.repaired_at, d.captured_at))
  ),
  monthly_trend AS (
    SELECT
      DATE_TRUNC('month', COALESCE(d.repaired_at, d.captured_at)) as month,
      SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_cost,
      COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED') as scrap_count,
      COUNT(*) as total_defects
    FROM filtered_data d
    GROUP BY DATE_TRUNC('month', COALESCE(d.repaired_at, d.captured_at))
  ),
  totals AS (
    SELECT
      SUM(unit_cost) FILTER (WHERE repair_status = 'SCRAPPED') as total_scrap_cost,
      SUM(unit_cost) FILTER (WHERE repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION', 'QUARANTINE')) as current_wip_cost,
      COUNT(*) FILTER (WHERE repair_status = 'SCRAPPED') as total_scrap_count
    FROM filtered_data
  )
  SELECT
    'summary'::TEXT as record_type,
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
    'daily'::TEXT as record_type,
    dc.cost_date as period_date,
    NULL::TIMESTAMP as period_month,
    dc.scrap_cost,
    dc.wip_cost,
    dc.scrap_count,
    dc.closed_count,
    NULL::BIGINT as total_defects
  FROM daily_costs dc
  UNION ALL
  SELECT
    'monthly'::TEXT as record_type,
    NULL::DATE as period_date,
    mt.month as period_month,
    mt.scrap_cost,
    NULL::NUMERIC as wip_cost,
    mt.scrap_count,
    NULL::BIGINT as closed_count,
    mt.total_defects
  FROM monthly_trend mt
  ORDER BY record_type, period_date DESC NULLS LAST, period_month DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_costs IS 'Costos de scrap y WIP con filtros de fecha y cliente';

-- ============================================================================
-- 7. fn_hospital_top_defect_types - Top defectos con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_top_defect_types(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  defect_type_id INTEGER,
  defect_type_code VARCHAR,
  defect_type_name VARCHAR,
  total_count BIGINT,
  scrapped_count BIGINT,
  closed_count BIGINT,
  scrap_cost NUMERIC,
  avg_repair_time NUMERIC,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_totals AS (
    SELECT COUNT(*) as grand_total
    FROM defect_entries_v2 d
    WHERE d.defect_type_id IS NOT NULL
      AND (p_start_date IS NULL OR d.captured_at >= p_start_date)
      AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
      AND (p_client_id IS NULL OR d.client_id = p_client_id)
  )
  SELECT
    dt.id as defect_type_id,
    dt.code as defect_type_code,
    dt.name as defect_type_name,
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED')::BIGINT as scrapped_count,
    COUNT(*) FILTER (WHERE d.repair_status = 'RELEASED')::BIGINT as closed_count,
    COALESCE(SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED'), 0) as scrap_cost,
    ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time,
    ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT grand_total FROM filtered_totals), 0) * 100, 1) as percentage
  FROM defect_entries_v2 d
  JOIN defect_types dt ON d.defect_type_id = dt.id
  WHERE (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY dt.id, dt.code, dt.name
  ORDER BY total_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_top_defect_types IS 'Top tipos de defecto con filtros';

-- ============================================================================
-- 8. fn_hospital_top_parts - Top partes con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_top_parts(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  part_id INTEGER,
  part_number VARCHAR,
  part_name VARCHAR,
  client_name VARCHAR,
  total_defects BIGINT,
  scrapped_count BIGINT,
  current_wip BIGINT,
  scrap_cost NUMERIC,
  avg_repair_time NUMERIC,
  unique_defect_types BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id as part_id,
    cp.part_number,
    cp.part_name,
    c.name as client_name,
    COUNT(*)::BIGINT as total_defects,
    COUNT(*) FILTER (WHERE d.repair_status = 'SCRAPPED')::BIGINT as scrapped_count,
    COUNT(*) FILTER (WHERE d.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION'))::BIGINT as current_wip,
    COALESCE(SUM(d.unit_cost) FILTER (WHERE d.repair_status = 'SCRAPPED'), 0) as scrap_cost,
    ROUND(AVG(d.repair_time_minutes), 1) as avg_repair_time,
    COUNT(DISTINCT d.defect_type_id)::BIGINT as unique_defect_types
  FROM defect_entries_v2 d
  JOIN client_parts cp ON d.part_id = cp.id
  LEFT JOIN clients c ON d.client_id = c.id
  WHERE (p_start_date IS NULL OR d.captured_at >= p_start_date)
    AND (p_end_date IS NULL OR d.captured_at <= p_end_date + INTERVAL '1 day')
    AND (p_client_id IS NULL OR d.client_id = p_client_id)
  GROUP BY cp.id, cp.part_number, cp.part_name, c.name
  ORDER BY total_defects DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_top_parts IS 'Top partes con filtros de fecha y cliente';

-- ============================================================================
-- 9. fn_hospital_throughput - Throughput con filtros
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_hospital_throughput(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_client_id INTEGER DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  captured BIGINT,
  repaired BIGINT,
  released BIGINT,
  scrapped BIGINT,
  avg_repair_time NUMERIC,
  avg_release_time NUMERIC
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calcular fechas efectivas
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - (p_days || ' days')::INTERVAL);

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::DATE as dt
  ),
  captured_data AS (
    SELECT DATE(captured_at) as dt, COUNT(*) as cnt
    FROM defect_entries_v2
    WHERE captured_at >= v_start_date AND captured_at <= v_end_date + INTERVAL '1 day'
      AND (p_client_id IS NULL OR client_id = p_client_id)
    GROUP BY DATE(captured_at)
  ),
  repaired_data AS (
    SELECT DATE(repaired_at) as dt, COUNT(*) as cnt, ROUND(AVG(repair_time_minutes), 1) as avg_time
    FROM defect_entries_v2
    WHERE repaired_at >= v_start_date AND repaired_at <= v_end_date + INTERVAL '1 day'
      AND repair_status IN ('REPAIRED', 'RELEASED', 'SCRAPPED', 'PENDING_RELEASE')
      AND (p_client_id IS NULL OR client_id = p_client_id)
    GROUP BY DATE(repaired_at)
  ),
  released_data AS (
    SELECT DATE(released_at) as dt, COUNT(*) as cnt, ROUND(AVG(release_time_minutes), 1) as avg_time
    FROM defect_entries_v2
    WHERE released_at >= v_start_date AND released_at <= v_end_date + INTERVAL '1 day'
      AND repair_status = 'RELEASED'
      AND (p_client_id IS NULL OR client_id = p_client_id)
    GROUP BY DATE(released_at)
  ),
  scrapped_data AS (
    SELECT DATE(repaired_at) as dt, COUNT(*) as cnt
    FROM defect_entries_v2
    WHERE repaired_at >= v_start_date AND repaired_at <= v_end_date + INTERVAL '1 day'
      AND repair_status = 'SCRAPPED'
      AND (p_client_id IS NULL OR client_id = p_client_id)
    GROUP BY DATE(repaired_at)
  )
  SELECT
    ds.dt as date,
    COALESCE(c.cnt, 0)::BIGINT as captured,
    COALESCE(rp.cnt, 0)::BIGINT as repaired,
    COALESCE(rl.cnt, 0)::BIGINT as released,
    COALESCE(s.cnt, 0)::BIGINT as scrapped,
    rp.avg_time as avg_repair_time,
    rl.avg_time as avg_release_time
  FROM date_series ds
  LEFT JOIN captured_data c ON ds.dt = c.dt
  LEFT JOIN repaired_data rp ON ds.dt = rp.dt
  LEFT JOIN released_data rl ON ds.dt = rl.dt
  LEFT JOIN scrapped_data s ON ds.dt = s.dt
  WHERE COALESCE(c.cnt, 0) > 0 OR COALESCE(rp.cnt, 0) > 0 OR COALESCE(rl.cnt, 0) > 0 OR COALESCE(s.cnt, 0) > 0
  ORDER BY ds.dt DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_hospital_throughput IS 'Throughput diario con filtros de fecha y cliente';

SELECT 'Migration 082_hospital_dashboard_functions.sql completed successfully' as status;
