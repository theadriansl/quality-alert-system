-- Migration: Add Cp field to ecr_reports + quality targets config table

ALTER TABLE ecr_reports
  ADD COLUMN IF NOT EXISTS cp_post_change NUMERIC;

CREATE TABLE IF NOT EXISTS ecr_quality_targets (
  id SERIAL PRIMARY KEY,
  cp_target NUMERIC NOT NULL DEFAULT 1.33,
  cpk_target NUMERIC NOT NULL DEFAULT 1.33,
  process_stability_target NUMERIC NOT NULL DEFAULT 95,
  initial_scrap_target NUMERIC NOT NULL DEFAULT 5,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default row if empty
INSERT INTO ecr_quality_targets (cp_target, cpk_target, process_stability_target, initial_scrap_target)
SELECT 1.33, 1.33, 95, 5
WHERE NOT EXISTS (SELECT 1 FROM ecr_quality_targets);
