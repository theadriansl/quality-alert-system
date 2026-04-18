-- ============================================================================
-- AUDIT RISK & EVIDENCE FIELDS
-- Migration 029
-- Description: Add risk tracking, recurrence detection, and evidence support
-- ============================================================================

-- ============================================================================
-- 1. AUDIT_FINDINGS - Risk & Evidence Fields
-- ============================================================================

-- Risk signal level (calculated automatically)
ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS risk_signal_level VARCHAR(10) DEFAULT 'low';

COMMENT ON COLUMN audit_findings.risk_signal_level IS 'Calculated risk: low, medium, high';

-- Recurrence tracking
ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS is_repeat BOOLEAN DEFAULT FALSE;

ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS repeat_source_id INTEGER REFERENCES audit_findings(id);

ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS repeat_count INTEGER DEFAULT 0;

COMMENT ON COLUMN audit_findings.is_repeat IS 'TRUE if similar finding exists in past 12 months';
COMMENT ON COLUMN audit_findings.repeat_source_id IS 'Reference to original/previous finding';
COMMENT ON COLUMN audit_findings.repeat_count IS 'Number of times this issue has been found';

-- Systemic indicator
ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS is_systemic BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN audit_findings.is_systemic IS 'TRUE if 3+ occurrences detected (system failure, not operator error)';

-- Evidence files (photos, documents)
ALTER TABLE audit_findings
ADD COLUMN IF NOT EXISTS evidence_files JSONB DEFAULT '[]';

COMMENT ON COLUMN audit_findings.evidence_files IS 'Array of {id, fileName, fileUrl, fileType, capturedAt, uploadedBy, isPhoto}';

-- ============================================================================
-- 2. AUDIT_NON_CONFORMITIES - Risk & Evidence Fields
-- ============================================================================

-- Risk level
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) DEFAULT 'medium';

COMMENT ON COLUMN audit_non_conformities.risk_level IS 'Overall risk: low, medium, high';

-- Recurrence tracking
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT FALSE;

ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER DEFAULT 0;

ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS related_nc_ids INTEGER[];

COMMENT ON COLUMN audit_non_conformities.is_recurrent IS 'TRUE if similar NC exists in history';
COMMENT ON COLUMN audit_non_conformities.recurrence_count IS 'Number of similar NCs in past 24 months';
COMMENT ON COLUMN audit_non_conformities.related_nc_ids IS 'Array of related NC IDs for traceability';

-- Systemic indicator
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS systemic_indicator BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN audit_non_conformities.systemic_indicator IS 'TRUE if pattern indicates system failure';

-- Evidence files (ensure exists, may already exist)
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS evidence_files JSONB DEFAULT '[]';

-- ============================================================================
-- 3. AUDIT_CHECKLIST_ITEMS - Risk Weight
-- ============================================================================

ALTER TABLE audit_checklist_items
ADD COLUMN IF NOT EXISTS risk_weight INTEGER DEFAULT 1;

COMMENT ON COLUMN audit_checklist_items.risk_weight IS 'Risk weight 1-5, used for risk calculations. Higher = more critical';

-- Update existing critical items to have higher weight
UPDATE audit_checklist_items
SET risk_weight = 3
WHERE is_critical = TRUE AND risk_weight = 1;

-- ============================================================================
-- 4. INDEXES FOR RISK QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_findings_risk
ON audit_findings(risk_signal_level);

CREATE INDEX IF NOT EXISTS idx_audit_findings_repeat
ON audit_findings(is_repeat) WHERE is_repeat = TRUE;

CREATE INDEX IF NOT EXISTS idx_audit_findings_systemic
ON audit_findings(is_systemic) WHERE is_systemic = TRUE;

CREATE INDEX IF NOT EXISTS idx_audit_ncs_risk
ON audit_non_conformities(risk_level);

CREATE INDEX IF NOT EXISTS idx_audit_ncs_recurrent
ON audit_non_conformities(is_recurrent) WHERE is_recurrent = TRUE;

