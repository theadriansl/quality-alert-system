-- ============================================================================
-- Migration 112: Add PENDING status to unit_registry and auto-create on production import
-- ============================================================================

-- Agregar PENDING como status válido para unit_registry
-- PENDING = Producido, pendiente de inspección
COMMENT ON COLUMN unit_registry.current_status IS 'Estados: PENDING | REGISTERED | INSPECTING | OK | DEFECTIVE | IN_REPAIR | REPAIRED | PENDING_REINSPECTION | QUARANTINE | RELEASED | SCRAPPED | SHIPPED';

-- Agregar columna para vincular production_entry con unit_registry
ALTER TABLE production_entries
ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unit_registry(id);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_production_entries_unit_id ON production_entries(unit_id);

SELECT 'Migration 112_unit_registry_pending_status.sql completed successfully' as status;
