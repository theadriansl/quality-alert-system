-- Migration 063: Dedicated downtime entries table for MRB campaigns
CREATE TABLE IF NOT EXISTS mrb_downtime_entries (
  id                SERIAL PRIMARY KEY,
  mrb_campaign_id   INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
  shift_id          INTEGER REFERENCES inspection_shifts(id),
  registered_by     INTEGER NOT NULL REFERENCES users(id),   -- usuario que registró
  lot_number        VARCHAR(100),                             -- serial de la pieza
  downtime_minutes  INTEGER NOT NULL DEFAULT 0,              -- tiempo de paro en minutos
  source_type       VARCHAR(10) NOT NULL DEFAULT 'NOK',      -- 'OK' | 'NOK'
  defect_entry_id   INTEGER REFERENCES defect_entries_v2(id) ON DELETE SET NULL,
  comment           TEXT,                                     -- comentario obligatorio
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP       -- timestamp del registro
);

CREATE INDEX IF NOT EXISTS idx_mrb_downtime_campaign ON mrb_downtime_entries(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrb_downtime_shift    ON mrb_downtime_entries(shift_id);
CREATE INDEX IF NOT EXISTS idx_mrb_downtime_date     ON mrb_downtime_entries(created_at);
