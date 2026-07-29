-- ============================================================================
-- Migration: 114_serial_station_scans.sql
-- Date: 2026-07-28
-- Description: Tracking de lecturas de serial por estación
-- Propósito: Acta de nacimiento digital - trazabilidad completa de cada pieza
-- Uso futuro: Takt time, tiempo ciclo, balanceo de líneas, identificar fugas
-- ============================================================================

CREATE TABLE IF NOT EXISTS serial_station_scans (
  id SERIAL PRIMARY KEY,

  -- Identificación
  serial_number VARCHAR(100) NOT NULL,
  station_id INTEGER NOT NULL REFERENCES inspection_stations(id),

  -- Contexto de producción
  part_id INTEGER REFERENCES client_parts(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),
  work_order VARCHAR(100),

  -- Resultado del scan
  has_defect BOOLEAN DEFAULT FALSE,
  defect_count INTEGER DEFAULT 0,

  -- Quién escaneó (trazabilidad de responsabilidad)
  user_id INTEGER NOT NULL REFERENCES users(id),

  -- Timestamp
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_scans_serial ON serial_station_scans(serial_number);
CREATE INDEX IF NOT EXISTS idx_scans_station ON serial_station_scans(station_id);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON serial_station_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_part ON serial_station_scans(part_id) WHERE part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_user ON serial_station_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_shift ON serial_station_scans(shift_id) WHERE shift_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_work_order ON serial_station_scans(work_order) WHERE work_order IS NOT NULL;

-- Índice compuesto para trazabilidad de serial
CREATE INDEX IF NOT EXISTS idx_scans_serial_station_time
  ON serial_station_scans(serial_number, station_id, scanned_at DESC);

-- Índice para análisis de tiempos por estación
CREATE INDEX IF NOT EXISTS idx_scans_station_time
  ON serial_station_scans(station_id, scanned_at);

-- Comentarios
COMMENT ON TABLE serial_station_scans IS 'Registro de cada lectura de serial por estación - acta de nacimiento digital';
COMMENT ON COLUMN serial_station_scans.has_defect IS 'TRUE si al momento del scan había defectos abiertos en esta estación';
COMMENT ON COLUMN serial_station_scans.defect_count IS 'Cantidad de defectos abiertos al momento del scan';
COMMENT ON COLUMN serial_station_scans.user_id IS 'Usuario que realizó el scan - para trazabilidad de responsabilidad';

-- Vista para historial de un serial (trazabilidad completa)
CREATE OR REPLACE VIEW v_serial_traceability AS
SELECT
  sss.id,
  sss.serial_number,
  sss.scanned_at,
  ist.name as station_name,
  ist.code as station_code,
  ist.display_order,
  CASE WHEN sss.has_defect THEN 'DEFECT' ELSE 'OK' END as result,
  sss.defect_count,
  CONCAT(u.first_name, ' ', u.last_name) as scanned_by,
  sh.name as shift_name,
  sss.work_order,
  cp.part_number,
  cp.part_name,
  -- Tiempo desde scan anterior (para calcular tiempo ciclo)
  LAG(sss.scanned_at) OVER (
    PARTITION BY sss.serial_number
    ORDER BY sss.scanned_at
  ) as previous_scan_at,
  EXTRACT(EPOCH FROM (
    sss.scanned_at - LAG(sss.scanned_at) OVER (
      PARTITION BY sss.serial_number
      ORDER BY sss.scanned_at
    )
  ))::INTEGER as cycle_time_seconds
FROM serial_station_scans sss
JOIN inspection_stations ist ON sss.station_id = ist.id
JOIN users u ON sss.user_id = u.id
LEFT JOIN inspection_shifts sh ON sss.shift_id = sh.id
LEFT JOIN client_parts cp ON sss.part_id = cp.id
ORDER BY sss.serial_number, sss.scanned_at;

COMMENT ON VIEW v_serial_traceability IS 'Vista de trazabilidad completa de un serial con tiempos de ciclo';

-- Vista para análisis de tiempos por estación (para balanceo de líneas)
CREATE OR REPLACE VIEW v_station_cycle_times AS
WITH scan_with_cycle AS (
  SELECT
    sss.*,
    EXTRACT(EPOCH FROM (
      sss.scanned_at - LAG(sss.scanned_at) OVER (
        PARTITION BY sss.serial_number
        ORDER BY sss.scanned_at
      )
    )) as cycle_time_seconds
  FROM serial_station_scans sss
)
SELECT
  ist.id as station_id,
  ist.name as station_name,
  ist.code as station_code,
  ist.display_order,
  DATE(swc.scanned_at) as scan_date,
  sh.name as shift_name,
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE swc.has_defect = FALSE) as ok_count,
  COUNT(*) FILTER (WHERE swc.has_defect = TRUE) as defect_count,
  ROUND(AVG(swc.cycle_time_seconds)::NUMERIC, 2) as avg_cycle_time_seconds
FROM scan_with_cycle swc
JOIN inspection_stations ist ON swc.station_id = ist.id
LEFT JOIN inspection_shifts sh ON swc.shift_id = sh.id
GROUP BY ist.id, ist.name, ist.code, ist.display_order,
         DATE(swc.scanned_at), sh.name
ORDER BY scan_date DESC, ist.display_order;

COMMENT ON VIEW v_station_cycle_times IS 'Análisis de tiempos de ciclo por estación para balanceo de líneas';

SELECT 'Migration 114_serial_station_scans.sql completed successfully' as status;