-- ============================================================================
-- 5. FUNCTION: Detect Recurrence
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_finding_recurrence(
  p_clause VARCHAR,
  p_area_process VARCHAR,
  p_result VARCHAR,
  p_audit_id INTEGER
)
RETURNS TABLE (
  is_repeat BOOLEAN,
  repeat_source_id INTEGER,
  repeat_count INTEGER,
  is_systemic BOOLEAN,
  risk_signal_level VARCHAR
) AS $$
DECLARE
  v_count INTEGER;
  v_source_id INTEGER;
  v_risk VARCHAR(10);
BEGIN
  -- Find similar findings in past 12 months
  SELECT
    COUNT(*),
    MIN(f.id)
  INTO v_count, v_source_id
  FROM audit_findings f
  JOIN audits a ON f.audit_id = a.id
  WHERE f.clause = p_clause
    AND a.area_process = p_area_process
    AND f.result IN ('nc_major', 'nc_minor', 'observation')
    AND a.audit_date >= CURRENT_DATE - INTERVAL '12 months'
    AND f.audit_id != p_audit_id;

  -- Calculate risk level
  IF p_result = 'nc_major' THEN
    v_risk := 'high';
  ELSIF p_result = 'nc_minor' THEN
    v_risk := 'medium';
  ELSE
    v_risk := 'low';
  END IF;

  -- Elevate risk if repeat
  IF v_count > 0 AND v_risk = 'low' THEN
    v_risk := 'medium';
  ELSIF v_count > 0 AND v_risk = 'medium' THEN
    v_risk := 'high';
  END IF;

  -- Return results
  RETURN QUERY SELECT
    v_count > 0 AS is_repeat,
    v_source_id AS repeat_source_id,
    v_count AS repeat_count,
    v_count >= 3 AS is_systemic,
    v_risk AS risk_signal_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION: Detect NC Recurrence
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_nc_recurrence(
  p_clause VARCHAR,
  p_nc_type VARCHAR,
  p_audit_id INTEGER
)
RETURNS TABLE (
  is_recurrent BOOLEAN,
  recurrence_count INTEGER,
  related_nc_ids INTEGER[],
  systemic_indicator BOOLEAN,
  risk_level VARCHAR
) AS $$
DECLARE
  v_count INTEGER;
  v_ids INTEGER[];
  v_risk VARCHAR(10);
BEGIN
  -- Find similar NCs in past 24 months
  SELECT
    COUNT(*),
    ARRAY_AGG(nc.id)
  INTO v_count, v_ids
  FROM audit_non_conformities nc
  JOIN audits a ON nc.audit_id = a.id
  WHERE nc.clause = p_clause
    AND a.audit_date >= CURRENT_DATE - INTERVAL '24 months'
    AND nc.audit_id != p_audit_id;

  -- Calculate risk level
  IF p_nc_type = 'major' THEN
    v_risk := 'high';
  ELSE
    v_risk := 'medium';
  END IF;

  -- Elevate if recurrent
  IF v_count >= 2 THEN
    v_risk := 'high';
  END IF;

  RETURN QUERY SELECT
    v_count > 0 AS is_recurrent,
    v_count AS recurrence_count,
    COALESCE(v_ids, ARRAY[]::INTEGER[]) AS related_nc_ids,
    v_count >= 3 AS systemic_indicator,
    v_risk AS risk_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 029: Audit Risk & Evidence fields completed!';
  RAISE NOTICE '   - audit_findings: risk_signal_level, is_repeat, repeat_source_id, is_systemic, evidence_files';
  RAISE NOTICE '   - audit_non_conformities: risk_level, is_recurrent, recurrence_count, related_nc_ids, systemic_indicator';
  RAISE NOTICE '   - audit_checklist_items: risk_weight';
  RAISE NOTICE '   - Functions: detect_finding_recurrence(), detect_nc_recurrence()';
END $$;
