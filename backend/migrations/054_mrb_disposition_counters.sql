-- Migration 054: Add disposition quantity counters to mrb_campaigns
-- Each counter maps to inspection_dispositions codes

ALTER TABLE mrb_campaigns
  ADD COLUMN IF NOT EXISTS qty_use_as_is   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_rework      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_scrap       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_return      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_hold        INTEGER DEFAULT 0;

-- Also add part_id array support for multi-part MRBs
-- (mrb_campaigns already has part_id for single part)
-- Multi-part is handled via defect_entries_v2.part_id linked to mrb_campaign_id

COMMENT ON COLUMN mrb_campaigns.qty_use_as_is IS 'Piezas NOK con disposicion: Usar como esta (USE_AS_IS)';
COMMENT ON COLUMN mrb_campaigns.qty_rework    IS 'Piezas NOK con disposicion: Retrabajo (REWORK)';
COMMENT ON COLUMN mrb_campaigns.qty_scrap     IS 'Piezas NOK con disposicion: Scrap (SCRAP)';
COMMENT ON COLUMN mrb_campaigns.qty_return    IS 'Piezas NOK con disposicion: Devolver a Proveedor (RETURN_SUPPLIER)';
COMMENT ON COLUMN mrb_campaigns.qty_hold      IS 'Piezas NOK con disposicion: En Hold (HOLD)';
