-- ============================================================================
-- Migración 097: Agregar columnas para confirmación de scrap
-- ============================================================================
-- Propósito: Permitir confirmar scrap como disposición final en MRB
-- ============================================================================

-- Agregar columnas de confirmación de scrap
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS scrap_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scrap_confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS scrap_confirmed_by INTEGER REFERENCES users(id);

-- Índice para búsquedas de scrap pendientes de confirmación
CREATE INDEX IF NOT EXISTS idx_defects_scrap_pending
ON defect_entries_v2 (repair_status, scrap_confirmed)
WHERE repair_status = 'SCRAPPED' AND (scrap_confirmed IS NULL OR scrap_confirmed = FALSE);

-- Comentarios
COMMENT ON COLUMN defect_entries_v2.scrap_confirmed IS 'Indica si el scrap fue confirmado como disposición final';
COMMENT ON COLUMN defect_entries_v2.scrap_confirmed_at IS 'Fecha/hora de confirmación del scrap';
COMMENT ON COLUMN defect_entries_v2.scrap_confirmed_by IS 'Usuario que confirmó el scrap';
