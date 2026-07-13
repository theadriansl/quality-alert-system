-- ============================================================================
-- Migración 103: Production Entries
-- Tabla para recibir datos de producción desde sistemas externos
-- Permite trazabilidad: producido vs inspeccionado
-- Soporta partes no configuradas (production trials)
-- ============================================================================

-- Tabla principal de entradas de producción
CREATE TABLE IF NOT EXISTS production_entries (
  id SERIAL PRIMARY KEY,

  -- Identificación
  serial_number VARCHAR(100) NOT NULL,

  -- Parte: puede ser NULL si no está configurada en sistema
  part_id INTEGER REFERENCES client_parts(id) ON DELETE SET NULL,
  part_number_raw VARCHAR(100),  -- Número de parte original del CSV/API (para vincular después)

  -- Contexto opcional
  lot_number VARCHAR(100),
  work_order VARCHAR(100),
  line_id INTEGER,
  shift_id INTEGER REFERENCES inspection_shifts(id) ON DELETE SET NULL,

  -- Estado de inspección
  inspection_status VARCHAR(30) DEFAULT 'PENDING'
    CHECK (inspection_status IN ('PENDING', 'INSPECTED', 'PARTIAL', 'SKIPPED')),

  -- Estado de configuración de parte
  part_status VARCHAR(30) DEFAULT 'CONFIGURED'
    CHECK (part_status IN ('CONFIGURED', 'UNMATCHED', 'PENDING_CONFIG')),

  -- Vinculación con unit_registry (se llena al inspeccionar)
  unit_id INTEGER REFERENCES unit_registry(id) ON DELETE SET NULL,

  -- Timestamps
  produced_at TIMESTAMP NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  inspected_at TIMESTAMP,

  -- Fuente de datos
  source VARCHAR(50) NOT NULL CHECK (source IN ('API', 'CSV', 'MANUAL', 'WEBHOOK', 'INSPECTION')),
  source_reference VARCHAR(255),

  -- Auditoría
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Índice único para entradas CON part_id configurado
CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_entries_unique_configured
  ON production_entries(part_id, serial_number)
  WHERE part_id IS NOT NULL;

-- Índice único para entradas SIN part_id (usa part_number_raw)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_entries_unique_unmatched
  ON production_entries(part_number_raw, serial_number)
  WHERE part_id IS NULL;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_prod_entries_status ON production_entries(inspection_status);
CREATE INDEX IF NOT EXISTS idx_prod_entries_part ON production_entries(part_id) WHERE part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prod_entries_produced ON production_entries(produced_at);
CREATE INDEX IF NOT EXISTS idx_prod_entries_serial ON production_entries(serial_number);
CREATE INDEX IF NOT EXISTS idx_prod_entries_work_order ON production_entries(work_order) WHERE work_order IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prod_entries_lot ON production_entries(lot_number) WHERE lot_number IS NOT NULL;

-- Índice parcial para pendientes de inspección
CREATE INDEX IF NOT EXISTS idx_prod_entries_pending ON production_entries(part_id, produced_at)
  WHERE inspection_status = 'PENDING' AND part_id IS NOT NULL;

-- Índice para partes no configuradas (acceso rápido)
CREATE INDEX IF NOT EXISTS idx_prod_entries_unmatched ON production_entries(part_number_raw, registered_at)
  WHERE part_status = 'UNMATCHED';

-- Trigger para actualizar timestamps y estados
CREATE OR REPLACE FUNCTION update_production_entry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cambia a INSPECTED, registrar timestamp
  IF NEW.inspection_status = 'INSPECTED' AND
     (OLD.inspection_status IS NULL OR OLD.inspection_status != 'INSPECTED') THEN
    NEW.inspected_at = CURRENT_TIMESTAMP;
  END IF;

  -- Si se asigna part_id, cambiar part_status a CONFIGURED
  IF NEW.part_id IS NOT NULL AND (OLD.part_id IS NULL OR OLD.part_id != NEW.part_id) THEN
    NEW.part_status = 'CONFIGURED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_entry_update ON production_entries;
CREATE TRIGGER trg_production_entry_update
  BEFORE UPDATE ON production_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_production_entry_timestamp();

-- Comentarios de documentación
COMMENT ON TABLE production_entries IS 'Registro de unidades producidas desde sistemas externos para trazabilidad de inspección';
COMMENT ON COLUMN production_entries.inspection_status IS 'PENDING=sin inspeccionar, INSPECTED=inspeccionada, PARTIAL=inspección parcial, SKIPPED=omitida';
COMMENT ON COLUMN production_entries.part_status IS 'CONFIGURED=parte vinculada, UNMATCHED=parte no encontrada en sistema, PENDING_CONFIG=esperando configuración';
COMMENT ON COLUMN production_entries.part_number_raw IS 'Número de parte original del archivo de importación, usado para vincular posteriormente';
COMMENT ON COLUMN production_entries.source IS 'Origen de los datos: API, CSV, MANUAL, WEBHOOK, INSPECTION';
COMMENT ON COLUMN production_entries.unit_id IS 'Vínculo con unit_registry cuando la pieza es inspeccionada';

-- Vista para partes no configuradas agrupadas
CREATE OR REPLACE VIEW v_unmatched_parts AS
SELECT
  part_number_raw,
  COUNT(*) as entry_count,
  MIN(produced_at) as first_produced,
  MAX(produced_at) as last_produced,
  array_agg(DISTINCT work_order) FILTER (WHERE work_order IS NOT NULL) as work_orders,
  array_agg(DISTINCT source) as sources
FROM production_entries
WHERE part_status = 'UNMATCHED' AND part_id IS NULL
GROUP BY part_number_raw
ORDER BY entry_count DESC;

COMMENT ON VIEW v_unmatched_parts IS 'Vista agregada de números de parte no configurados en el sistema';
