-- ============================================================================
-- Migration: 079_mrb_campaign_parts_pivot.sql
-- Date: 2026-05-01
-- Description: Tabla pivote para relación muchos-a-muchos entre campañas y partes
--              Permite consultar eficientemente "¿qué campañas tiene esta parte?"
-- ============================================================================

-- 1. Crear tabla pivote
CREATE TABLE IF NOT EXISTS mrb_campaign_parts (
  id SERIAL PRIMARY KEY,
  mrb_campaign_id INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES client_parts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mrb_campaign_id, part_id)
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_mrb_campaign_parts_campaign ON mrb_campaign_parts(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrb_campaign_parts_part ON mrb_campaign_parts(part_id);

-- 3. Migrar datos existentes de parts_list JSONB
INSERT INTO mrb_campaign_parts (mrb_campaign_id, part_id)
SELECT
  mc.id as mrb_campaign_id,
  (part_item->>'partId')::INTEGER as part_id
FROM mrb_campaigns mc,
     jsonb_array_elements(mc.parts_list) as part_item
WHERE mc.parts_list IS NOT NULL
  AND jsonb_array_length(mc.parts_list) > 0
  AND (part_item->>'partId') IS NOT NULL
ON CONFLICT (mrb_campaign_id, part_id) DO NOTHING;

-- 4. También migrar part_id legacy si no está en parts_list
INSERT INTO mrb_campaign_parts (mrb_campaign_id, part_id)
SELECT id, part_id
FROM mrb_campaigns
WHERE part_id IS NOT NULL
ON CONFLICT (mrb_campaign_id, part_id) DO NOTHING;

-- 5. Vista: Campañas activas por número de parte
CREATE OR REPLACE VIEW v_campaigns_by_part AS
SELECT
  cp.id as part_id,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  mc.id as campaign_id,
  mc.campaign_number,
  mc.title as campaign_title,
  mc.status as campaign_status,
  mc.disposition,
  dt.name as defect_name,
  dt.code as defect_code,
  sev.name as severity_name,
  sev.color as severity_color,
  mc.created_at as campaign_created_at,
  mc.qty_inspected,
  mc.qty_ok,
  mc.qty_nok
FROM mrb_campaign_parts mcp
JOIN client_parts cp ON mcp.part_id = cp.id
JOIN mrb_campaigns mc ON mcp.mrb_campaign_id = mc.id
LEFT JOIN clients c ON cp.client_id = c.id
LEFT JOIN defect_types dt ON mc.severity_id = dt.id
LEFT JOIN inspection_severities sev ON mc.severity_id = sev.id
WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
ORDER BY cp.part_number, mc.campaign_number;

-- 6. Vista: Resumen de partes con múltiples campañas activas
CREATE OR REPLACE VIEW v_parts_multi_campaign AS
SELECT
  cp.id as part_id,
  cp.part_number,
  cp.part_name,
  c.name as client_name,
  COUNT(mc.id) as active_campaigns_count,
  ARRAY_AGG(mc.campaign_number ORDER BY mc.campaign_number) as campaign_numbers
FROM mrb_campaign_parts mcp
JOIN client_parts cp ON mcp.part_id = cp.id
JOIN mrb_campaigns mc ON mcp.mrb_campaign_id = mc.id
LEFT JOIN clients c ON cp.client_id = c.id
WHERE mc.status IN ('ABIERTA', 'EN_PROCESO')
GROUP BY cp.id, cp.part_number, cp.part_name, c.name
ORDER BY active_campaigns_count DESC, cp.part_number;

-- 7. Comentarios
COMMENT ON TABLE mrb_campaign_parts IS 'Relación muchos-a-muchos entre campañas MRB y números de parte';
COMMENT ON VIEW v_campaigns_by_part IS 'Campañas activas agrupadas por número de parte para inspección';
COMMENT ON VIEW v_parts_multi_campaign IS 'Partes que tienen múltiples campañas activas simultáneas';
