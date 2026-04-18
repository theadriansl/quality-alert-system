-- Migration 049: Work Instructions - Plant Configuration
-- Hierarchy: Plant → Area → Line → Station

-- ============================================================================
-- 1. PLANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS wi_plants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_plants_active ON wi_plants(is_active);

COMMENT ON TABLE wi_plants IS 'Manufacturing plants for work instructions';

-- ============================================================================
-- 2. AREAS TABLE (belongs to Plant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wi_areas (
  id SERIAL PRIMARY KEY,
  plant_id INTEGER NOT NULL REFERENCES wi_plants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_areas_plant ON wi_areas(plant_id);
CREATE INDEX IF NOT EXISTS idx_wi_areas_active ON wi_areas(is_active);

COMMENT ON TABLE wi_areas IS 'Production areas within a plant';

-- ============================================================================
-- 3. LINES TABLE (belongs to Area)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wi_lines (
  id SERIAL PRIMARY KEY,
  area_id INTEGER NOT NULL REFERENCES wi_areas(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  capacity_per_hour INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_lines_area ON wi_lines(area_id);
CREATE INDEX IF NOT EXISTS idx_wi_lines_active ON wi_lines(is_active);

COMMENT ON TABLE wi_lines IS 'Production lines within an area';

-- ============================================================================
-- 4. STATIONS TABLE (belongs to Line)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wi_stations (
  id SERIAL PRIMARY KEY,
  line_id INTEGER NOT NULL REFERENCES wi_lines(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  station_type VARCHAR(50), -- assembly, inspection, packaging, etc.
  cycle_time_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wi_stations_line ON wi_stations(line_id);
CREATE INDEX IF NOT EXISTS idx_wi_stations_active ON wi_stations(is_active);
CREATE INDEX IF NOT EXISTS idx_wi_stations_type ON wi_stations(station_type);

COMMENT ON TABLE wi_stations IS 'Work stations within a production line';

-- ============================================================================
-- 5. ADD STATION TO STEPS
-- ============================================================================
ALTER TABLE work_instruction_steps
ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES wi_stations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wi_steps_station ON work_instruction_steps(station_id);

COMMENT ON COLUMN work_instruction_steps.station_id IS 'Work station where this step is performed';

-- ============================================================================
-- 6. TRIGGERS FOR updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_wi_plants_updated_at ON wi_plants;
CREATE TRIGGER update_wi_plants_updated_at
  BEFORE UPDATE ON wi_plants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wi_areas_updated_at ON wi_areas;
CREATE TRIGGER update_wi_areas_updated_at
  BEFORE UPDATE ON wi_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wi_lines_updated_at ON wi_lines;
CREATE TRIGGER update_wi_lines_updated_at
  BEFORE UPDATE ON wi_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wi_stations_updated_at ON wi_stations;
CREATE TRIGGER update_wi_stations_updated_at
  BEFORE UPDATE ON wi_stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. VIEW: Full hierarchy for easy querying
-- ============================================================================
CREATE OR REPLACE VIEW wi_station_hierarchy AS
SELECT
  s.id as station_id,
  s.name as station_name,
  s.code as station_code,
  s.station_type,
  s.cycle_time_seconds,
  s.is_active as station_active,
  l.id as line_id,
  l.name as line_name,
  l.code as line_code,
  l.capacity_per_hour,
  a.id as area_id,
  a.name as area_name,
  a.code as area_code,
  p.id as plant_id,
  p.name as plant_name,
  p.code as plant_code,
  CONCAT(p.name, ' > ', a.name, ' > ', l.name, ' > ', s.name) as full_path
FROM wi_stations s
JOIN wi_lines l ON s.line_id = l.id
JOIN wi_areas a ON l.area_id = a.id
JOIN wi_plants p ON a.plant_id = p.id
WHERE s.is_active = true
  AND l.is_active = true
  AND a.is_active = true
  AND p.is_active = true;

COMMENT ON VIEW wi_station_hierarchy IS 'Flattened view of plant hierarchy for dropdowns';
