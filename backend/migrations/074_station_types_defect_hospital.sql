-- ============================================================================
-- Migration: 074_station_types_defect_hospital.sql
-- Date: 2026-04-30
-- Description: Add station types for Hospital module (Repair/Release/MRB)
--              and station assignment fields to defect entries
-- ============================================================================

-- ============================================================================
-- 1. ADD STATION_TYPE TO inspection_stations
-- ============================================================================
-- Types:
--   INSPECTION - Process inspection stations (default)
--   REPAIR     - Hospital repair stations
--   RELEASE    - Hospital release/QA stations
--   MRB        - Material Review Board rework stations

ALTER TABLE inspection_stations
ADD COLUMN IF NOT EXISTS station_type VARCHAR(20) DEFAULT 'INSPECTION';

ALTER TABLE inspection_stations
ADD COLUMN IF NOT EXISTS station_type_note VARCHAR(100);

-- Add check constraint for valid types
ALTER TABLE inspection_stations
DROP CONSTRAINT IF EXISTS chk_station_type;

ALTER TABLE inspection_stations
ADD CONSTRAINT chk_station_type
CHECK (station_type IN ('INSPECTION', 'REPAIR', 'RELEASE', 'MRB'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_inspection_stations_type
ON inspection_stations(station_type);

-- Update comments
COMMENT ON COLUMN inspection_stations.station_type IS 'Station purpose: INSPECTION (process), REPAIR (Hospital), RELEASE (Hospital), MRB (Rework)';
COMMENT ON COLUMN inspection_stations.station_type_note IS 'Optional note about the station type configuration';

-- ============================================================================
-- 2. ADD REPAIR/RELEASE STATION FIELDS TO defect_entries_v2
-- ============================================================================

-- Timestamp when repair started (IN_REPAIR status)
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS repair_started_at TIMESTAMP;

-- Station where defect is being repaired
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS repair_station_id INTEGER REFERENCES inspection_stations(id) ON DELETE SET NULL;

-- Station where defect was released/approved
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS release_station_id INTEGER REFERENCES inspection_stations(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_defect_v2_repair_station ON defect_entries_v2(repair_station_id);
CREATE INDEX IF NOT EXISTS idx_defect_v2_release_station ON defect_entries_v2(release_station_id);
CREATE INDEX IF NOT EXISTS idx_defect_v2_repair_started ON defect_entries_v2(repair_started_at);

-- Comments
COMMENT ON COLUMN defect_entries_v2.repair_station_id IS 'Station where defect is being repaired (Hospital)';
COMMENT ON COLUMN defect_entries_v2.release_station_id IS 'Station where defect was released/approved';

-- ============================================================================
-- 3. VIEW: DEFECTS IN REPAIR (status = IN_REPAIR only)
-- ============================================================================
DROP VIEW IF EXISTS v_defects_in_repair;
CREATE OR REPLACE VIEW v_defects_in_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_started_at,
  d.repair_station_id,
  rs.name as repair_station_name,
  rs.code as repair_station_code,
  d.repaired_by,
  CONCAT(u.first_name, ' ', u.last_name) as repairing_by_name,
  d.department_id,
  dep.name as department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name as client_name,
  d.defect_type_id,
  dt.name as defect_type_name,
  d.notes,
  d.photos,
  d.captured_at,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repair_started_at))/3600 as hours_in_repair,
  d.created_at
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN users u ON d.repaired_by = u.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
WHERE d.repair_status = 'IN_REPAIR'
ORDER BY d.repair_started_at ASC;

COMMENT ON VIEW v_defects_in_repair IS 'Defects currently being repaired (IN_REPAIR status only)';

-- ============================================================================
-- 4. VIEW: COMPLETE SERIAL HISTORY (all defects for a serial with full history)
-- ============================================================================
DROP VIEW IF EXISTS v_defect_serial_history;
CREATE OR REPLACE VIEW v_defect_serial_history AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  COALESCE(d.serial_number, d.lot_number, 'SIN_SERIAL') as serial_group,
  d.quantity,
  d.repair_status,
  d.repair_attempts,

  -- Capture info
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) as captured_by_name,
  d.station_id as capture_station_id,
  sc.name as capture_station_name,

  -- Repair info
  d.repair_started_at,
  d.repair_station_id,
  sr.name as repair_station_name,
  d.repaired_by,
  CONCAT(ur.first_name, ' ', ur.last_name) as repaired_by_name,
  d.repaired_at,
  d.repair_time_minutes,
  d.repair_type_id,
  rt.name as repair_type_name,
  d.repair_notes,

  -- Department/responsibility
  d.department_id,
  dep.name as department_name,
  d.original_department_id,
  odep.name as original_department_name,
  d.responsible_changed_by,
  CONCAT(urc.first_name, ' ', urc.last_name) as responsible_changed_by_name,
  d.responsible_changed_at,

  -- Release info
  d.release_station_id,
  srel.name as release_station_name,
  d.released_by,
  CONCAT(urel.first_name, ' ', urel.last_name) as released_by_name,
  d.released_at,
  d.release_reason_id,
  rr.name as release_reason_name,
  d.release_notes,

  -- Root cause
  d.root_cause_id,
  rc.name as root_cause_name,

  -- Part info
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name as client_name,
  d.project_id,
  p.project_name,

  -- Defect info
  d.defect_type_id,
  dt.name as defect_type_name,
  d.notes as defect_notes,
  d.photos,

  d.created_at,
  d.updated_at
