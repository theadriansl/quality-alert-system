-- Migration 109: Create mrb_campaign_defects table
-- Links MRB campaigns to specific defects selected at campaign creation

CREATE TABLE IF NOT EXISTS mrb_campaign_defects (
    id SERIAL PRIMARY KEY,
    mrb_campaign_id INTEGER NOT NULL REFERENCES mrb_campaigns(id) ON DELETE CASCADE,
    defect_type_id INTEGER NOT NULL REFERENCES defect_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mrb_campaign_id, defect_type_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mrb_campaign_defects_campaign ON mrb_campaign_defects(mrb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrb_campaign_defects_defect ON mrb_campaign_defects(defect_type_id);

COMMENT ON TABLE mrb_campaign_defects IS 'Defects selected for each MRB campaign at creation time';
