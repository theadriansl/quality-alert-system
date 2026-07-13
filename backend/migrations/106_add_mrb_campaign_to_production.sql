-- ============================================================================
-- Migración 106: Agregar mrb_campaign_id a production_entries
-- ============================================================================
-- Propósito: Permitir ligar importaciones de producción a campañas MRB
-- Caso de uso: Empresas sorteadoras que hacen campañas de calidad
-- ============================================================================

-- Agregar columna mrb_campaign_id a production_entries
ALTER TABLE production_entries
ADD COLUMN IF NOT EXISTS mrb_campaign_id INTEGER REFERENCES mrb_campaigns(id) ON DELETE SET NULL;

-- Índice para búsqueda por campaña
CREATE INDEX IF NOT EXISTS idx_production_entries_mrb_campaign
ON production_entries(mrb_campaign_id)
WHERE mrb_campaign_id IS NOT NULL;

-- Comentario
COMMENT ON COLUMN production_entries.mrb_campaign_id IS 'Campaña MRB asociada a esta entrada de producción';