FROM defect_entries_v2 d
-- Capture
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN inspection_stations sc ON d.station_id = sc.id
-- Repair
LEFT JOIN inspection_stations sr ON d.repair_station_id = sr.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
-- Departments
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN departments odep ON d.original_department_id = odep.id
LEFT JOIN users urc ON d.responsible_changed_by = urc.id
-- Release
LEFT JOIN inspection_stations srel ON d.release_station_id = srel.id
LEFT JOIN users urel ON d.released_by = urel.id
LEFT JOIN release_reasons rr ON d.release_reason_id = rr.id
-- Root cause
LEFT JOIN root_causes rc ON d.root_cause_id = rc.id
-- Part/Client
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
-- Defect type
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
ORDER BY d.serial_number, d.lot_number, d.captured_at DESC;

COMMENT ON VIEW v_defect_serial_history IS 'Complete defect history grouped by serial/lot with all repair, release, and responsibility tracking';

-- ============================================================================
-- 5. UPDATE EXISTING VIEWS TO INCLUDE STATION INFO
-- ============================================================================

-- Update pending repair view
DROP VIEW IF EXISTS v_defects_pending_repair;
CREATE OR REPLACE VIEW v_defects_pending_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_station_id,
  rs.name as repair_station_name,
  d.department_id,
  dep.name as department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name as client_name,
  d.defect_type_id,
  dt.name as defect_type_name,
  d.notes,
  d.photos,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) as captured_by_name,
  d.created_at
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
WHERE d.repair_status IN ('OPEN', 'REJECTED', 'QUARANTINE')
ORDER BY
  CASE d.repair_status
    WHEN 'REJECTED' THEN 1
    WHEN 'QUARANTINE' THEN 2
    WHEN 'OPEN' THEN 3
  END,
  d.captured_at ASC;

COMMENT ON VIEW v_defects_pending_repair IS 'Defects pending repair (OPEN, REJECTED, QUARANTINE)';

-- ============================================================================
-- 6. SEED DEFAULT STATION TYPE DESCRIPTIONS
-- ============================================================================
-- Note: This just updates the note field for documentation purposes
-- Existing stations remain as INSPECTION (default)

UPDATE inspection_stations
SET station_type_note = 'Process inspection station'
WHERE station_type = 'INSPECTION' AND station_type_note IS NULL;

-- ============================================================================
SELECT 'Migration 074_station_types_defect_hospital.sql completed successfully' as status;
