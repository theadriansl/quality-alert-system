-- =============================================
-- HISTORIAL DE CAMBIOS EN DESVIACIONES
-- Migración: 091_deviation_history.sql
-- Fecha: 2026-06-25
-- =============================================

-- Tabla de historial de cambios
CREATE TABLE IF NOT EXISTS deviation_history (
    id SERIAL PRIMARY KEY,
    deviation_id INTEGER NOT NULL REFERENCES deviations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, STATUS_CHANGED, DEFECT_LINKED, DEFECT_UNLINKED, ATTACHMENT_ADDED, ATTACHMENT_REMOVED
    field_changed VARCHAR(100), -- Nombre del campo modificado (null si es acción general)
    old_value TEXT, -- Valor anterior
    new_value TEXT, -- Valor nuevo
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX idx_deviation_history_deviation ON deviation_history(deviation_id);
CREATE INDEX idx_deviation_history_action ON deviation_history(action);
CREATE INDEX idx_deviation_history_date ON deviation_history(performed_at);
CREATE INDEX idx_deviation_history_user ON deviation_history(performed_by);

-- Vista para consulta fácil con nombres de usuario
CREATE OR REPLACE VIEW v_deviation_history AS
SELECT
    dh.id,
    dh.deviation_id,
    d.reference_number,
    dh.action,
    dh.field_changed,
    dh.old_value,
    dh.new_value,
    dh.performed_by,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS performed_by_name,
    dh.performed_at,
    dh.notes
FROM deviation_history dh
JOIN deviations d ON dh.deviation_id = d.id
LEFT JOIN users u ON dh.performed_by = u.id
ORDER BY dh.performed_at DESC;

-- Función para registrar creación de desviación
CREATE OR REPLACE FUNCTION log_deviation_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO deviation_history (
        deviation_id,
        action,
        new_value,
        performed_by,
        notes
    ) VALUES (
        NEW.id,
        'CREATED',
        jsonb_build_object(
            'deviation_type', NEW.deviation_type,
            'description', NEW.description,
            'client_id', NEW.client_id,
            'part_id', NEW.part_id,
            'validity_date', NEW.validity_date,
            'status', NEW.status
        )::TEXT,
        NEW.created_by,
        'Desviación creada'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deviation_created ON deviations;
CREATE TRIGGER trg_deviation_created
    AFTER INSERT ON deviations
    FOR EACH ROW
    EXECUTE FUNCTION log_deviation_created();

-- Función para registrar cambios en desviación
CREATE OR REPLACE FUNCTION log_deviation_updated()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB := '{}';
BEGIN
    -- Detectar cambios en cada campo
    IF OLD.deviation_type IS DISTINCT FROM NEW.deviation_type THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'deviation_type', OLD.deviation_type, NEW.deviation_type, COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'description', LEFT(OLD.description, 500), LEFT(NEW.description, 500), COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    IF OLD.client_id IS DISTINCT FROM NEW.client_id THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'client_id', OLD.client_id::TEXT, NEW.client_id::TEXT, COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    IF OLD.part_id IS DISTINCT FROM NEW.part_id THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'part_id', OLD.part_id::TEXT, NEW.part_id::TEXT, COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    IF OLD.validity_date IS DISTINCT FROM NEW.validity_date THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'validity_date', OLD.validity_date::TEXT, NEW.validity_date::TEXT, COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by, notes)
        VALUES (NEW.id, 'STATUS_CHANGED', 'status', OLD.status, NEW.status, COALESCE(NEW.created_by, OLD.created_by),
                'Estado cambiado de ' || OLD.status || ' a ' || NEW.status);
    END IF;

    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
        INSERT INTO deviation_history (deviation_id, action, field_changed, old_value, new_value, performed_by)
        VALUES (NEW.id, 'UPDATED', 'notes', LEFT(OLD.notes, 500), LEFT(NEW.notes, 500), COALESCE(NEW.created_by, OLD.created_by));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deviation_updated ON deviations;
CREATE TRIGGER trg_deviation_updated
    AFTER UPDATE ON deviations
    FOR EACH ROW
    EXECUTE FUNCTION log_deviation_updated();

-- Función para registrar vinculación de defecto
CREATE OR REPLACE FUNCTION log_deviation_defect_link()
RETURNS TRIGGER AS $$
DECLARE
    defect_serial TEXT;
BEGIN
    SELECT COALESCE(serial_number, lot_number, 'ID:' || defect_id::TEXT) INTO defect_serial
    FROM defect_entries_v2 WHERE id = NEW.defect_id;

    INSERT INTO deviation_history (
        deviation_id,
        action,
        new_value,
        performed_by,
        notes
    ) VALUES (
        NEW.deviation_id,
        'DEFECT_LINKED',
        jsonb_build_object('defect_id', NEW.defect_id, 'serial', defect_serial)::TEXT,
        NEW.linked_by,
        'Defecto vinculado: ' || defect_serial
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deviation_defect_link_history ON defect_deviations;
CREATE TRIGGER trg_deviation_defect_link_history
    AFTER INSERT ON defect_deviations
    FOR EACH ROW
    EXECUTE FUNCTION log_deviation_defect_link();

-- Función para registrar desvinculación de defecto
CREATE OR REPLACE FUNCTION log_deviation_defect_unlink()
RETURNS TRIGGER AS $$
DECLARE
    defect_serial TEXT;
BEGIN
    SELECT COALESCE(serial_number, lot_number, 'ID:' || id::TEXT) INTO defect_serial
    FROM defect_entries_v2 WHERE id = OLD.defect_id;

    INSERT INTO deviation_history (
        deviation_id,
        action,
        old_value,
        performed_by,
        notes
    ) VALUES (
        OLD.deviation_id,
        'DEFECT_UNLINKED',
        jsonb_build_object('defect_id', OLD.defect_id, 'serial', defect_serial)::TEXT,
        OLD.linked_by,
        'Defecto desvinculado: ' || defect_serial
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deviation_defect_unlink_history ON defect_deviations;
CREATE TRIGGER trg_deviation_defect_unlink_history
    BEFORE DELETE ON defect_deviations
    FOR EACH ROW
    EXECUTE FUNCTION log_deviation_defect_unlink();

COMMENT ON TABLE deviation_history IS 'Historial de cambios y acciones en desviaciones para trazabilidad';
