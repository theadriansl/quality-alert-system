-- Backfill severity_id en defect_entries_v2 para campañas MRB
-- Solo actualiza registros sin severidad asignada donde mrb_campaign_id IS NOT NULL
-- Mapeo: SCRAP→CRITICAL, REWORK→MAJOR, RETURN_SUPPLIER→MAJOR, HOLD→MINOR, USE_AS_IS→MINOR

UPDATE defect_entries_v2
SET severity_id = CASE disp.code
  WHEN 'SCRAP'           THEN (SELECT id FROM inspection_severities WHERE code = 'CRITICAL' LIMIT 1)
  WHEN 'REWORK'          THEN (SELECT id FROM inspection_severities WHERE code = 'MAJOR'    LIMIT 1)
  WHEN 'RETURN_SUPPLIER' THEN (SELECT id FROM inspection_severities WHERE code = 'MAJOR'    LIMIT 1)
  WHEN 'HOLD'            THEN (SELECT id FROM inspection_severities WHERE code = 'MINOR'    LIMIT 1)
  WHEN 'USE_AS_IS'       THEN (SELECT id FROM inspection_severities WHERE code = 'MINOR'    LIMIT 1)
END
FROM inspection_dispositions disp
WHERE defect_entries_v2.disposition_id = disp.id
  AND defect_entries_v2.severity_id IS NULL
  AND defect_entries_v2.mrb_campaign_id IS NOT NULL;
