-- ============================================================================
-- Migration: 108_defect_entries_mrb_campaign.sql
-- Date: 2026-07-13
-- Description: Agregar mrb_campaign_id a defect_entries_v2 para trazabilidad de tally import
-- ============================================================================

-- 1. Agregar columna mrb_campaign_id si no existe
ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS mrb_campaign_id INTEGER REFERENCES mrb_campaigns(id) ON DELETE SET NULL;

-- 2. Índice para consultas de defectos por campaña MRB
CREATE INDEX IF NOT EXISTS idx_defect_entries_v2_mrb_campaign
ON defect_entries_v2(mrb_campaign_id)
WHERE mrb_campaign_id IS NOT NULL;

-- 3. Comentario
COMMENT ON COLUMN defect_entries_v2.mrb_campaign_id IS 'FK a mrb_campaigns - para defectos capturados desde tally import';
