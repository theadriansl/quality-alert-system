-- Migration 057: Quarantine quantities in mrb_campaigns
-- Tracks total material on hold to inspect, editable when more material appears

ALTER TABLE mrb_campaigns
  ADD COLUMN IF NOT EXISTS qty_quarantine_total    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_quarantine_warehouse INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_quarantine_process   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_quarantine_transit   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_quarantine_customer  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_quarantine_updated_at TIMESTAMP;

COMMENT ON COLUMN mrb_campaigns.qty_quarantine_total    IS 'Total piezas en cuarentena a inspeccionar (auto-sync desde 8D o manual)';
COMMENT ON COLUMN mrb_campaigns.qty_quarantine_warehouse IS 'Piezas en cuarentena: almacén';
COMMENT ON COLUMN mrb_campaigns.qty_quarantine_process   IS 'Piezas en cuarentena: en proceso/línea';
COMMENT ON COLUMN mrb_campaigns.qty_quarantine_transit   IS 'Piezas en cuarentena: en tránsito';
COMMENT ON COLUMN mrb_campaigns.qty_quarantine_customer  IS 'Piezas en cuarentena: con cliente';
COMMENT ON COLUMN mrb_campaigns.qty_quarantine_updated_at IS 'Última vez que se actualizó la cuarentena (sync o edición manual)';
