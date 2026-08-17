-- ============================================================================
-- Migration 166: Auto-Partitioning Setup para tablas de alto volumen
-- ============================================================================
-- Este script configura particionamiento automático por mes para:
-- - serial_station_scans (scanned_at)
-- - production_entries (produced_at)
-- - spec_inspection_entries (created_at)
--
-- defect_entries_v2 ya está particionada (migración 165)
-- ============================================================================

-- ============================================================================
-- FUNCIÓN GENÉRICA: Crear partición para cualquier tabla
-- ============================================================================
CREATE OR REPLACE FUNCTION create_monthly_partition(
  p_table_name TEXT,
  p_date_column TEXT,
  p_target_date DATE DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_target_month DATE;
  v_partition_name TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_sql TEXT;
BEGIN
  -- Si no se especifica fecha, usar el próximo mes
  v_target_month := COALESCE(p_target_date, date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::DATE);

  -- Nombre de la partición: tabla_YYYY_MM
  v_partition_name := p_table_name || '_' || to_char(v_target_month, 'YYYY_MM');

  -- Verificar si ya existe
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = v_partition_name AND schemaname = 'public'
  ) THEN
    RETURN 'EXISTS: ' || v_partition_name;
  END IF;

  -- Calcular rango de fechas
  v_start_date := v_target_month;
  v_end_date := v_target_month + INTERVAL '1 month';

  -- Crear la partición
  v_sql := format(
    'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    p_table_name,
    v_start_date,
    v_end_date
  );

  EXECUTE v_sql;

  RETURN 'CREATED: ' || v_partition_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Crear particiones para los próximos N meses en todas las tablas
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_future_partitions(p_months_ahead INTEGER DEFAULT 3)
RETURNS TABLE(table_name TEXT, partition_name TEXT, status TEXT) AS $$
DECLARE
  v_tables TEXT[][] := ARRAY[
    ARRAY['defect_entries_v2', 'created_at'],
    ARRAY['serial_station_scans', 'scanned_at'],
    ARRAY['production_entries', 'produced_at'],
    ARRAY['spec_inspection_entries', 'created_at']
  ];
  v_table TEXT[];
  v_month DATE;
  v_result TEXT;
  i INTEGER;
BEGIN
  -- Para cada tabla configurada
  FOREACH v_table SLICE 1 IN ARRAY v_tables
  LOOP
    -- Verificar si la tabla está particionada
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = v_table[1]
        AND n.nspname = 'public'
        AND c.relkind = 'p'
    ) THEN
      -- Crear particiones para los próximos N meses
      FOR i IN 0..p_months_ahead LOOP
        v_month := date_trunc('month', CURRENT_DATE + (i || ' months')::INTERVAL)::DATE;
        v_result := create_monthly_partition(v_table[1], v_table[2], v_month);

        table_name := v_table[1];
        partition_name := v_table[1] || '_' || to_char(v_month, 'YYYY_MM');
        status := v_result;
        RETURN NEXT;
      END LOOP;
    ELSE
      table_name := v_table[1];
      partition_name := 'N/A';
      status := 'NOT_PARTITIONED';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Reporte de estado de particiones
-- ============================================================================
CREATE OR REPLACE FUNCTION get_partition_status()
RETURNS TABLE(
  parent_table TEXT,
  partition_count BIGINT,
  oldest_partition TEXT,
  newest_partition TEXT,
  total_rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH partitioned_tables AS (
    SELECT c.relname as tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'p' AND n.nspname = 'public'
      AND c.relname IN ('defect_entries_v2', 'serial_station_scans', 'production_entries', 'spec_inspection_entries')
  )
  SELECT
    pt.tbl::TEXT as parent_table,
    (SELECT COUNT(*) FROM pg_inherits i
     JOIN pg_class c ON c.oid = i.inhrelid
     WHERE i.inhparent = (SELECT oid FROM pg_class WHERE relname = pt.tbl))::BIGINT as partition_count,
    (SELECT MIN(c.relname) FROM pg_inherits i
     JOIN pg_class c ON c.oid = i.inhrelid
     WHERE i.inhparent = (SELECT oid FROM pg_class WHERE relname = pt.tbl))::TEXT as oldest_partition,
    (SELECT MAX(c.relname) FROM pg_inherits i
     JOIN pg_class c ON c.oid = i.inhrelid
     WHERE i.inhparent = (SELECT oid FROM pg_class WHERE relname = pt.tbl))::TEXT as newest_partition,
    0::BIGINT as total_rows -- Placeholder, calcular rows es costoso
  FROM partitioned_tables pt;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comentarios
-- ============================================================================
COMMENT ON FUNCTION create_monthly_partition IS 'Crea una partición mensual para una tabla específica';
COMMENT ON FUNCTION ensure_future_partitions IS 'Asegura que existan particiones para los próximos N meses en todas las tablas de alto volumen';
COMMENT ON FUNCTION get_partition_status IS 'Retorna el estado de particionamiento de las tablas de alto volumen';

SELECT 'Migration 166: Auto-partitioning functions created successfully' as status;
