-- ============================================================================
-- Migration: 075_add_unit_cost_to_defects.sql
-- Date: 2026-04-30
-- Description: Agregar unit_cost a defect_entries_v2 para cálculo de scrap
--              El costo se copia de client_parts al momento de crear el defecto
-- ============================================================================

-- 1. Agregar columna unit_cost
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT NULL;

-- 2. Agregar columna currency para referencia
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- 3. Actualizar defectos existentes con el costo actual de la parte (backfill)
UPDATE defect_entries_v2 de
SET
  unit_cost = cp.unit_cost,
  currency = COALESCE(cp.currency, 'USD')
FROM client_parts cp
WHERE de.part_id = cp.id
  AND de.unit_cost IS NULL
  AND cp.unit_cost IS NOT NULL;

-- 4. Comentarios
COMMENT ON COLUMN defect_entries_v2.unit_cost IS 'Costo unitario de la parte al momento del defecto (copiado de BOM)';
COMMENT ON COLUMN defect_entries_v2.currency IS 'Moneda del costo (USD, MXN, etc)';

-- 5. Índice para queries de scrap cost
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_unit_cost ON defect_entries_v2(unit_cost) WHERE unit_cost IS NOT NULL;
