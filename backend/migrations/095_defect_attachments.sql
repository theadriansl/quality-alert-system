-- ============================================================================
-- Migración 095: Tabla de archivos adjuntos para defectos
-- ============================================================================
-- Propósito: Permitir adjuntar evidencia (fotos, archivos de prueba, etc.)
--            a los defectos capturados
-- ============================================================================

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS defect_attachments (
    id SERIAL PRIMARY KEY,
    defect_id INTEGER NOT NULL REFERENCES defect_entries_v2(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,        -- nombre único en disco
    original_name VARCHAR(255) NOT NULL,   -- nombre original del archivo
    file_path VARCHAR(500) NOT NULL,       -- ruta relativa al storage
    mimetype VARCHAR(100),                 -- tipo MIME (image/jpeg, application/pdf, etc.)
    file_size INTEGER,                     -- tamaño en bytes
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_defect_attachments_defect ON defect_attachments(defect_id);
CREATE INDEX idx_defect_attachments_mimetype ON defect_attachments(mimetype);

-- Comentarios
COMMENT ON TABLE defect_attachments IS 'Archivos adjuntos de evidencia para defectos (fotos, reportes de equipos, etc.)';
COMMENT ON COLUMN defect_attachments.mimetype IS 'Tipo MIME para distinguir imágenes (miniaturas) de otros archivos';

-- ============================================================================
-- Actualizar vistas para incluir conteo de attachments
-- ============================================================================

-- Vista v_defects_pending_repair
DROP VIEW IF EXISTS v_defects_pending_repair CASCADE;
CREATE OR REPLACE VIEW v_defects_pending_repair AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.department_id,
  dep.name AS department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  d.created_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('OPEN', 'PENDING_REPAIR')
ORDER BY d.created_at;

-- Vista v_defects_in_repair
DROP VIEW IF EXISTS v_defects_in_repair CASCADE;
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
  rs.name AS repair_station_name,
  rs.code AS repair_station_code,
  d.repaired_by,
  CONCAT(u.first_name, ' ', u.last_name) AS repairing_by_name,
  d.department_id,
  dep.name AS department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.repair_started_at)) / 3600 AS hours_in_repair,
  d.created_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN inspection_stations rs ON d.repair_station_id = rs.id
LEFT JOIN users u ON d.repaired_by = u.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status = 'IN_REPAIR'
ORDER BY d.repair_started_at;

-- Vista v_defects_pending_release
DROP VIEW IF EXISTS v_defects_pending_release CASCADE;
CREATE OR REPLACE VIEW v_defects_pending_release AS
SELECT
  d.id,
  d.entry_number,
  d.lot_number,
  d.serial_number,
  d.quantity,
  d.repair_status,
  d.repair_attempts,
  d.repair_type_id,
  rt.name AS repair_type_name,
  d.repair_time_minutes,
  d.repair_notes,
  d.repaired_at,
  d.repaired_by,
  CONCAT(ur.first_name, ' ', ur.last_name) AS repaired_by_name,
  d.release_station_id,
  rls.name AS release_station_name,
  rls.code AS release_station_code,
  d.department_id,
  dep.name AS department_name,
  d.part_id,
  cp.part_number,
  cp.part_name,
  d.client_id,
  c.name AS client_name,
  d.defect_type_id,
  dt.name AS defect_type_name,
  d.notes,
  d.captured_at,
  d.captured_by_user_id,
  CONCAT(uc.first_name, ' ', uc.last_name) AS captured_by_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(d.repaired_at, d.created_at))) / 3600 AS hours_waiting_release,
  d.created_at,
  d.current_location_id,
  lc.code AS location_code,
  lc.description AS location_description,
  lc.location_type,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id) AS attachment_count,
  (SELECT COUNT(*) FROM defect_attachments da WHERE da.defect_id = d.id AND da.mimetype LIKE 'image/%') AS photo_count
FROM defect_entries_v2 d
LEFT JOIN repair_types rt ON d.repair_type_id = rt.id
LEFT JOIN inspection_stations rls ON d.release_station_id = rls.id
LEFT JOIN users ur ON d.repaired_by = ur.id
LEFT JOIN users uc ON d.captured_by_user_id = uc.id
LEFT JOIN departments dep ON d.department_id = dep.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN defect_types dt ON d.defect_type_id = dt.id
LEFT JOIN location_codes lc ON d.current_location_id = lc.id
WHERE d.repair_status IN ('REPAIRED', 'IN_VALIDATION', 'PENDING_RELEASE_APPROVAL')
ORDER BY d.repaired_at;
