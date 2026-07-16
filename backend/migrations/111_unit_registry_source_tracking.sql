-- ============================================================================
-- Migration: 111_unit_registry_source_tracking.sql
-- Date: 2026-07-15
-- Description: Agregar campos de origen y link a production_entries
-- ============================================================================

-- Agregar campo source para identificar origen del registro
ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'MANUAL';

-- Agregar FK a production_entries para link bidireccional
ALTER TABLE unit_registry
ADD COLUMN IF NOT EXISTS production_entry_id INTEGER REFERENCES production_entries(id) ON DELETE SET NULL;

-- Índice para búsqueda por source
CREATE INDEX IF NOT EXISTS idx_unit_registry_source ON unit_registry(source);

-- Índice para búsqueda por production_entry_id
CREATE INDEX IF NOT EXISTS idx_unit_registry_production_entry ON unit_registry(production_entry_id);

-- Comentarios
COMMENT ON COLUMN unit_registry.source IS 'Origen del registro: PRODUCTION (de production_entries), MANUAL (creado manualmente), INSPECTION (creado en inspección), MRB (creado desde campaña MRB)';
COMMENT ON COLUMN unit_registry.production_entry_id IS 'FK a production_entries cuando el serial proviene de datos de producción';

-- Actualizar registros existentes que tengan link en production_entries
UPDATE unit_registry ur
SET production_entry_id = pe.id,
    source = 'PRODUCTION'
FROM production_entries pe
WHERE pe.unit_id = ur.id
  AND ur.production_entry_id IS NULL;

SELECT 'Migration 111_unit_registry_source_tracking.sql completed successfully' as status;
