-- ============================================================================
-- FROZEN USER NAMES - Auditorías, MRB, Hospital
-- Migration: 060_frozen_names_audit_mrb_hospital.sql
-- Purpose: Add frozen name columns to preserve historical user data
-- Date: 2026-06-16
-- ============================================================================

-- ============================================================================
-- 1. AUDITORÍAS
-- ============================================================================

-- audits: lead_auditor, closed_by, created_by
ALTER TABLE audits
ADD COLUMN IF NOT EXISTS lead_auditor_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS closed_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS co_auditors_names JSONB DEFAULT '[]'::jsonb;

-- audit_non_conformities: responsible, verified_by
ALTER TABLE audit_non_conformities
ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS verified_by_name VARCHAR(255);

-- ============================================================================
-- 2. MRB
-- ============================================================================

-- mrb_campaigns: assigned_to, reported_by, responded_by, validated_by, created_by
ALTER TABLE mrb_campaigns
ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS responded_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

-- mrb_comments: user_id
ALTER TABLE mrb_comments
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- ============================================================================
-- 3. HOSPITAL (defect_entries_v2)
-- ============================================================================

ALTER TABLE defect_entries_v2
ADD COLUMN IF NOT EXISTS captured_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS resolved_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS repaired_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS released_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS responsible_changed_by_name VARCHAR(255);

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- AUDITS
UPDATE audits a
SET lead_auditor_name = COALESCE(a.lead_auditor_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE a.lead_auditor_id = u.id AND a.lead_auditor_name IS NULL;

UPDATE audits a
SET closed_by_name = COALESCE(a.closed_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE a.closed_by = u.id AND a.closed_by_name IS NULL;

UPDATE audits a
SET created_by_name = COALESCE(a.created_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE a.created_by = u.id AND a.created_by_name IS NULL;

-- AUDIT NON CONFORMITIES
UPDATE audit_non_conformities anc
SET responsible_name = COALESCE(anc.responsible_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE anc.responsible_id = u.id AND anc.responsible_name IS NULL;

UPDATE audit_non_conformities anc
SET verified_by_name = COALESCE(anc.verified_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE anc.verified_by = u.id AND anc.verified_by_name IS NULL;

-- MRB CAMPAIGNS
UPDATE mrb_campaigns m
SET assigned_to_name = COALESCE(m.assigned_to_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE m.assigned_to = u.id AND m.assigned_to_name IS NULL;

UPDATE mrb_campaigns m
SET reported_by_name = COALESCE(m.reported_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE m.reported_by = u.id AND m.reported_by_name IS NULL;

UPDATE mrb_campaigns m
SET responded_by_name = COALESCE(m.responded_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE m.responded_by = u.id AND m.responded_by_name IS NULL;

UPDATE mrb_campaigns m
SET validated_by_name = COALESCE(m.validated_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE m.validated_by = u.id AND m.validated_by_name IS NULL;

UPDATE mrb_campaigns m
SET created_by_name = COALESCE(m.created_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE m.created_by = u.id AND m.created_by_name IS NULL;

-- MRB COMMENTS
UPDATE mrb_comments mc
SET user_name = COALESCE(mc.user_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE mc.user_id = u.id AND mc.user_name IS NULL;

-- HOSPITAL / DEFECT ENTRIES
UPDATE defect_entries_v2 d
SET captured_by_name = COALESCE(d.captured_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.captured_by_user_id = u.id AND d.captured_by_name IS NULL;

UPDATE defect_entries_v2 d
SET resolved_by_name = COALESCE(d.resolved_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.resolved_by_user_id = u.id AND d.resolved_by_name IS NULL;

UPDATE defect_entries_v2 d
SET inspector_name = COALESCE(d.inspector_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.inspector_id = u.id AND d.inspector_name IS NULL;

UPDATE defect_entries_v2 d
SET repaired_by_name = COALESCE(d.repaired_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.repaired_by = u.id AND d.repaired_by_name IS NULL;

UPDATE defect_entries_v2 d
SET released_by_name = COALESCE(d.released_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.released_by = u.id AND d.released_by_name IS NULL;

UPDATE defect_entries_v2 d
SET approved_by_name = COALESCE(d.approved_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.approved_by = u.id AND d.approved_by_name IS NULL;

UPDATE defect_entries_v2 d
SET responsible_changed_by_name = COALESCE(d.responsible_changed_by_name, u.first_name || ' ' || u.last_name)
FROM users u
WHERE d.responsible_changed_by = u.id AND d.responsible_changed_by_name IS NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audits_lead_auditor ON audits(lead_auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_ncs_responsible_name ON audit_non_conformities(responsible_id);
CREATE INDEX IF NOT EXISTS idx_mrb_assigned_to ON mrb_campaigns(assigned_to);
CREATE INDEX IF NOT EXISTS idx_mrb_reported_by ON mrb_campaigns(reported_by);
CREATE INDEX IF NOT EXISTS idx_defect_v2_captured_by ON defect_entries_v2(captured_by_user_id);
