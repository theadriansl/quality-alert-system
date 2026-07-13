-- ============================================================================
-- Migration: 076_location_codes_tracking.sql
-- Date: 2026-04-30
-- Description: Sistema de trazabilidad física para Hospital de Defectos
--              - Tabla location_codes para códigos escaneables por ubicación
--              - Campos de tracking en defect_entries_v2
-- ============================================================================

-- 1. Tabla de códigos de ubicación
CREATE TABLE IF NOT EXISTS location_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  station_id INTEGER REFERENCES inspection_stations(id) ON DELETE SET NULL,
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('REPAIR', 'RELEASE', 'BUFFER', 'MRB')),
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índices para location_codes
CREATE INDEX IF NOT EXISTS idx_location_codes_code ON location_codes(code);
CREATE INDEX IF NOT EXISTS idx_location_codes_station ON location_codes(station_id);
CREATE INDEX IF NOT EXISTS idx_location_codes_type ON location_codes(location_type);
CREATE INDEX IF NOT EXISTS idx_location_codes_active ON location_codes(is_active) WHERE is_active = true;

-- 3. Campos de trazabilidad en defect_entries_v2
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS hospital_intake_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS intake_station_id INTEGER REFERENCES inspection_stations(id),
ADD COLUMN IF NOT EXISTS current_location_id INTEGER REFERENCES location_codes(id),
ADD COLUMN IF NOT EXISTS location_assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS received_at_release_station TIMESTAMP,
ADD COLUMN IF NOT EXISTS release_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS shipped_to_logistics_at TIMESTAMP;

-- 4. Índices para tracking
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_current_location ON defect_entries_v2(current_location_id) WHERE current_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_intake_station ON defect_entries_v2(intake_station_id) WHERE intake_station_id IS NOT NULL;

-- 5. Vista de WIP por ubicación
CREATE OR REPLACE VIEW v_hospital_wip_by_location AS
SELECT
  lc.id as location_id,
  lc.code as location_code,
  lc.description as location_description,
  lc.location_type,
  s.id as station_id,
  s.name as station_name,
  COUNT(de.id) as wip_count,
  AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - de.location_assigned_at))/3600) as avg_hours_waiting,
  MIN(de.location_assigned_at) as oldest_entry,
  MAX(de.location_assigned_at) as newest_entry
FROM location_codes lc
LEFT JOIN inspection_stations s ON lc.station_id = s.id
LEFT JOIN defect_entries_v2 de ON de.current_location_id = lc.id
  AND de.repair_status IN ('OPEN', 'IN_REPAIR', 'REPAIRED', 'IN_VALIDATION')
WHERE lc.is_active = true
GROUP BY lc.id, lc.code, lc.description, lc.location_type, s.id, s.name
ORDER BY lc.location_type, lc.code;

-- 6. Vista de historial de movimientos por serial
CREATE OR REPLACE VIEW v_defect_location_history AS
SELECT
  de.id as defect_id,
  de.serial_number,
  de.repair_status,
  cp.part_number,
  cp.part_name,
  -- Timestamps de flujo
  de.captured_at,
  de.hospital_intake_at,
  de.repair_started_at,
  de.repaired_at,
  de.received_at_release_station,
  de.release_started_at,
  de.released_at,
  de.shipped_to_logistics_at,
  -- Ubicación actual
  lc.code as current_location_code,
  lc.description as current_location_description,
  de.location_assigned_at,
  -- Tiempos calculados (en minutos)
  EXTRACT(EPOCH FROM (de.hospital_intake_at - de.captured_at))/60 as minutes_to_intake,
  EXTRACT(EPOCH FROM (de.repair_started_at - de.hospital_intake_at))/60 as minutes_queue_repair,
  de.repair_time_minutes,
  EXTRACT(EPOCH FROM (de.received_at_release_station - de.repaired_at))/60 as minutes_handoff,
  EXTRACT(EPOCH FROM (de.release_started_at - de.received_at_release_station))/60 as minutes_queue_release,
  de.release_time_minutes,
  EXTRACT(EPOCH FROM (de.shipped_to_logistics_at - de.released_at))/60 as minutes_to_ship
FROM defect_entries_v2 de
LEFT JOIN client_parts cp ON de.part_id = cp.id
LEFT JOIN location_codes lc ON de.current_location_id = lc.id
WHERE de.serial_number IS NOT NULL
ORDER BY de.captured_at DESC;

-- 7. Comentarios
COMMENT ON TABLE location_codes IS 'Códigos escaneables para ubicaciones físicas en Hospital';
COMMENT ON COLUMN location_codes.code IS 'Código único escaneable (ej: HOSP-001, REL-A1)';
COMMENT ON COLUMN location_codes.location_type IS 'Tipo: REPAIR, RELEASE, BUFFER, MRB';
COMMENT ON COLUMN defect_entries_v2.hospital_intake_at IS 'Timestamp cuando logística entrega a hospital';
COMMENT ON COLUMN defect_entries_v2.current_location_id IS 'Ubicación física actual de la pieza';
COMMENT ON COLUMN defect_entries_v2.location_assigned_at IS 'Cuándo se asignó a la ubicación actual';
COMMENT ON COLUMN defect_entries_v2.received_at_release_station IS 'Timestamp cuando reparador entrega a QA';
COMMENT ON COLUMN defect_entries_v2.release_started_at IS 'Timestamp cuando QA inicia evaluación';
COMMENT ON COLUMN defect_entries_v2.shipped_to_logistics_at IS 'Timestamp cuando sale de hospital a logística';
