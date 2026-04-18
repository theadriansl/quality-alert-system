-- Migration 056: mrb_ok_entries — Track OK pieces per inspector per shift
-- Enables detection capability analysis per inspector

CREATE TABLE IF NOT EXISTS mrb_ok_entries (
  id                SERIAL PRIMARY KEY,
  mrb_campaign_id   INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
  part_id           INTEGER REFERENCES client_parts(id) ON DELETE SET NULL,
  shift_id          INTEGER REFERENCES inspection_shifts(id) ON DELETE SET NULL,
  inspector_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  inspection_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes             TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_campaign  ON mrb_ok_entries(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_inspector ON mrb_ok_entries(inspector_id);
CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_shift     ON mrb_ok_entries(shift_id);
CREATE INDEX IF NOT EXISTS idx_mrb_ok_entries_date      ON mrb_ok_entries(inspection_date);

COMMENT ON TABLE mrb_ok_entries IS 'Registro de piezas OK por inspector — permite medir detection capability individual';
COMMENT ON COLUMN mrb_ok_entries.inspector_id  IS 'Usuario inspector que capturó el lote OK';
COMMENT ON COLUMN mrb_ok_entries.quantity      IS 'Piezas OK capturadas en este lote';
COMMENT ON COLUMN mrb_ok_entries.inspection_date IS 'Fecha de inspección (DATE sin hora)';
