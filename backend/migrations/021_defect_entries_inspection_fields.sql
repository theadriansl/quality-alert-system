-- ============================================================================
-- Migration: 021_defect_entries_inspection_fields.sql
-- Date: 2026-02-04
-- Description: Add inspection fields to defect_entries_v2 for tablet capture
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW COLUMNS TO defect_entries_v2
-- ============================================================================

-- Inspection catalogs references
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS severity_id INTEGER REFERENCES inspection_severities(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES inspection_stages(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS disposition_id INTEGER REFERENCES inspection_dispositions(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES inspection_stations(id);
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES inspection_shifts(id);

-- Inspector (who captured)
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS inspector_id INTEGER REFERENCES users(id);

-- Department responsible
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS department_name VARCHAR(100);

-- Lot/Serial number
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100);

-- Downtime in minutes
ALTER TABLE defect_entries_v2 ADD COLUMN IF NOT EXISTS downtime_minutes INTEGER DEFAULT 0;

-- ============================================================================
-- 2. CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_severity ON defect_entries_v2(severity_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_station ON defect_entries_v2(station_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_shift ON defect_entries_v2(shift_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_inspector ON defect_entries_v2(inspector_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_department ON defect_entries_v2(department_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_lot ON defect_entries_v2(lot_number);

-- ============================================================================
-- 3. CREATE DEPARTMENTS TABLE (simple lookup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default departments
INSERT INTO departments (id, name, display_order) VALUES
  (1, 'Producción', 1),
  (2, 'Calidad', 2),
  (3, 'Ingeniería', 3),
  (4, 'Mantenimiento', 4),
  (5, 'Logística', 5),
  (6, 'Proveedor', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. OK PIECES TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS inspection_ok_counts (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES inspection_stations(id),
  shift_id INTEGER REFERENCES inspection_shifts(id),
  inspector_id INTEGER REFERENCES users(id),
  part_id INTEGER REFERENCES client_parts(id),
  ok_count INTEGER DEFAULT 0,
  inspection_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(station_id, shift_id, inspector_id, part_id, inspection_date)
);

CREATE INDEX IF NOT EXISTS idx_inspection_ok_counts_date ON inspection_ok_counts(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_ok_counts_station ON inspection_ok_counts(station_id);

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================
COMMENT ON COLUMN defect_entries_v2.severity_id IS 'FK to inspection_severities (Menor/Mayor/Crítico)';
COMMENT ON COLUMN defect_entries_v2.stage_id IS 'FK to inspection_stages (where defect occurred)';
COMMENT ON COLUMN defect_entries_v2.disposition_id IS 'FK to inspection_dispositions (Scrap/Rework/etc)';
COMMENT ON COLUMN defect_entries_v2.station_id IS 'FK to inspection_stations (where detected)';
COMMENT ON COLUMN defect_entries_v2.shift_id IS 'FK to inspection_shifts';
COMMENT ON COLUMN defect_entries_v2.inspector_id IS 'FK to users (who inspected)';
COMMENT ON COLUMN defect_entries_v2.department_id IS 'Responsible department ID';
COMMENT ON COLUMN defect_entries_v2.lot_number IS 'Lot or serial number of inspected piece';
COMMENT ON COLUMN defect_entries_v2.downtime_minutes IS 'Downtime caused by this defect in minutes';
COMMENT ON TABLE inspection_ok_counts IS 'Track OK pieces per station/shift/inspector for ratio calculation';
