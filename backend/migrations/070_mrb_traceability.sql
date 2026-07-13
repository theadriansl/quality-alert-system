-- ============================================================================
-- Migration: 070_mrb_traceability.sql
-- Date: 2026-04-28
-- Description: Agregar campos de trazabilidad a mrb_ok_entries
-- ============================================================================

-- Agregar unit_id y serial_number a mrb_ok_entries
ALTER TABLE mrb_ok_entries
  ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES unit_registry(id),
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_unit ON mrb_ok_entries(unit_id);
CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_serial ON mrb_ok_entries(serial_number);

COMMENT ON COLUMN mrb_ok_entries.unit_id IS 'FK a unit_registry para trazabilidad completa';
COMMENT ON COLUMN mrb_ok_entries.serial_number IS 'Numero de serie de la pieza inspeccionada';

SELECT 'Migration 070_mrb_traceability.sql completed successfully' as status;
