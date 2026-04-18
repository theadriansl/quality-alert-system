-- ============================================================================
-- 8D Reports: Add department_id FK
-- Migration: 052_eightd_department_id.sql
-- Tracks responsible department for each 8D report
-- ============================================================================

ALTER TABLE eightd_reports
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_eightd_reports_department_id ON eightd_reports(department_id);
