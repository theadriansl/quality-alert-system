-- Script para crear tabla de partes asociadas a reportes 8D
-- Ejecutar después de crear tabla eightd_reports

-- Tabla para almacenar las partes seleccionadas de cada 8D
CREATE TABLE IF NOT EXISTS eightd_parts (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE NOT NULL,

    -- Información del proyecto y cliente
    client_id INTEGER NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    project_id INTEGER NOT NULL,
    project_number VARCHAR(100) NOT NULL,
    project_name VARCHAR(255) NOT NULL,

    -- Información de la parte
    part_id INTEGER NOT NULL,
    part_number VARCHAR(100) NOT NULL,
    part_name VARCHAR(255) NOT NULL,
    client_part_number VARCHAR(100),
    revision VARCHAR(50),
    description TEXT,

    -- Costos
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Especificaciones adicionales (JSON para flexibilidad)
    specifications JSONB,

    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraint para evitar duplicados
    CONSTRAINT unique_part_per_report UNIQUE(report_id, part_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_eightd_parts_report_id ON eightd_parts(report_id);
CREATE INDEX IF NOT EXISTS idx_eightd_parts_client_id ON eightd_parts(client_id);
CREATE INDEX IF NOT EXISTS idx_eightd_parts_project_id ON eightd_parts(project_id);
CREATE INDEX IF NOT EXISTS idx_eightd_parts_part_id ON eightd_parts(part_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_eightd_parts_updated_at
    BEFORE UPDATE ON eightd_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para obtener resumen de costos por 8D
CREATE OR REPLACE VIEW eightd_parts_summary AS
SELECT
    r.id as report_id,
    r.report_id as report_number,
    r.title,
    COUNT(p.id) as total_parts,
    SUM(p.unit_cost) as total_cost,
    p.currency,
    array_agg(p.part_number) as part_numbers,
    r.supplier_name,
    r.status
FROM eightd_reports r
LEFT JOIN eightd_parts p ON r.id = p.report_id
GROUP BY r.id, r.report_id, r.title, p.currency, r.supplier_name, r.status;

-- Comentarios para documentación
COMMENT ON TABLE eightd_parts IS 'Almacena las partes seleccionadas para cada reporte 8D con sus costos asociados';
COMMENT ON COLUMN eightd_parts.report_id IS 'FK a eightd_reports - reporte 8D al que pertenece esta parte';
COMMENT ON COLUMN eightd_parts.unit_cost IS 'Costo unitario de la parte al momento de crear el 8D';
COMMENT ON COLUMN eightd_parts.specifications IS 'Campos adicionales en formato JSON (peso, volumen, etc.)';
