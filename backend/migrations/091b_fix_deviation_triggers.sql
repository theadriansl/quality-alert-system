-- Fix: Corregir referencia a columna defect_id -> id

-- Corregir función log_deviation_defect_link
CREATE OR REPLACE FUNCTION log_deviation_defect_link()
RETURNS TRIGGER AS $$
DECLARE
    defect_serial TEXT;
BEGIN
    SELECT COALESCE(serial_number, lot_number, 'ID:' || id::TEXT) INTO defect_serial
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
        'Defecto vinculado: ' || COALESCE(defect_serial, 'N/A')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Corregir función log_deviation_defect_unlink
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
        'Defecto desvinculado: ' || COALESCE(defect_serial, 'N/A')
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
