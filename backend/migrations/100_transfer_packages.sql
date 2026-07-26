-- ============================================================================
-- Migration 100: Transfer Packages System (Hospital <-> MRB bidirectional)
-- ============================================================================

-- Tabla principal de paquetes de transferencia
CREATE TABLE IF NOT EXISTS transfer_packages (
    id SERIAL PRIMARY KEY,
    package_number VARCHAR(30) UNIQUE NOT NULL,

    -- Origen y destino
    origin_type VARCHAR(20) NOT NULL CHECK (origin_type IN ('HOSPITAL', 'MRB')),
    destination_type VARCHAR(20) NOT NULL CHECK (destination_type IN ('HOSPITAL', 'MRB')),
    origin_location_id INTEGER REFERENCES location_codes(id),
    destination_location_id INTEGER REFERENCES location_codes(id),

    -- Referencias opcionales
    mrb_campaign_id INTEGER REFERENCES mrb_campaigns(id),
    qar_id INTEGER REFERENCES quality_alerts(id),

    -- Status del paquete
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),

    -- Tracking de creación
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    -- Tracking de envío
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by INTEGER REFERENCES users(id),

    -- Tracking de recepción
    received_at TIMESTAMP WITH TIME ZONE,
    received_by INTEGER REFERENCES users(id),
    reception_notes TEXT,

    -- Sistema de alertas
    alert_hours INTEGER DEFAULT 24,
    alert_sent_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Items dentro de cada paquete
CREATE TABLE IF NOT EXISTS transfer_package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER NOT NULL REFERENCES transfer_packages(id) ON DELETE CASCADE,

    -- Referencias al defecto/unidad
    defect_id INTEGER REFERENCES defect_entries_v2(id),
    unit_id INTEGER REFERENCES unit_registry(id),

    -- Snapshot de datos (para referencia rápida)
    serial_number VARCHAR(100),
    part_id INTEGER REFERENCES client_parts(id),
    part_number VARCHAR(100),
    part_name VARCHAR(255),

    -- Snapshot de defectos
    defect_type_ids INTEGER[], -- Array de IDs de tipos de defecto
    defect_summary TEXT, -- Resumen legible: "Scratch, Dent, Dimensional"
    severity_code VARCHAR(20),

    -- Fotos/evidencia (referencias a URLs existentes)
    photo_urls JSONB DEFAULT '[]',

    -- Notas específicas del item
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transfer_packages_status ON transfer_packages(status);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_origin ON transfer_packages(origin_type);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_destination ON transfer_packages(destination_type);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_created_at ON transfer_packages(created_at);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_mrb_campaign ON transfer_packages(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_transfer_packages_qar ON transfer_packages(qar_id);
CREATE INDEX IF NOT EXISTS idx_transfer_package_items_package ON transfer_package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_transfer_package_items_defect ON transfer_package_items(defect_id);
CREATE INDEX IF NOT EXISTS idx_transfer_package_items_unit ON transfer_package_items(unit_id);
CREATE INDEX IF NOT EXISTS idx_transfer_package_items_part ON transfer_package_items(part_id);

-- Secuencia para número de paquete por año
CREATE SEQUENCE IF NOT EXISTS transfer_package_seq START 1;

-- Función para generar número de paquete automático
CREATE OR REPLACE FUNCTION generate_package_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Reset sequence if new year (opcional, por ahora secuencial continuo)
    next_seq := nextval('transfer_package_seq');

    NEW.package_number := 'PKG-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar número de paquete
DROP TRIGGER IF EXISTS trg_generate_package_number ON transfer_packages;
CREATE TRIGGER trg_generate_package_number
    BEFORE INSERT ON transfer_packages
    FOR EACH ROW
    WHEN (NEW.package_number IS NULL)
    EXECUTE FUNCTION generate_package_number();

-- Vista para paquetes pendientes con resumen
CREATE OR REPLACE VIEW v_transfer_packages_pending AS
SELECT
    tp.id,
    tp.package_number,
    tp.origin_type,
    tp.destination_type,
    tp.status,
    tp.mrb_campaign_id,
    mc.campaign_number,
    tp.qar_id,
    qar.alert_number,
    tp.created_at,
    tp.created_by,
    CONCAT(u.first_name, ' ', u.last_name) as created_by_name,
    tp.alert_hours,
    tp.notes,
    -- Calcular tiempo transcurrido
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 3600 as hours_elapsed,
    CASE
        WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - tp.created_at)) / 3600 > tp.alert_hours
        THEN true
        ELSE false
    END as alert_triggered,
    -- Conteo de items
    (SELECT COUNT(*) FROM transfer_package_items WHERE package_id = tp.id) as item_count,
    -- Resumen de partes
    (SELECT STRING_AGG(DISTINCT part_number, ', ') FROM transfer_package_items WHERE package_id = tp.id) as parts_summary,
    -- Resumen de defectos
    (SELECT STRING_AGG(DISTINCT defect_summary, '; ') FROM transfer_package_items WHERE package_id = tp.id) as defects_summary
FROM transfer_packages tp
LEFT JOIN users u ON tp.created_by = u.id
LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
LEFT JOIN quality_alerts qar ON tp.qar_id = qar.id
WHERE tp.status = 'PENDING';

-- Vista para historial de transferencias
CREATE OR REPLACE VIEW v_transfer_packages_history AS
SELECT
    tp.*,
    CONCAT(uc.first_name, ' ', uc.last_name) as created_by_name,
    CONCAT(ur.first_name, ' ', ur.last_name) as received_by_name,
    mc.campaign_number,
    qar.alert_number,
    (SELECT COUNT(*) FROM transfer_package_items WHERE package_id = tp.id) as item_count,
    CASE
        WHEN tp.received_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (tp.received_at - tp.created_at)) / 3600
        ELSE NULL
    END as transfer_hours
FROM transfer_packages tp
LEFT JOIN users uc ON tp.created_by = uc.id
LEFT JOIN users ur ON tp.received_by = ur.id
LEFT JOIN mrb_campaigns mc ON tp.mrb_campaign_id = mc.id
LEFT JOIN quality_alerts qar ON tp.qar_id = qar.id;

-- Agregar campo en defect_entries_v2 para tracking de paquete
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS transfer_package_id INTEGER REFERENCES transfer_packages(id),
ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(30) CHECK (transfer_status IN ('PENDING_TRANSFER', 'IN_TRANSIT', 'TRANSFERRED', 'RECEIVED'));

-- Índice para el nuevo campo
CREATE INDEX IF NOT EXISTS idx_defect_entries_transfer_package ON defect_entries_v2(transfer_package_id);
CREATE INDEX IF NOT EXISTS idx_defect_entries_transfer_status ON defect_entries_v2(transfer_status);

COMMENT ON TABLE transfer_packages IS 'Paquetes de transferencia bidireccional entre Hospital y MRB';
COMMENT ON TABLE transfer_package_items IS 'Items individuales dentro de cada paquete de transferencia';
COMMENT ON VIEW v_transfer_packages_pending IS 'Vista de paquetes pendientes con alertas y resumen';
