-- =============================================
-- MÓDULO DE DESVIACIONES
-- Migración: 090_deviations_module.sql
-- Fecha: 2026-06-24
-- =============================================

-- Tabla principal de desviaciones
CREATE TABLE IF NOT EXISTS deviations (
    id SERIAL PRIMARY KEY,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    deviation_type VARCHAR(20) NOT NULL CHECK (deviation_type IN ('SAE', 'WAIVER', 'CLIENT', 'ENGINEERING', 'OTHER')),
    description TEXT NOT NULL,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    project_id INTEGER REFERENCES projects(id),
    part_id INTEGER REFERENCES client_parts(id),
    validity_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda
CREATE INDEX idx_deviations_client ON deviations(client_id);
CREATE INDEX idx_deviations_status ON deviations(status);
CREATE INDEX idx_deviations_reference ON deviations(reference_number);
CREATE INDEX idx_deviations_type ON deviations(deviation_type);

-- Tabla de archivos adjuntos
CREATE TABLE IF NOT EXISTS deviation_attachments (
    id SERIAL PRIMARY KEY,
    deviation_id INTEGER NOT NULL REFERENCES deviations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mimetype VARCHAR(100),
    file_size INTEGER,
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deviation_attachments_deviation ON deviation_attachments(deviation_id);

-- Tabla de relación N:N entre defectos y desviaciones
CREATE TABLE IF NOT EXISTS defect_deviations (
    id SERIAL PRIMARY KEY,
    defect_id INTEGER NOT NULL REFERENCES defect_entries_v2(id) ON DELETE CASCADE,
    deviation_id INTEGER NOT NULL REFERENCES deviations(id) ON DELETE CASCADE,
    linked_by INTEGER NOT NULL REFERENCES users(id),
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(defect_id, deviation_id)
);

CREATE INDEX idx_defect_deviations_defect ON defect_deviations(defect_id);
CREATE INDEX idx_defect_deviations_deviation ON defect_deviations(deviation_id);

-- Agregar permiso de gestión de desviaciones a hospital_user_roles
ALTER TABLE hospital_user_roles
ADD COLUMN IF NOT EXISTS can_manage_deviations BOOLEAN DEFAULT FALSE;

-- Función para generar número de referencia automático
CREATE OR REPLACE FUNCTION generate_deviation_reference()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    next_seq INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(reference_number FROM 'DEV-' || current_year::TEXT || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM deviations
    WHERE reference_number LIKE 'DEV-' || current_year::TEXT || '-%';

    NEW.reference_number := 'DEV-' || current_year::TEXT || '-' || LPAD(next_seq::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar reference_number
DROP TRIGGER IF EXISTS trg_deviation_reference ON deviations;
CREATE TRIGGER trg_deviation_reference
    BEFORE INSERT ON deviations
    FOR EACH ROW
    WHEN (NEW.reference_number IS NULL OR NEW.reference_number = '')
    EXECUTE FUNCTION generate_deviation_reference();

-- Registrar evento en historial de defecto cuando se asocia desviación
CREATE OR REPLACE FUNCTION log_defect_deviation_link()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO defect_events (
        defect_id,
        event_type,
        performed_by,
        comments,
        metadata
    ) VALUES (
        NEW.defect_id,
        'DEVIATION_LINKED',
        NEW.linked_by,
        NEW.notes,
        jsonb_build_object('deviation_id', NEW.deviation_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defect_deviation_link ON defect_deviations;
CREATE TRIGGER trg_defect_deviation_link
    AFTER INSERT ON defect_deviations
    FOR EACH ROW
    EXECUTE FUNCTION log_defect_deviation_link();

-- Vista para consulta rápida de desviaciones con info relacionada
CREATE OR REPLACE VIEW v_deviations AS
SELECT
    d.id,
    d.reference_number,
    d.deviation_type,
    d.description,
    d.client_id,
    c.name AS client_name,
    d.project_id,
    p.project_name,
    d.part_id,
    cp.part_number,
    cp.part_name,
    d.validity_date,
    d.status,
    d.notes,
    d.created_by,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS created_by_name,
    d.created_at,
    d.updated_at,
    (SELECT COUNT(*) FROM deviation_attachments da WHERE da.deviation_id = d.id) AS attachment_count,
    (SELECT COUNT(*) FROM defect_deviations dd WHERE dd.deviation_id = d.id) AS linked_defects_count
FROM deviations d
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN users u ON d.created_by = u.id;

COMMENT ON TABLE deviations IS 'Registro de desviaciones para aceptar defectos con documentación';
COMMENT ON TABLE deviation_attachments IS 'Archivos adjuntos de evidencia para desviaciones';
COMMENT ON TABLE defect_deviations IS 'Relación N:N entre defectos y desviaciones aplicables';
