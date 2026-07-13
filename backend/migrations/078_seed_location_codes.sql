-- ============================================================================
-- Migration: 078_seed_location_codes.sql
-- Date: 2026-05-01
-- Description: Ubicaciones de prueba para Hospital de Defectos
-- ============================================================================

INSERT INTO location_codes (code, location_type, description) VALUES
  ('HOSP-001', 'REPAIR', 'Mesa reparación 1'),
  ('HOSP-002', 'REPAIR', 'Mesa reparación 2'),
  ('HOSP-003', 'REPAIR', 'Mesa reparación 3'),
  ('REL-A1', 'RELEASE', 'Estación liberación A1'),
  ('REL-A2', 'RELEASE', 'Estación liberación A2'),
  ('BUFF-01', 'BUFFER', 'Buffer temporal'),
  ('MRB-01', 'MRB', 'Área MRB')
ON CONFLICT (code) DO NOTHING;
