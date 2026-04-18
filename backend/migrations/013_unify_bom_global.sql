-- ============================================================================
-- Migration: 013_unify_bom_global.sql
-- Date: 2026-02-02
-- Description: Unificar BOM en client_parts como única fuente de verdad
--              Agregar project_id para filtrar por proyecto
-- ============================================================================

-- 1. Agregar project_id a client_parts
ALTER TABLE client_parts
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;

-- 2. Crear índice para filtrar por proyecto
CREATE INDEX IF NOT EXISTS idx_client_parts_project ON client_parts(project_id);

-- 3. Migrar datos existentes de project_parts a client_parts (si no existen)
INSERT INTO client_parts (
  client_id, project_id, part_number, client_part_number, part_name,
  description, revision, specifications, weight, snp_quantity, snp_volume,
  unit_cost, currency, active
)
SELECT
  p.client_id,
  pp.project_id,
  pp.part_number,
  pp.client_part_number,
  pp.part_name,
  pp.description,
  pp.revision,
  pp.specifications,
  pp.weight,
  pp.snp_quantity,
  pp.snp_volume,
  pp.unit_cost,
  pp.currency,
  true as active
FROM project_parts pp
JOIN projects p ON pp.project_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM client_parts cp
  WHERE cp.client_id = p.client_id
  AND cp.part_number = pp.part_number
)
ON CONFLICT (client_id, part_number) DO NOTHING;

-- 4. Actualizar project_id en client_parts existentes basado en part_number
UPDATE client_parts cp
SET project_id = (
  SELECT pp.project_id
  FROM project_parts pp
  JOIN projects p ON pp.project_id = p.id
  WHERE pp.part_number = cp.part_number
  AND p.client_id = cp.client_id
  LIMIT 1
)
WHERE cp.project_id IS NULL;

-- 5. Comentarios
COMMENT ON COLUMN client_parts.project_id IS 'Proyecto asociado a la parte. NULL si es parte global del cliente sin proyecto específico.';

-- NOTA: project_parts queda deprecada pero no la eliminamos aún para no romper referencias FK
